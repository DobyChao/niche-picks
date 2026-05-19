'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from '@/lib/db';
import { getActiveShops } from '@/lib/db';
import ShopCard from './ShopCard';
import type { LocalShop } from '@/lib/types';

export default function ShopList() {
  const [searchQuery, setSearchQuery] = useState('');
  const shops = useLiveQuery(() => getActiveShops());

  const filteredShops = useMemo(() => {
    if (!shops) return [];
    if (!searchQuery.trim()) return shops;

    const query = searchQuery.trim().toLowerCase();
    return shops.filter(
      (shop: LocalShop) =>
        shop.name.toLowerCase().includes(query) ||
        (shop.category && shop.category.toLowerCase().includes(query)) ||
        (shop.tags &&
          shop.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }, [shops, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="sticky top-0 z-10 bg-white pb-3 border-b border-gray-100">
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
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {shops === undefined ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3 text-gray-500 text-sm">加载中...</span>
          </div>
        ) : filteredShops.length === 0 ? (
          // Empty state
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
          // Shop cards
          filteredShops.map((shop: LocalShop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))
        )}
      </div>

      {/* Footer count */}
      {shops && shops.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-1 py-2 text-center">
          <span className="text-xs text-gray-400">
            共 {filteredShops.length} 家店铺
            {searchQuery && shops.length !== filteredShops.length && (
              <span> (总计 {shops.length})</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
