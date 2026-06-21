'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';

interface CityPickerProps {
  currentCity: string;
  isAuto: boolean;
  onCitySelect: (city: string, center: [number, number]) => void;
  onAutoMode: () => void;
  onClose: () => void;
}

interface CityResult {
  name: string;
  center: [number, number];
}

const HOT_CITY_CENTERS: Record<string, [number, number]> = {
  '北京': [116.397428, 39.90923],
  '上海': [121.473701, 31.230416],
  '广州': [113.264385, 23.129112],
  '深圳': [114.057868, 22.543099],
  '杭州': [120.153576, 30.287459],
  '成都': [104.065735, 30.659462],
  '南京': [118.767413, 32.041544],
  '武汉': [114.298572, 30.584355],
  '重庆': [106.504962, 29.533155],
  '西安': [108.948024, 34.263161],
};

const HOT_CITIES = Object.keys(HOT_CITY_CENTERS);

export default function CityPicker({ currentCity, isAuto, onCitySelect, onAutoMode, onClose }: CityPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const districtSearchRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap) return;
    AMap.plugin('AMap.DistrictSearch', () => {
      districtSearchRef.current = new AMap.DistrictSearch({ level: 'city', subdistrict: 0 });
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = keyword.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      if (!districtSearchRef.current) {
        setLoading(false);
        return;
      }

      districtSearchRef.current.search(trimmed, (status: string, result: any) => {
        setLoading(false);
        if (status === 'complete' && result?.districtList) {
          const cities: CityResult[] = result.districtList
            .filter((d: any) => d.level === 'city' || d.level === 'province')
            .map((d: any) => ({
              name: d.name.replace(/市$/, ''),
              center: d.center ? [d.center.lng, d.center.lat] as [number, number] : [116.397428, 39.90923],
            }));
          setResults(cities);
        } else {
          setResults([]);
        }
      });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword]);

  const handleSelect = useCallback((city: string, center: [number, number]) => {
    onCitySelect(city, center);
  }, [onCitySelect]);

  const itemClass = (active: boolean) =>
    cn(
      'w-full text-left px-4 py-2.5 text-sm transition-colors',
      active ? 'bg-primary-muted text-primary font-medium' : 'text-foreground hover:bg-primary-muted/40',
    );

  return (
    <div ref={panelRef} className="border-t border-border max-h-[250px] overflow-y-auto">
      <button onClick={onAutoMode} className={itemClass(isAuto)}>
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          自动定位{isAuto && currentCity ? ` · ${currentCity}` : ''}
        </span>
      </button>

      <div className="border-t border-border" />

      <div className="px-3 py-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索城市..."
          className="w-full px-3 py-1.5 text-sm border border-border rounded-[var(--radius-button)] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted/70 bg-surface text-foreground"
          autoFocus
        />
      </div>

      {!keyword && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted mb-1.5">热门城市</p>
          <div className="flex flex-wrap gap-1.5">
            {HOT_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => handleSelect(city, HOT_CITY_CENTERS[city])}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-[var(--radius-button)] transition-colors',
                  currentCity === city
                    ? 'bg-primary-muted text-primary font-medium'
                    : 'bg-background text-muted hover:bg-primary-muted/40 hover:text-foreground',
                )}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-xs text-muted">搜索中...</span>
        </div>
      )}

      {!loading && keyword && results.length === 0 && (
        <div className="px-4 py-4 text-center text-xs text-muted">没有找到城市</div>
      )}

      {!loading && results.map((city) => (
        <button key={city.name} onClick={() => handleSelect(city.name, city.center)} className={itemClass(currentCity === city.name)}>
          {city.name}
        </button>
      ))}
    </div>
  );
}
