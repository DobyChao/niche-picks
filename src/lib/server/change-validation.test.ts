import assert from 'node:assert/strict';
import test from 'node:test';
import { validateChanges } from './change-validation';

const shopId = '3f649a20-94a0-4601-8740-15cd93f47a56';
const reviewId = '4591bc44-daa8-400c-a402-e0b85a336d9b';

test('accepts a shop snapshot and overwrites updatedAt', () => {
  const result = validateChanges([{
    entity: 'shop',
    entityId: shopId,
    action: 'create',
    timestamp: '1999-01-01T00:00:00.000Z',
    snapshot: {
      id: shopId,
      name: '  测试店\u0000  ',
      address: '路 1 号',
      category: '咖啡',
      phone: '13800000000',
      lng: 121.47,
      lat: 31.23,
      tags: ['安静', 1, '<script>'],
      photos: ['javascript:alert(1)', 'https://example.com/a.jpg'],
      isDeleted: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2001-01-01T00:00:00.000Z',
    },
  }], '2026-10-07T00:00:00.000Z');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const snapshot = result.changes[0].snapshot;
  assert.equal(snapshot.name, '测试店');
  assert.equal(snapshot.updatedAt, '2026-10-07T00:00:00.000Z');
  assert.deepEqual(snapshot.tags, ['安静', '<script>']);
  assert.deepEqual(snapshot.photos, ['https://example.com/a.jpg']);
});

test('rejects non-uuid ids and oversized batches', () => {
  assert.equal(validateChanges([{
    entity: 'shop',
    entityId: '<script>',
    action: 'create',
    snapshot: { id: '<script>' },
  }]).ok, false);
  assert.equal(validateChanges([]).ok, false);
  assert.equal(validateChanges(new Array(101).fill({})).ok, false);
});

test('rejects a review whose rating is out of range', () => {
  const result = validateChanges([{
    entity: 'review',
    entityId: reviewId,
    action: 'create',
    snapshot: {
      id: reviewId,
      shopId,
      author: '甲',
      rating: 9,
      content: '好',
    },
  }]);
  assert.equal(result.ok, false);
});
