import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShopInfoHtml } from './shop-info-html';
import type { MergedShop } from './types/index';

function shop(overrides: Partial<MergedShop> = {}): MergedShop {
  return {
    id: '3f649a20-94a0-4601-8740-15cd93f47a56',
    name: '普通店',
    address: '某路 1 号',
    category: '咖啡',
    phone: '13800000000',
    businessHours: '09:00-18:00',
    lng: 121.5,
    lat: 31.2,
    tags: ['安静'],
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _syncBadge: 'synced',
    _syncId: null,
    reviewCount: 0,
    ...overrides,
  };
}

test('shop info html escapes markup in user fields', () => {
  const html = buildShopInfoHtml(shop({
    name: '<img src=x onerror=alert(1)>',
    address: '"><script>alert(1)</script>',
    category: '<b>x</b>',
    phone: '1<img>',
    tags: ['<i>tag</i>'],
  }));
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<b>'), false);
  assert.equal(html.includes('<i>'), false);
  assert.match(html, /&lt;img/);
});

test('shop id is not interpolated into javascript', () => {
  const html = buildShopInfoHtml(shop({
    id: "');alert(1);//",
  }));
  assert.doesNotMatch(html, /onclick="[^"]*alert/);
  assert.match(html, /data-shop-id="&#39;\);alert\(1\);\/\//);
  assert.match(html, /getAttribute\('data-shop-id'\)/);
});
