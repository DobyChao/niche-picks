'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CityPicker from './CityPicker';
import Badge from '@/components/ui/Badge';

export interface PoiResult {
  name: string;
  address: string;
  lng: number;
  lat: number;
  category?: string;
  phone?: string;
  amapPoiId?: string;
  distance?: number;
  isLocalShop?: boolean;
  shopId?: string;
}

interface MapSearchBoxProps {
  visible: boolean;
  onSearch: (keyword: string, callback: (results: PoiResult[]) => void) => void;
  onPoiSelect: (poi: PoiResult) => void;
  onClose: () => void;
  currentCity: string;
  isAutoCity: boolean;
  showCityPicker: boolean;
  onToggleCityPicker: () => void;
  onCitySelect: (city: string, center: [number, number]) => void;
  onAutoMode: () => void;
  onCloseCityPicker: () => void;
  placeholder?: string;
}

export default function MapSearchBox({
  visible, onSearch, onPoiSelect, onClose,
  currentCity, isAutoCity, showCityPicker,
  onToggleCityPicker, onCitySelect, onAutoMode, onCloseCityPicker,
  placeholder = '搜索地点...',
}: MapSearchBoxProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<PoiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = keyword.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      onSearch(trimmed, (searchResults) => {
        setResults(searchResults);
        setLoading(false);
        setSearched(true);
      });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword, onSearch]);

  const handleClear = useCallback(() => {
    setKeyword('');
    setResults([]);
    setLoading(false);
    setSearched(false);
  }, []);

  const handlePoiClick = useCallback((poi: PoiResult) => {
    onPoiSelect(poi);
  }, [onPoiSelect]);

  if (!visible) return null;

  const cityLabel = isAutoCity && currentCity ? `定位 · ${currentCity}` : currentCity || '选择城市';

  return (
    <div className="absolute top-3 left-3 z-20 w-[calc(100%-24px)] sm:w-[380px]">
      <div className="bg-surface/95 backdrop-blur-md border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] overflow-hidden">
        <div className="flex items-center gap-1 px-2 py-2 border-b border-border">
          <button
            onClick={onToggleCityPicker}
            className="flex items-center gap-0.5 px-2 py-1 text-sm text-primary font-medium hover:bg-primary-muted/60 rounded-[var(--radius-button)] transition-colors shrink-0 max-w-[120px] truncate"
          >
            {cityLabel}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="w-px h-4 bg-border shrink-0" />

          <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={placeholder}
            className="flex-1 mx-2 py-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted/70"
          />

          <button
            onClick={keyword ? handleClear : onClose}
            className="p-0.5 rounded-full hover:bg-primary-muted/50 text-muted hover:text-foreground transition-colors"
            aria-label={keyword ? '清除搜索' : '关闭搜索'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showCityPicker && (
          <CityPicker
            currentCity={currentCity}
            isAuto={isAutoCity}
            onCitySelect={onCitySelect}
            onAutoMode={onAutoMode}
            onClose={onCloseCityPicker}
          />
        )}

        {(loading || results.length > 0 || (searched && results.length === 0)) && !showCityPicker && (
          <div className="max-h-[250px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted">搜索中...</span>
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted">没有找到结果</div>
            )}

            {!loading && results.map((poi, index) => (
              <button
                key={poi.shopId ?? poi.amapPoiId ?? index}
                onClick={() => handlePoiClick(poi)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-muted/50 transition-colors border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                    {poi.name}
                    {poi.isLocalShop && <Badge variant="success">已收录</Badge>}
                  </span>
                  {poi.distance != null && (
                    <span className="text-xs text-muted flex-shrink-0">
                      {poi.distance < 1000 ? `${Math.round(poi.distance)}m` : `${(poi.distance / 1000).toFixed(1)}km`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">{poi.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
