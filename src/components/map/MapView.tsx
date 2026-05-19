'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocalShop } from '@/lib/types';

interface MapViewProps {
  shops: LocalShop[];
  onMapClick?: (lng: number, lat: number) => void;
  pickMode?: boolean;
}

export default function MapView({ shops, onMapClick, pickMode }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pickMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if ((window as any).AMap) {
      initMap();
      return;
    }

    const existingScript = document.querySelector('script[src*="webapi.amap.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initMap);
      return;
    }

    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '';
    if (!amapKey) {
      setMapError(true);
      return;
    }

    fetch('/api/amap/config')
      .then((res) => res.json())
      .then(({ securityJsCode }) => {
        if (securityJsCode) {
          (window as any)._AMapSecurityConfig = {
            securityJsCode,
          };
        }
      })
      .catch(() => {})
      .finally(() => {
        loadScript(amapKey);
      });

    return () => {
      markersRef.current.forEach((marker) => marker?.setMap?.(null));
      markersRef.current = [];
      pickMarkerRef.current?.setMap?.(null);
    };
  }, []);

  function loadScript(amapKey: string) {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
    script.async = true;
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      setMapError(true);
    };
    document.head.appendChild(script);
  }

  function initMap() {
    if (!containerRef.current || !(window as any).AMap) {
      setMapError(true);
      return;
    }

    try {
      const AMap = (window as any).AMap;
      mapInstanceRef.current = new AMap.Map(containerRef.current, {
        zoom: 13,
        center: [116.397428, 39.90923],
        viewMode: '2D',
      });

      // Click to pick coordinates
      mapInstanceRef.current.on('click', (e: any) => {
        if (onMapClick && pickMode) {
          const { lng, lat } = e.lnglat;
          onMapClick(lng, lat);

          // Show/update a pick marker
          const AMap2 = (window as any).AMap;
          if (pickMarkerRef.current) {
            pickMarkerRef.current.setPosition([lng, lat]);
          } else {
            pickMarkerRef.current = new AMap2.Marker({
              position: [lng, lat],
              label: {
                content: '选取位置',
                direction: 'top',
              },
            });
            pickMarkerRef.current.setMap(mapInstanceRef.current);
          }
        }
      });

      setMapLoaded(true);
    } catch {
      setMapError(true);
    }
  }

  // Update cursor style based on pickMode
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = pickMode ? 'crosshair' : '';
    }
  }, [pickMode]);

  // Update markers when shops change and map is loaded
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    markersRef.current.forEach((marker) => marker?.setMap?.(null));
    markersRef.current = [];

    const validShops = shops.filter(
      (shop) => typeof shop.lng === 'number' && typeof shop.lat === 'number'
    );

    validShops.forEach((shop) => {
      try {
        const marker = new AMap.Marker({
          position: [shop.lng, shop.lat],
          title: shop.name,
          label: {
            content: shop.name,
            direction: 'top',
          },
        });
        marker.setMap(mapInstanceRef.current);
        markersRef.current.push(marker);
      } catch {
        // Skip invalid markers silently
      }
    });

    if (validShops.length > 0) {
      try {
        mapInstanceRef.current.setFitView(markersRef.current);
      } catch {
        // Ignore fit view errors
      }
    }
  }, [shops, mapLoaded]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ minHeight: '300px' }}>
      <div ref={containerRef} className="w-full h-full" />
      {pickMode && mapLoaded && (
        <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md z-10">
          点击地图选取坐标
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center rounded-lg">
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-sm font-medium">地图加载失败</p>
            <p className="text-xs mt-1 text-gray-400">请检查 API Key 配置</p>
          </div>
        </div>
      )}
    </div>
  );
}
