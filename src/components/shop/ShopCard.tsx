'use client';

import type { LocalShop, SyncStatus } from '@/lib/types';

interface ShopCardProps {
  shop: LocalShop;
  onClick?: () => void;
}

function getSyncBadge(syncStatus?: SyncStatus) {
  if (!syncStatus) return { emoji: '⚪', label: '未知', color: 'bg-gray-100 text-gray-600' };

  switch (syncStatus) {
    case 'local_modified':
    case 'pending':
      return { emoji: '🟢', label: '待同步', color: 'bg-yellow-100 text-yellow-700' };
    case 'synced':
      return { emoji: '🔵', label: '已同步', color: 'bg-green-100 text-green-700' };
    default:
      return { emoji: '⚪', label: '未知', color: 'bg-gray-100 text-gray-600' };
  }
}

export default function ShopCard({ shop, onClick }: ShopCardProps) {
  const syncBadge = getSyncBadge(shop._syncStatus);

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
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {shop.category}
          </span>
        )}
      </div>

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
