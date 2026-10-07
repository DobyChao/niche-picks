import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/auth';
import { cleanShortText } from '@/lib/server/change-validation';
import { consumeRate, getClientIp, json, readJsonBody, tooManyRequests } from '@/lib/server/security';

export async function POST(request: Request) {
  try {
    if (!consumeRate(`feedback:${getClientIp(request)}`, 8, 60 * 60 * 1000)) {
      return tooManyRequests();
    }

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return body.response;
    const record = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? body.value as { nickname?: unknown; contact?: unknown; content?: unknown }
      : {};

    if (typeof record.content !== 'string' || !record.content.trim()) {
      return json({ ok: false, error: '意见内容不能为空' }, 400);
    }
    if (record.content.length > 2000) {
      return json({ ok: false, error: '意见内容过长' }, 400);
    }

    db.prepare(
      'INSERT INTO feedbacks (nickname, contact, content, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      cleanShortText(record.nickname, 40),
      cleanShortText(record.contact, 80),
      cleanShortText(record.content, 2000, true),
      new Date().toISOString(),
    );

    return json({ ok: true });
  } catch (error) {
    console.error('[feedback] POST error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    const rawId = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? (body.value as { id?: unknown }).id
      : undefined;
    const id = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return json({ ok: false, error: '缺少参数' }, 400);
    }

    const result = db.prepare('DELETE FROM feedbacks WHERE id = ?').run(id);
    if (result.changes === 0) {
      return json({ ok: false, error: '反馈不存在' }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('[feedback] DELETE error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}

export async function GET(request: Request) {
  try {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const rows = db.prepare('SELECT id, nickname, contact, content, created_at FROM feedbacks ORDER BY created_at DESC').all();
    return json({ ok: true, feedbacks: rows });
  } catch (error) {
    console.error('[feedback] GET error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}
