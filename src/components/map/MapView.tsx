'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocalShop } from '@/lib/types';

interface MapViewProps {
  shops: LocalShop[];
}

export default function MapView({ shops }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Check if AMap is already loaded
    if ((window as any).AMap) {
      initMap();
      return;
    }

    // Try to load AMap script
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

    // Fetch security code from server-side API, then load AMap script
    fetch('/api/amap/config')
      .then((res) => res.json())
      .then(({ securityJsCode }) => {
        if (securityJsCode) {
          (window as any)._AMapSecurityConfig = {
            securityJsCode,
          };
        }
      })
      .catch(() => {
        // Security code fetch failed; continue without it
      })
      .finally(() => {
        loadScript(amapKey);
      });

    return () => {
      // Cleanup markers
      markersRef.current.forEach((marker) => marker?.setMap?.(null));
      markersRef.current = [];
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
        center: [116.397428, 39.90923], // Default to Beijing
        viewMode: '2D',
      });
      setMapLoaded(true);
    } catch {
      setMapError(true);
    }
  }

  // Update markers when shops change and map is loaded
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker?.setMap?.(null));
    markersRef.current = [];

    // Add new markers
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

    // Fit map to markers if there are any
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
