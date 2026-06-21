'use client';

import type { MergedShop, SyncBadge } from '@/lib/types';
import { getCategoryColor } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import { cn } from '@/lib/cn';

interface ShopCardProps {
  shop: MergedShop;
  onClick?: () => void;
  selected?: boolean;
}

function getSyncBadge(badge: SyncBadge) {
  switch (badge) {
    case 'draft':
      return { label: '未提交', variant: 'warning' as const };
    case 'pending':
      return { label: '同步中', variant: 'default' as const };
    case 'synced':
      return { label: '已同步', variant: 'success' as const };
  }
}

export default function ShopCard({ shop, onClick, selected }: ShopCardProps) {
  const syncBadge = getSyncBadge(shop._syncBadge);
  const catColor = getCategoryColor(shop.category);

  return (
    <Card
      padding="md"
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-[var(--shadow-elevated)] hover:border-primary/20',
        selected && 'ring-2 ring-primary/30 border-primary/30',
      )}
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
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground text-base leading-snug truncate">
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

      {shop.reviewCount > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <StarRating rating={shop.avgRating ?? 0} />
          <span className="text-muted text-xs tabular-nums">{shop.avgRating?.toFixed(1)}</span>
          <span className="text-muted text-xs">({shop.reviewCount}条)</span>
          {shop.avgPrice != null && (
            <span className="text-muted text-xs">人均¥{Math.round(shop.avgPrice)}</span>
          )}
        </div>
      )}

      {shop.address && (
        <p className="mt-1.5 text-sm text-muted truncate" title={shop.address}>
          {shop.address}
        </p>
      )}

      {shop.tags && shop.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {shop.tags.map((tag, index) => (
            <Badge key={index} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
        {shop.phone && <span className="text-xs text-muted">{shop.phone}</span>}
      </div>
    </Card>
  );
}
