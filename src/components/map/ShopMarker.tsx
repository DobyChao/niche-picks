'use client';

import type { MergedShop } from '@/lib/types';

export function createMarkerConfig(shop: MergedShop) {
  return {
    id: shop.id,
    position: {
      lng: shop.lng ?? 0,
      lat: shop.lat ?? 0,
    },
    title: shop.name,
    label: shop.name,
    category: shop.category ?? '',
    address: shop.address ?? '',
    tags: shop.tags ?? [],
  };
}

export function createMarkerConfigs(shops: MergedShop[]) {
  return shops
    .filter((shop) => typeof shop.lng === 'number' && typeof shop.lat === 'number')
    .map(createMarkerConfig);
}

export default function ShopMarker() {
  return null;
}
