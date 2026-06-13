import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname, contact, content }: { nickname?: string; contact?: string; content: string } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ ok: false, error: '意见内容不能为空' }, { status: 400 });
    }

    db.prepare(
      'INSERT INTO feedbacks (nickname, contact, content, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      (nickname || '').trim(),
      (contact || '').trim(),
      content.trim(),
      new Date().toISOString()
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback] POST error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, id }: { token: string; id: number } = body;

    if (!token || !id) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
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
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
    return NextResponse.json({ ok: true, feedbacks: rows });
  } catch (error) {
    console.error('[feedback] GET error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
