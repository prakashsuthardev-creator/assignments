import Stripe from 'stripe';
import { getTask2Client } from './dbClient.js';
import legacyBillingFixtures from './fixtures/legacy_billing.json' with { type: 'json' };
import partnerXFixtures from './fixtures/partner_x.json' with { type: 'json' };

interface Transaction {
  id: string;
  source: string;
  source_id: string;
  source_status: string;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  raw: Record<string, unknown>;
}

interface IngestResult {
  success: boolean;
  recordsSaved: number;
  message: string;
}

export async function ingestAllSources(): Promise<IngestResult> {
  try {
    const transactions: Transaction[] = [];

    // Pull Stripe test-mode data
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return {
        success: false,
        recordsSaved: 0,
        message: 'STRIPE_SECRET_KEY not configured',
      };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });

    // Use Charges only — each successful payment creates both a Charge and a
    // PaymentIntent in Stripe; ingesting both double-counts revenue.
    const charges = await stripe.charges.list({ limit: 50 });
    for (const charge of charges.data) {
      let status = charge.status; // 'succeeded', 'pending', 'failed'
      if (charge.refunded || (charge.amount_refunded && charge.amount_refunded > 0)) {
        status = 'refunded';
      }

      transactions.push({
        id: `stripe:charge_${charge.id}`,
        source: 'stripe',
        source_id: `charge_${charge.id}`,
        source_status: status,
        amount_cents: charge.amount,
        currency: charge.currency,
        occurred_at: new Date(charge.created * 1000).toISOString(),
        raw: charge as unknown as Record<string, unknown>,
      });
    }

    // Load legacy_billing fixtures
    for (const item of legacyBillingFixtures) {
      transactions.push({
        id: `legacy_billing:${item.id}`,
        source: 'legacy_billing',
        source_id: item.id,
        source_status: item.status,
        amount_cents: item.amount_cents,
        currency: item.currency,
        occurred_at: item.created_at,
        raw: item as unknown as Record<string, unknown>,
      });
    }

    // Load partner_x fixtures
    for (const item of partnerXFixtures) {
      transactions.push({
        id: `partner_x:${item.transaction_id}`,
        source: 'partner_x',
        source_id: item.transaction_id,
        source_status: item.status,
        amount_cents: item.amount_cents,
        currency: item.currency,
        occurred_at: item.timestamp,
        raw: item as unknown as Record<string, unknown>,
      });
    }

    const prisma = await getTask2Client();

    // Remove legacy PaymentIntent rows from earlier syncs (same payment as a Charge).
    await (prisma as any).task2Transaction.deleteMany({
      where: {
        source: 'stripe',
        sourceId: { startsWith: 'pi_' },
      },
    });

    let savedCount = 0;

    for (const txn of transactions) {
      try {
        await (prisma as any).task2Transaction.upsert({
          where: {
            source_sourceId: {
              source: txn.source,
              sourceId: txn.source_id,
            },
          },
          update: {
            sourceStatus: txn.source_status,
            amountCents: BigInt(txn.amount_cents),
            currency: txn.currency,
            occurredAt: new Date(txn.occurred_at),
            raw: txn.raw,
            syncedAt: new Date(),
          },
          create: {
            id: txn.id,
            source: txn.source,
            sourceId: txn.source_id,
            sourceStatus: txn.source_status,
            amountCents: BigInt(txn.amount_cents),
            currency: txn.currency,
            occurredAt: new Date(txn.occurred_at),
            raw: txn.raw,
          },
        });
        savedCount++;
      } catch (err) {
        console.error(`Failed to upsert transaction ${txn.id}:`, err);
      }
    }

    return {
      success: true,
      recordsSaved: savedCount,
      message: `Ingested ${savedCount} transactions from Stripe + fixtures`,
    };
  } catch (err) {
    return {
      success: false,
      recordsSaved: 0,
      message: err instanceof Error ? err.message : 'Unknown error during ingestion',
    };
  }
}
