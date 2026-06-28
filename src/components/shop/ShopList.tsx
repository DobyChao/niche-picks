'use client';

import { useState, useMemo } from 'react';
import { useMergedShops } from '@/lib/db';
import ShopCard from './ShopCard';
import EmptyState from '@/components/ui/EmptyState';
import type { MergedShop } from '@/lib/types';

interface ShopListProps {
  onShopClick?: (shop: MergedShop) => void;
  selectedShopId?: string | null;
}

export default function ShopList({ onShopClick, selectedShopId }: ShopListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const shops = useMergedShops();

  const filteredShops = useMemo(() => {
    if (!shops) return [];
    if (!searchQuery.trim()) return shops;

    const query = searchQuery.trim().toLowerCase();
    return shops.filter(
      (shop: MergedShop) =>
        shop.name.toLowerCase().includes(query) ||
        (shop.category && shop.category.toLowerCase().includes(query)) ||
        (shop.tags && shop.tags.some((tag) => tag.toLowerCase().includes(query))),
    );
  }, [shops, searchQuery]);

  return (
    <>
      <div className="sticky top-0 z-10 bg-surface px-4 pb-3 pt-2 border-b border-border">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="搜索店铺名称、分类或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-[var(--radius-button)] text-sm
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
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3">
        {shops === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-muted text-sm">加载中...</span>
          </div>
        ) : filteredShops.length === 0 ? (
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
            title={searchQuery ? '没有找到匹配的店铺' : '还没有店铺'}
            description={searchQuery ? '试试其他关键词' : '点击添加按钮创建第一个店铺吧'}
          />
        ) : (
          filteredShops.map((shop: MergedShop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              selected={selectedShopId === shop.id}
              onClick={onShopClick ? () => onShopClick(shop) : undefined}
            />
          ))
        )}
      </div>
    </>
  );
}
