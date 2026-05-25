'use client';

import { useState, useMemo } from 'react';
import { useMergedShops } from '@/lib/db';
import ShopCard from './ShopCard';
import type { MergedShop } from '@/lib/types';

interface ShopListProps {
  onShopClick?: (shop: MergedShop) => void;
}

export default function ShopList({ onShopClick }: ShopListProps) {
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
        (shop.tags &&
          shop.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }, [shops, searchQuery]);

  return (
    <>
      {/* Search Input — sticky so it stays visible while scrolling */}
      <div className="sticky top-0 z-10 bg-white px-4 pb-3 pt-2 border-b border-gray-100">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400 bg-gray-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Shop List */}
      <div className="px-4 pb-4 space-y-3">
        {shops === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3 text-gray-500 text-sm">加载中...</span>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg
              className="w-16 h-16 mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-sm font-medium text-gray-500">
              {searchQuery ? '没有找到匹配的店铺' : '还没有店铺'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery
                ? '试试其他关键词'
                : '点击添加按钮创建第一个店铺吧'}
            </p>
          </div>
        ) : (
          filteredShops.map((shop: MergedShop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              onClick={onShopClick ? () => onShopClick(shop) : undefined}
            />
          ))
        )}
      </div>
    </>
  );
}
