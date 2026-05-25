'use client';

import { useEffect, useRef } from 'react';

interface MapMarkerPopupProps {
  shop: { name: string; address: string; category?: string };
  x: number;
  y: number;
  onEdit: () => void;
  onClose: () => void;
}

export default function MapMarkerPopup({ shop, x, y, onEdit, onClose }: MapMarkerPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
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

  // Position popup with viewport edge detection
  const popupWidth = 220;
  const popupHeight = 120;
  let left = x + 10;
  let top = y - popupHeight - 10;
  if (typeof window !== 'undefined') {
    if (left + popupWidth > window.innerWidth) left = x - popupWidth - 10;
    if (top < 0) top = y + 10;
    if (top + popupHeight > window.innerHeight) top = y - popupHeight - 10;
  }

  return (
    <div
      ref={popupRef}
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 z-30"
      style={{ left, top, width: popupWidth }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-2.5 pb-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{shop.name}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-2 space-y-1">
        {shop.category && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {shop.category}
          </span>
        )}
        {shop.address && (
          <p className="text-xs text-gray-500 truncate" title={shop.address}>{shop.address}</p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2">
        <button
          onClick={onEdit}
          className="w-full text-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
          编辑
        </button>
      </div>
    </div>
  );
}
