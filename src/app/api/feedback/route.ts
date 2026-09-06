import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin, extractToken, clientIp, isAuthBlocked, recordAuthFailure } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';

const MAX_NICKNAME_LEN = 50;
const MAX_CONTACT_LEN = 100;
const MAX_CONTENT_LEN = 2000;
const POST_WINDOW_MS = 60_000;
const POST_LIMIT_PER_IP = 5;

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const { allowed, retryAfterSec } = rateLimit(`feedback:${ip}`, POST_LIMIT_PER_IP, POST_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: '提交过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const body = await request.json();
    const { nickname, contact, content }: { nickname?: unknown; contact?: unknown; content?: unknown } = body;

    if (typeof nickname !== 'undefined' && nickname !== null && typeof nickname !== 'string') {
      return NextResponse.json({ ok: false, error: '昵称格式不正确' }, { status: 400 });
    }
    if (typeof contact !== 'undefined' && contact !== null && typeof contact !== 'string') {
      return NextResponse.json({ ok: false, error: '联系方式格式不正确' }, { status: 400 });
    }
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ ok: false, error: '意见内容不能为空' }, { status: 400 });
    }

    const trimmedNickname = ((nickname as string) || '').trim();
    const trimmedContact = ((contact as string) || '').trim();
    const trimmedContent = content.trim();

    if (trimmedNickname.length > MAX_NICKNAME_LEN) {
      return NextResponse.json({ ok: false, error: `昵称不能超过 ${MAX_NICKNAME_LEN} 字` }, { status: 400 });
    }
    if (trimmedContact.length > MAX_CONTACT_LEN) {
      return NextResponse.json({ ok: false, error: `联系方式不能超过 ${MAX_CONTACT_LEN} 字` }, { status: 400 });
    }
    if (trimmedContent.length > MAX_CONTENT_LEN) {
      return NextResponse.json({ ok: false, error: `意见内容不能超过 ${MAX_CONTENT_LEN} 字` }, { status: 400 });
    }

    db.prepare(
      'INSERT INTO feedbacks (nickname, contact, content, created_at) VALUES (?, ?, ?, ?)'
    ).run(trimmedNickname, trimmedContact, trimmedContent, new Date().toISOString());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback] POST error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isAuthBlocked(ip)) {
      return NextResponse.json({ ok: false, error: '尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { token, id }: { token?: string; id: number } = body;

    if (!token || !id) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const result = db.prepare('DELETE FROM feedbacks WHERE id = ?').run(id);
    if (result.changes === 0) {
      return NextResponse.json({ ok: false, error: '反馈不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback] DELETE error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isAuthBlocked(ip)) {
      return NextResponse.json({ ok: false, error: '尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
    return NextResponse.json({ ok: true, feedbacks: rows });
  } catch (error) {
    console.error('[feedback] GET error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
