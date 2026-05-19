import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin } from '@/lib/server/auth';
import type { ChangeLogItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, syncId } = body;

    if (!token || !syncId) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    // Get the pending batch
    const batch = db.prepare('SELECT * FROM pending_syncs WHERE syncId = ?').get(syncId) as any;
    if (!batch) {
      return NextResponse.json({ ok: false, error: 'batch_not_found' }, { status: 404 });
    }
    if (batch.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'batch_not_pending' }, { status: 400 });
    }

    const changes: ChangeLogItem[] = JSON.parse(batch.changesPayload);

    // Prepare upsert statements matching the actual DB schema
    const upsertShop = db.prepare(`
      INSERT OR REPLACE INTO shops (id, name, address, category, phone, businessHours, lng, lat, tags, isDeleted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const upsertReview = db.prepare(`
      INSERT OR REPLACE INTO reviews (id, shopId, author, rating, content, tags, avgPrice, visitDate, isDeleted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Merge in a transaction
    db.transaction(() => {
      for (const change of changes) {
        const s = change.snapshot;
        if (change.entity === 'shop') {
          upsertShop.run(
            s.id,
            s.name || '',
            s.address || '',
            s.category || '',
            s.phone || '',
            s.businessHours || '',
            s.lng ?? null,
            s.lat ?? null,
            JSON.stringify(s.tags || []),
            s.isDeleted ? 1 : 0,
            s.createdAt || new Date().toISOString(),
            s.updatedAt || new Date().toISOString()
          );
        } else if (change.entity === 'review') {
          upsertReview.run(
            s.id,
            s.shopId,
            s.author || '',
            s.rating ?? 0,
            s.content || '',
            JSON.stringify(s.tags || []),
            s.avgPrice ?? null,
            s.visitDate ?? null,
            s.isDeleted ? 1 : 0,
            s.createdAt || new Date().toISOString(),
            s.updatedAt || new Date().toISOString()
          );
        }
      }

      // Mark batch as approved
      db.prepare('UPDATE pending_syncs SET status = ? WHERE syncId = ?').run('approved', syncId);
    })();

    return NextResponse.json({ ok: true, merged: changes.length });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
