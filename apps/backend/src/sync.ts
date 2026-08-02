import { syncStore } from './persistence.js';
import type { CursorState, NormalizedRecord, SyncResult, SyncStore } from './types.js';

const providers = ['HubSpot', 'Stripe', 'Google Calendar'] as const;

type ProviderItem = Record<string, unknown>;

interface ProviderSyncResponse {
  mode: 'incremental' | 'full';
  items: ProviderItem[];
}

/* ─── Standardized Normalization Function ───
 * All sources (HubSpot, Stripe, Google Calendar) map into this SINGLE normalized entity.
 */
function buildNormalizedRecord(provider: string, item: ProviderItem): NormalizedRecord {
  const sourceId = String(item.sourceId ?? `${provider}-item`);
  const normalizedAmount = typeof item.amount === 'number' ? item.amount : null;

  return {
    id: `${provider}:${sourceId}`,
    source: provider,
    sourceId,
    name: typeof item.name === 'string' ? item.name : null,
    email: typeof item.email === 'string' ? item.email : null,
    phone: typeof item.phone === 'string' ? item.phone : null,
    eventDate: typeof item.eventDate === 'string' ? item.eventDate : null,
    amount: normalizedAmount,
    status: typeof item.status === 'string' ? item.status : 'active',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    rawData: item,
  };
}

/* ─── 1. HubSpot Integration ─── */
async function fetchHubSpotItems(mode: 'incremental' | 'full', cursor?: CursorState): Promise<ProviderSyncResponse> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error('HUBSPOT_API_KEY is not configured');
  }

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,email,phone&limit=50', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HubSpot API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      properties?: {
        firstname?: string;
        lastname?: string;
        email?: string;
        phone?: string;
        createdate?: string;
        lastmodifieddate?: string;
      };
      createdAt?: string;
      updatedAt?: string;
      archived?: boolean;
    }>;
  };

  const rawResults = data.results ?? [];
  let filtered = rawResults;

  if (mode === 'incremental' && cursor) {
    filtered = rawResults.filter((contact) => {
      const updated = contact.updatedAt ? new Date(contact.updatedAt).getTime() : 0;
      return updated > cursor.updatedAt;
    });
  }

  const items: ProviderItem[] = filtered.map((contact) => {
    const props = contact.properties ?? {};
    const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'HubSpot Contact';
    return {
      sourceId: contact.id,
      name,
      email: props.email ?? null,
      phone: props.phone ?? null,
      eventDate: props.createdate ?? contact.createdAt ?? null,
      amount: null,
      status: contact.archived ? 'archived' : 'active',
      updatedAt: contact.updatedAt ?? new Date().toISOString(),
      raw: contact,
    };
  });

  return { mode, items };
}

/* ─── 2. Stripe Integration ─── */
async function fetchStripeItems(mode: 'incremental' | 'full', cursor?: CursorState): Promise<ProviderSyncResponse> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
  const items: ProviderItem[] = [];

  // Fetch Customers
  const custRes = await fetch('https://api.stripe.com/v1/customers?limit=25', {
    headers: { Authorization: authHeader },
  });

  if (custRes.ok) {
    const custData = (await custRes.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        email?: string;
        phone?: string;
        created?: number;
      }>;
    };

    for (const c of custData.data ?? []) {
      const createdMs = (c.created ?? 0) * 1000;
      if (mode === 'incremental' && cursor && createdMs <= cursor.updatedAt) {
        continue;
      }
      items.push({
        sourceId: c.id,
        name: c.name ?? 'Stripe Customer',
        email: c.email ?? null,
        phone: c.phone ?? null,
        eventDate: c.created ? new Date(c.created * 1000).toISOString() : null,
        amount: null,
        status: 'active',
        updatedAt: c.created ? new Date(c.created * 1000).toISOString() : new Date().toISOString(),
        raw: c,
      });
    }
  }

  // Fetch PaymentIntents
  const piRes = await fetch('https://api.stripe.com/v1/payment_intents?limit=25', {
    headers: { Authorization: authHeader },
  });

  if (piRes.ok) {
    const piData = (await piRes.json()) as {
      data?: Array<{
        id: string;
        amount?: number;
        currency?: string;
        status?: string;
        created?: number;
        description?: string;
        receipt_email?: string;
      }>;
    };

    for (const pi of piData.data ?? []) {
      const createdMs = (pi.created ?? 0) * 1000;
      if (mode === 'incremental' && cursor && createdMs <= cursor.updatedAt) {
        continue;
      }
      items.push({
        sourceId: pi.id,
        name: pi.description ?? `Payment (${pi.currency?.toUpperCase() ?? 'USD'})`,
        email: pi.receipt_email ?? null,
        phone: null,
        eventDate: pi.created ? new Date(pi.created * 1000).toISOString() : null,
        amount: typeof pi.amount === 'number' ? pi.amount / 100 : null,
        status: pi.status ?? 'paid',
        updatedAt: pi.created ? new Date(pi.created * 1000).toISOString() : new Date().toISOString(),
        raw: pi,
      });
    }
  }

  return { mode, items };
}

/* ─── 3. Google Calendar Integration ─── */
async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SECERET_KEY || process.env.GOOGLE_SECRET_KEY;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials are missing from environment');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('No access_token returned by Google OAuth');
  }

  return data.access_token;
}

async function fetchGoogleCalendarItems(mode: 'incremental' | 'full', cursor?: CursorState): Promise<ProviderSyncResponse> {
  const accessToken = await getGoogleAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=50`;
  if (mode === 'incremental' && cursor) {
    url += `&updatedMin=${encodeURIComponent(new Date(cursor.updatedAt).toISOString())}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
      updated?: string;
      creator?: { email?: string };
      organizer?: { email?: string };
    }>;
  };

  const rawItems = data.items ?? [];
  const items: ProviderItem[] = rawItems.map((event) => ({
    sourceId: event.id,
    name: event.summary ?? 'Google Calendar Event',
    email: event.organizer?.email ?? event.creator?.email ?? null,
    phone: null,
    eventDate: event.start?.dateTime ?? event.start?.date ?? null,
    amount: 0,
    status: event.status ?? 'scheduled',
    updatedAt: event.updated ?? new Date().toISOString(),
    raw: event,
  }));

  return { mode, items };
}

/* ─── Dispatcher & Fallback Handler ───
 * If incremental sync fails (stale cursor, 410, API error), fall back to FULL backfill instead of crashing or losing data.
 */
async function fetchProviderItemsByMode(provider: string, mode: 'incremental' | 'full', cursor?: CursorState): Promise<ProviderSyncResponse> {
  switch (provider) {
    case 'HubSpot':
      return fetchHubSpotItems(mode, cursor);
    case 'Stripe':
      return fetchStripeItems(mode, cursor);
    case 'Google Calendar':
      return fetchGoogleCalendarItems(mode, cursor);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function fetchProviderItems(provider: string, cursor?: CursorState): Promise<ProviderSyncResponse> {
  const CURSOR_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const cursorIsFresh = Boolean(cursor && Date.now() - cursor.updatedAt < CURSOR_TTL_MS);

  if (cursorIsFresh && cursor) {
    try {
      return await fetchProviderItemsByMode(provider, 'incremental', cursor);
    } catch (error) {
      console.warn(`[${provider}] Incremental sync failed (${error instanceof Error ? error.message : error}). Falling back to full sync.`);
      return await fetchProviderItemsByMode(provider, 'full');
    }
  }

  return await fetchProviderItemsByMode(provider, 'full');
}

/* ─── Idempotent Persistence ─── */
async function persistProviderItems(store: SyncStore, provider: string, items: ProviderItem[]): Promise<number> {
  let saved = 0;

  for (const item of items) {
    await store.upsertRecord(buildNormalizedRecord(provider, item));
    saved += 1;
  }

  return saved;
}

/* ─── Provider Sync Execution with Isolated Failures ─── */
async function syncProvider(store: SyncStore, provider: string): Promise<SyncResult> {
  const cursor = await store.getCursor(provider);

  try {
    const response = await fetchProviderItems(provider, cursor);
    const saved = await persistProviderItems(store, provider, response.items);

    const cursorValue = typeof response.items[0]?.sourceId === 'string'
      ? String(response.items[0].sourceId)
      : `${provider.toLowerCase()}-cursor-${Date.now()}`;

    // Update cursor only AFTER successful write
    await store.setCursor(provider, cursorValue, Date.now());

    console.log(`[${provider}] ${response.mode} sync completed: Saved ${saved} records`);

    return {
      provider,
      status: 'success',
      recordsSaved: saved,
      message: `${provider} ${response.mode} sync completed (${saved} records)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${provider}] Sync failed:`, message);

    return {
      provider,
      status: 'failure',
      recordsSaved: 0,
      message,
    };
  }
}

/* ─── Main Pipeline Entrypoint ─── */
export async function runSync(store: SyncStore = syncStore): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const provider of providers) {
    const result = await syncProvider(store, provider);
    results.push(result);
  }

  return results;
}
