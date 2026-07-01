'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMergedShops } from '@/lib/db';
import ShopCard from './ShopCard';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import type { MergedShop } from '@/lib/types';
import { getCategoryColor } from '@/lib/utils';
import { cn } from '@/lib/cn';
import {
  type ShopSort,
  type ShopListFilters,
  type SortAnchor,
  DEFAULT_FILTERS,
  SORT_LABELS,
  loadShopListPrefs,
  saveShopListPrefs,
  countActiveFilters,
  extractCategories,
  applyShopListQuery,
} from '@/lib/shop-list-prefs';

function ActiveFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs bg-primary-muted/60 text-primary border border-primary/20">
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20"
        aria-label={`清除 ${label}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

interface ShopListProps {
  onShopClick?: (shop: MergedShop) => void;
  selectedShopId?: string | null;
  sortAnchor: SortAnchor | null;
}

const SYNC_FILTER_OPTIONS: { value: ShopListFilters['syncBadge']; label: string }[] = [
  { value: null, label: '全部状态' },
  { value: 'draft', label: '未提交' },
  { value: 'pending', label: '同步中' },
  { value: 'synced', label: '已同步' },
];

const REVIEW_FILTER_OPTIONS: { value: ShopListFilters['hasReviews']; label: string }[] = [
  { value: null, label: '全部点评' },
  { value: 'has', label: '有点评' },
  { value: 'none', label: '无点评' },
];

export default function ShopList({
  onShopClick,
  selectedShopId,
  sortAnchor,
}: ShopListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<ShopSort>('updated');
  const [filters, setFilters] = useState<ShopListFilters>(DEFAULT_FILTERS);
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const shops = useMergedShops();

  // localStorage isn't available during SSR, so prefs must be loaded after mount to
  // avoid a hydration mismatch (server always renders the defaults). This is a
  // synchronization-with-an-external-system effect, not derived state, so the
  // setState-in-effect lint rule doesn't apply cleanly here.
  useEffect(() => {
    const prefs = loadShopListPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSort(prefs.sort);
    setFilters(prefs.filters);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    saveShopListPrefs(sort, filters);
  }, [sort, filters, prefsLoaded]);

  // Auto-open the sort popover whenever we land on "distance" sort without an anchor
  // (e.g. on mount from a saved pref, or the anchor gets cleared while it's active).
  // Adjusted during render (React's "adjusting state when a prop changes" pattern)
  // instead of an effect, since this is derived from sort/sortAnchor, not an
  // external-system sync.
  const anchorPromptKey = `${sort}:${sortAnchor ? '1' : '0'}`;
  const [lastAnchorPromptKey, setLastAnchorPromptKey] = useState(anchorPromptKey);
  if (anchorPromptKey !== lastAnchorPromptKey) {
    setLastAnchorPromptKey(anchorPromptKey);
    if (sort === 'distance' && !sortAnchor) {
      setShowSortPicker(true);
    }
  }

  const categories = useMemo(() => extractCategories(shops ?? []), [shops]);

  const displayItems = useMemo(() => {
    if (!shops) return undefined;
    return applyShopListQuery(shops, searchQuery, sort, filters, sortAnchor);
  }, [shops, searchQuery, sort, filters, sortAnchor]);

  const activeFilterCount = countActiveFilters(filters);
  const hasActiveQuery = !!searchQuery.trim() || activeFilterCount > 0 || sort !== 'updated';

  const updateFilters = useCallback((patch: Partial<ShopListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setSort('updated');
    setFilters(DEFAULT_FILTERS);
    setShowExtraFilters(false);
    setShowSortPicker(false);
  }, []);

  const handleSortChange = (next: ShopSort) => {
    setSort(next);
    if (next === 'distance' && !sortAnchor) {
      setShowSortPicker(true);
    }
  };

  const chipClass = (active: boolean) =>
    cn(
      'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
      active
        ? 'bg-primary text-white border-primary'
        : 'bg-background text-muted border-border hover:border-primary/40 hover:text-foreground',
    );

  return (
    <>
      <div className="sticky top-0 z-10 bg-surface border-b border-border">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索店铺名称、分类或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-border rounded-[var(--radius-button)] text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                         placeholder:text-muted/70 bg-background text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label="清除搜索"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort toggle button → opens sort popover */}
          <button
            type="button"
            onClick={() => { setShowSortPicker((v) => !v); setShowExtraFilters(false); }}
            className={cn(
              'shrink-0 w-10 h-10 flex items-center justify-center border rounded-[var(--radius-button)] transition-colors relative',
              sort !== 'updated' || showSortPicker
                ? 'border-primary/40 bg-primary-muted/50 text-primary'
                : 'border-border text-muted hover:text-foreground',
            )}
            aria-label="排序"
            title={SORT_LABELS[sort]}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>

          {/* Filter toggle button → opens filter popover (incl. categories) */}
          <button
            type="button"
            onClick={() => { setShowExtraFilters((v) => !v); setShowSortPicker(false); }}
            className={cn(
              'shrink-0 w-10 h-10 flex items-center justify-center border rounded-[var(--radius-button)] transition-colors relative',
              showExtraFilters || activeFilterCount > 0
                ? 'border-primary/40 bg-primary-muted/50 text-primary'
                : 'border-border text-muted hover:text-foreground',
            )}
            aria-label="筛选"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 3v-4.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter summary chips (compact, wraps) */}
        {(filters.category || filters.syncBadge || filters.hasReviews || sortAnchor) && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {filters.category && (
              <ActiveFilterChip label={`分类：${filters.category}`} onClear={() => updateFilters({ category: null })} />
            )}
            {filters.syncBadge && (
              <ActiveFilterChip label={SYNC_FILTER_OPTIONS.find((o) => o.value === filters.syncBadge)?.label ?? '状态'} onClear={() => updateFilters({ syncBadge: null })} />
            )}
            {filters.hasReviews && (
              <ActiveFilterChip label={REVIEW_FILTER_OPTIONS.find((o) => o.value === filters.hasReviews)?.label ?? '点评'} onClear={() => updateFilters({ hasReviews: null })} />
            )}
            {sortAnchor && sort === 'distance' && (
              <Badge variant="primary" className="truncate max-w-[160px]">锚点：{sortAnchor.label}</Badge>
            )}
          </div>
        )}

        {/* Sort popover */}
        {showSortPicker && (
          <div className="px-4 pb-2 border-t border-border/60 pt-2">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SORT_LABELS) as ShopSort[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSortChange(key)}
                  className={chipClass(sort === key)}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
            {sort === 'distance' && (
              <div className="mt-2 text-xs">
                {sortAnchor ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted shrink-0">距离锚点</span>
                    <Badge variant="primary" className="truncate max-w-[140px]">{sortAnchor.label}</Badge>
                    <span className="text-muted/70 tabular-nums">
                      {sortAnchor.lng.toFixed(4)}, {sortAnchor.lat.toFixed(4)}
                    </span>
                    <span className="text-muted/70">在地图右下角按钮可修改</span>
                  </div>
                ) : (
                  <p className="text-muted">
                    距离排序需要先设置锚点 — 点击地图右下角的
                    <span className="inline-flex items-center px-1 text-primary">⚑</span>
                    按钮设置
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter popover */}
        {showExtraFilters && (
          <div className="px-4 pb-2 space-y-2 border-t border-border/60 pt-2">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateFilters({ category: null })}
                  className={chipClass(!filters.category)}
                >
                  全部分类
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateFilters({ category: filters.category === cat ? null : cat })}
                    className={chipClass(filters.category === cat)}
                    style={filters.category === cat ? undefined : { borderColor: `${getCategoryColor(cat)}55` }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SYNC_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => updateFilters({ syncBadge: opt.value })}
                  className={chipClass(filters.syncBadge === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => updateFilters({ hasReviews: opt.value })}
                  className={chipClass(filters.hasReviews === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {sort === 'distance' && !showSortPicker && !sortAnchor && (
          <div className="px-4 pb-2 border-t border-border/60 pt-2 flex items-center text-xs text-muted">
            距离排序需要先在地图右下角设置锚点
          </div>
        )}

        {displayItems && (
          <div className="px-4 pb-3 pt-1 flex items-center justify-between text-xs text-muted border-t border-border/60">
            <span>共 {displayItems.length} 家{hasActiveQuery ? '（已筛选）' : ''}</span>
            {hasActiveQuery && (
              <button type="button" onClick={clearAll} className="text-primary hover:underline">
                重置
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3">
        {shops === undefined || displayItems === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-muted text-sm">加载中...</span>
          </div>
        ) : displayItems.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
            title={shops.length === 0 ? '还没有店铺' : '没有匹配的店铺'}
            description={shops.length === 0 ? '点击添加按钮创建第一个店铺吧' : '试试调整搜索或筛选条件'}
            action={hasActiveQuery ? (
              <button type="button" onClick={clearAll} className="text-sm text-primary hover:underline">
                清除筛选
              </button>
            ) : undefined}
          />
        ) : (
          displayItems.map(({ shop, distanceMeters }) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              selected={selectedShopId === shop.id}
              distanceMeters={sort === 'distance' && sortAnchor ? distanceMeters : null}
              onClick={onShopClick ? () => onShopClick(shop) : undefined}
            />
          ))
        )}
      </div>
    </>
  );
}
