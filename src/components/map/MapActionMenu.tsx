'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';

interface NearbyShop {
  id: string;
  name: string;
  address: string;
  distance: number;
}

interface MapActionMenuProps {
  x: number;
  y: number;
  lng: number;
  lat: number;
  address: string;
  addressLoading: boolean;
  onAddShop: (data: { lng: number; lat: number; address: string }) => void;
  onClose: () => void;
  nearbyShops?: NearbyShop[];
  onShopSelect?: (shopId: string) => void;
  mode?: 'add' | 'repick';
}

export default function MapActionMenu({ x, y, lng, lat, address, addressLoading, onAddShop, onClose, nearbyShops, onShopSelect, mode = 'add' }: MapActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showNearby, setShowNearby] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const handleAddShop = useCallback(() => {
    onAddShop({ lng, lat, address });
  }, [lng, lat, address, onAddShop]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  let left: number;
  let top = y + 10;
  if (isMobile) {
    left = 16;
  } else {
    const menuWidth = 200;
    left = x + 10;
    if (left + menuWidth > window.innerWidth!) left = x - menuWidth - 10;
  }
  if (typeof window !== 'undefined') {
    if (top + 300 > window.innerHeight) top = y - 300;
    if (top < 0) top = 10;
  }

  const isRepick = mode === 'repick';
  const hasNearby = !isRepick && nearbyShops && nearbyShops.length > 0;

  const menuItemClass = (enabled = true) =>
    cn(
      'w-full text-left px-4 py-2 text-sm transition-colors',
      enabled ? 'text-foreground hover:bg-primary-muted/50 hover:text-primary' : 'text-muted cursor-default',
    );

  return (
    <div
      ref={menuRef}
      className="absolute bg-surface/95 backdrop-blur-md rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] border border-border py-2 z-20 sm:min-w-[180px] sm:max-w-[220px] max-h-[70vh] overflow-y-auto"
      style={{ left, top, ...(isMobile ? { width: 'calc(100vw - 32px)' } : {}) }}
    >
      <button onClick={handleAddShop} className={menuItemClass()}>
        {isRepick ? '确认选取此位置' : '在这里添加店铺'}
      </button>
      {!isRepick && (
        <button onClick={() => setShowNearby(!showNearby)} className={menuItemClass(!!hasNearby)}>
          显示附近店铺
        </button>
      )}
      {showNearby && (
        <div className="border-t border-border mt-1 pt-1">
          {hasNearby ? (
            <div className="space-y-0.5">
              {nearbyShops!.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => onShopSelect?.(shop.id)}
                  className="w-full text-left px-4 py-1.5 hover:bg-primary-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{shop.name}</span>
                    <span className="text-xs text-muted flex-shrink-0">
                      {shop.distance < 1000 ? `${Math.round(shop.distance)}m` : `${(shop.distance / 1000).toFixed(1)}km`}
                    </span>
                  </div>
                  {shop.address && <p className="text-xs text-muted truncate">{shop.address}</p>}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-2 text-xs text-muted">附近没有已记录的店铺</p>
          )}
        </div>
      )}
      {address && (
        <p className="px-4 pt-2 text-xs text-muted border-t border-border mt-1 truncate" title={address}>
          {address}
        </p>
      )}
      {addressLoading && !address && (
        <p className="px-4 pt-2 text-xs text-muted border-t border-border mt-1">正在获取地址...</p>
      )}
    </div>
  );
}
