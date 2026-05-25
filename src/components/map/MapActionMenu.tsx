'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
}

export default function MapActionMenu({ x, y, lng, lat, address, addressLoading, onAddShop, onClose, nearbyShops, onShopSelect }: MapActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showNearby, setShowNearby] = useState(false);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const handleAddShop = useCallback(() => {
    onAddShop({ lng, lat, address });
  }, [lng, lat, address, onAddShop]);

  // Position menu, adjusting for viewport edges
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

  const hasNearby = nearbyShops && nearbyShops.length > 0;

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 sm:min-w-[180px] sm:max-w-[220px] max-h-[70vh] overflow-y-auto"
      style={{ left, top, ...(isMobile ? { width: 'calc(100vw - 32px)' } : {}) }}
    >
      <button
        onClick={handleAddShop}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
      >
        在这里添加店铺
      </button>
      <button
        onClick={() => setShowNearby(!showNearby)}
        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
          hasNearby
            ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
            : 'text-gray-400 cursor-default'
        }`}
      >
        显示附近店铺
      </button>
      {showNearby && (
        <div className="border-t border-gray-100 mt-1 pt-1">
          {hasNearby ? (
            <div className="space-y-0.5">
              {nearbyShops!.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => onShopSelect?.(shop.id)}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 truncate">{shop.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {shop.distance < 1000
                        ? `${Math.round(shop.distance)}m`
                        : `${(shop.distance / 1000).toFixed(1)}km`}
                    </span>
                  </div>
                  {shop.address && (
                    <p className="text-xs text-gray-400 truncate">{shop.address}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-2 text-xs text-gray-400">附近没有已记录的店铺</p>
          )}
        </div>
      )}
      {address && (
        <p className="px-4 pt-1 text-xs text-gray-400 border-t border-gray-100 mt-1 pt-2 truncate" title={address}>
          {address}
        </p>
      )}
      {addressLoading && !address && (
        <p className="px-4 pt-1 text-xs text-gray-300 border-t border-gray-100 mt-1 pt-2">
          正在获取地址...
        </p>
      )}
    </div>
  );
}
