'use client';

import type { LocalShop } from '@/lib/types';

/**
 * Creates a marker configuration object from a LocalShop.
 * Used by MapView to place markers on the map.
 */
export function createMarkerConfig(shop: LocalShop) {
  return {
    id: shop.id,
    position: {
      lng: shop.lng ?? 0,
      lat: shop.lat ?? 0,
    },
    title: shop.name,
    label: shop.name,
    // Additional metadata for info windows
    category: shop.category ?? '',
    address: shop.address ?? '',
    tags: shop.tags ?? [],
  };
}

/**
 * Creates an array of marker configs from an array of shops,
 * filtering out shops without valid coordinates.
 */
export function createMarkerConfigs(shops: LocalShop[]) {
  return shops
    .filter((shop) => typeof shop.lng === 'number' && typeof shop.lat === 'number')
    .map(createMarkerConfig);
}

/**
 * ShopMarker is a logical wrapper component — it renders nothing visible.
 * Marker rendering is handled by MapView using the createMarkerConfig helpers.
 */
export default function ShopMarker() {
  return null;
}
