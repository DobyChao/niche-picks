import type { MergedShop, SyncBadge } from '@/lib/types';
import { haversineDistance } from '@/lib/geo';

export type ShopSort = 'updated' | 'created' | 'name' | 'rating' | 'distance';
export type AnchorSource = 'location' | 'map_center' | 'shop' | 'manual';
export type SyncBadgeFilter = SyncBadge | null;
export type ReviewFilter = 'has' | 'none' | null;

export interface SortAnchor {
  source: AnchorSource;
  lng: number;
  lat: number;
  label: string;
  shopId?: string;
  updatedAt: string;
}

export interface ShopListFilters {
  category: string | null;
  syncBadge: SyncBadgeFilter;
  hasReviews: ReviewFilter;
}

export interface ShopListDisplayItem {
  shop: MergedShop;
  distanceMeters: number | null;
}

const PREFS_KEY = 'shop_list_prefs';
const ANCHOR_KEY = 'shop_list_anchor';

export const DEFAULT_FILTERS: ShopListFilters = {
  category: null,
  syncBadge: null,
  hasReviews: null,
};

export const SORT_LABELS: Record<ShopSort, string> = {
  updated: '最近更新',
  created: '最近添加',
  name: '名称 A-Z',
  rating: '评分从高到低',
  distance: '距离从近到远',
};

export function loadShopListPrefs(): { sort: ShopSort; filters: ShopListFilters } {
  if (typeof window === 'undefined') {
    return { sort: 'updated', filters: DEFAULT_FILTERS };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { sort: 'updated', filters: DEFAULT_FILTERS };
    const parsed = JSON.parse(raw);
    return {
      sort: isShopSort(parsed.sort) ? parsed.sort : 'updated',
      filters: {
        category: typeof parsed.filters?.category === 'string' ? parsed.filters.category : null,
        syncBadge: isSyncBadgeFilter(parsed.filters?.syncBadge) ? parsed.filters.syncBadge : null,
        hasReviews: parsed.filters?.hasReviews === 'has' || parsed.filters?.hasReviews === 'none'
          ? parsed.filters.hasReviews
          : null,
      },
    };
  } catch {
    return { sort: 'updated', filters: DEFAULT_FILTERS };
  }
}

export function saveShopListPrefs(sort: ShopSort, filters: ShopListFilters) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sort, filters }));
  } catch { /* ignore */ }
}

export function loadSortAnchor(): SortAnchor | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lng !== 'number' || typeof parsed.lat !== 'number') return null;
    if (!parsed.label || !parsed.source || !parsed.updatedAt) return null;
    return parsed as SortAnchor;
  } catch {
    return null;
  }
}

export function saveSortAnchor(anchor: SortAnchor | null) {
  try {
    if (anchor) {
      localStorage.setItem(ANCHOR_KEY, JSON.stringify(anchor));
    } else {
      localStorage.removeItem(ANCHOR_KEY);
    }
  } catch { /* ignore */ }
}

export function createAnchor(
  source: AnchorSource,
  lng: number,
  lat: number,
  label: string,
  shopId?: string,
): SortAnchor {
  return { source, lng, lat, label, shopId, updatedAt: new Date().toISOString() };
}

export function countActiveFilters(filters: ShopListFilters): number {
  let n = 0;
  if (filters.category) n++;
  if (filters.syncBadge) n++;
  if (filters.hasReviews) n++;
  return n;
}

export function extractCategories(shops: MergedShop[]): string[] {
  const set = new Set<string>();
  for (const s of shops) {
    if (s.category?.trim()) set.add(s.category.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function isShopSort(v: unknown): v is ShopSort {
  return v === 'updated' || v === 'created' || v === 'name' || v === 'rating' || v === 'distance';
}

function isSyncBadgeFilter(v: unknown): v is SyncBadge {
  return v === 'synced' || v === 'draft' || v === 'pending';
}

function matchesSearch(shop: MergedShop, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    shop.name.toLowerCase().includes(q) ||
    (shop.category && shop.category.toLowerCase().includes(q)) ||
    (shop.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false)
  );
}

function matchesFilters(shop: MergedShop, filters: ShopListFilters): boolean {
  if (filters.category && shop.category !== filters.category) return false;
  if (filters.syncBadge && shop._syncBadge !== filters.syncBadge) return false;
  if (filters.hasReviews === 'has' && shop.reviewCount === 0) return false;
  if (filters.hasReviews === 'none' && shop.reviewCount > 0) return false;
  return true;
}

function shopDistance(shop: MergedShop, anchor: SortAnchor | null): number | null {
  if (!anchor) return null;
  if (typeof shop.lng !== 'number' || typeof shop.lat !== 'number') return null;
  return haversineDistance(anchor.lng, anchor.lat, shop.lng, shop.lat);
}

export function applyShopListQuery(
  shops: MergedShop[],
  searchQuery: string,
  sort: ShopSort,
  filters: ShopListFilters,
  anchor: SortAnchor | null,
): ShopListDisplayItem[] {
  const filtered = shops.filter(
    (shop) => !shop.isDeleted && matchesSearch(shop, searchQuery) && matchesFilters(shop, filters),
  );

  const withDistance = filtered.map((shop) => ({
    shop,
    distanceMeters: shopDistance(shop, anchor),
  }));

  const sorted = [...withDistance];

  switch (sort) {
    case 'name':
      sorted.sort((a, b) => a.shop.name.localeCompare(b.shop.name, 'zh-CN'));
      break;
    case 'rating':
      sorted.sort((a, b) => {
        const ar = a.shop.reviewCount > 0 ? (a.shop.avgRating ?? 0) : -1;
        const br = b.shop.reviewCount > 0 ? (b.shop.avgRating ?? 0) : -1;
        if (br !== ar) return br - ar;
        return b.shop.reviewCount - a.shop.reviewCount;
      });
      break;
    case 'created':
      sorted.sort((a, b) => b.shop.createdAt.localeCompare(a.shop.createdAt));
      break;
    case 'distance':
      sorted.sort((a, b) => {
        const ad = a.distanceMeters;
        const bd = b.distanceMeters;
        if (ad == null && bd == null) return a.shop.name.localeCompare(b.shop.name, 'zh-CN');
        if (ad == null) return 1;
        if (bd == null) return -1;
        return ad - bd;
      });
      break;
    case 'updated':
    default:
      sorted.sort((a, b) => b.shop.updatedAt.localeCompare(a.shop.updatedAt));
      break;
  }

  return sorted;
}
