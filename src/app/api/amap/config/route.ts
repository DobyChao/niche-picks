import { NextResponse } from 'next/server';

export async function GET() {
  const securityJsCode = process.env.AMAP_SECURITY_CODE || '';
  return NextResponse.json({ securityJsCode });
}
