'use client';

import type { MergedShop, SyncBadge } from '@/lib/types';
import { getCategoryColor } from '@/lib/utils';

interface ShopCardProps {
  shop: MergedShop;
  onClick?: () => void;
}

function getSyncBadge(badge: SyncBadge) {
  switch (badge) {
    case 'draft':
      return { emoji: '🟢', label: '未提交', color: 'bg-yellow-100 text-yellow-700' };
    case 'pending':
      return { emoji: '🟡', label: '同步中', color: 'bg-orange-100 text-orange-700' };
    case 'synced':
      return { emoji: '🔵', label: '已同步', color: 'bg-green-100 text-green-700' };
  }
}

export default function ShopCard({ shop, onClick }: ShopCardProps) {
  const syncBadge = getSyncBadge(shop._syncBadge);
  const catColor = getCategoryColor(shop.category);

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer p-4 border border-gray-100"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header: Name + Category Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
          {shop.name}
        </h3>
        {shop.category && (
          <span
            className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: catColor }}
          >
            {shop.category}
          </span>
        )}
      </div>

      {/* Rating row */}
      {shop.reviewCount > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <span className="text-amber-500">
            {'★'.repeat(Math.round(shop.avgRating ?? 0))}{'☆'.repeat(5 - Math.round(shop.avgRating ?? 0))}
          </span>
          <span className="text-gray-400 text-xs">{shop.avgRating?.toFixed(1)}</span>
          <span className="text-gray-400 text-xs">({shop.reviewCount}条)</span>
          {shop.avgPrice != null && (
            <span className="text-gray-400 text-xs">人均¥{Math.round(shop.avgPrice)}</span>
          )}
        </div>
      )}

      {/* Address */}
      {shop.address && (
        <p className="mt-1.5 text-sm text-gray-500 truncate" title={shop.address}>
          📍 {shop.address}
        </p>
      )}

      {/* Tags */}
      {shop.tags && shop.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {shop.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Sync Status + Phone */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${syncBadge.color}`}
        >
          <span>{syncBadge.emoji}</span>
          {syncBadge.label}
        </span>
        {shop.phone && (
          <span className="text-xs text-gray-400">📞 {shop.phone}</span>
        )}
      </div>
    </div>
  );
}
