'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
      districtSearchRef.current = new AMap.DistrictSearch({
        level: 'city',
        subdistrict: 0,
      });
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
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

  // Debounced city search
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
              center: d.center
                ? [d.center.lng, d.center.lat] as [number, number]
                : [116.397428, 39.90923] as [number, number],
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

  return (
    <div ref={panelRef} className="border-t border-gray-100 max-h-[250px] overflow-y-auto">
      {/* AUTO mode button */}
      <button
        onClick={onAutoMode}
        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
          isAuto ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          自动定位{isAuto && currentCity ? ` · ${currentCity}` : ''}
        </span>
      </button>

      <div className="border-t border-gray-100" />

      {/* Search input */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索城市..."
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-400 placeholder-gray-400"
          autoFocus
        />
      </div>

      {/* Hot cities (shown when no search keyword) */}
      {!keyword && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 mb-1.5">热门城市</p>
          <div className="flex flex-wrap gap-1.5">
            {HOT_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => handleSelect(city, HOT_CITY_CENTERS[city])}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentCity === city
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          <span className="ml-2 text-xs text-gray-400">搜索中...</span>
        </div>
      )}

      {/* No results */}
      {!loading && keyword && results.length === 0 && (
        <div className="px-4 py-4 text-center text-xs text-gray-400">没有找到城市</div>
      )}

      {/* Search results */}
      {!loading && results.map((city) => (
        <button
          key={city.name}
          onClick={() => handleSelect(city.name, city.center)}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
            currentCity === city.name
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {city.name}
        </button>
      ))}
    </div>
  );
}
