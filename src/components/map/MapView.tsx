'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { MergedShop } from '@/lib/types';
import { getCategoryColor } from '@/lib/utils';
import MapActionMenu from './MapActionMenu';
import MapSearchBox, { type PoiResult } from './MapSearchBox';

function haversineDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSearchRadius(zoom: number): number {
  if (zoom >= 16) return 2000;
  if (zoom >= 14) return 5000;
  if (zoom >= 12) return 10000;
  if (zoom >= 10) return 20000;
  return 50000;
}

function buildShopInfoHtml(shop: MergedShop): string {
  const parts: string[] = [];

  // Name + category
  const catColor = getCategoryColor(shop.category);
  const categoryHtml = shop.category
    ? `<span style="display:inline-block;padding:1px 8px;font-size:11px;border-radius:9999px;background:${catColor};color:white;margin-left:6px;vertical-align:middle">${shop.category}</span>`
    : '';
  parts.push(`<div style="font-size:14px;font-weight:600;color:#111827;line-height:1.4">${shop.name}${categoryHtml}</div>`);

  // Rating
  if (shop.reviewCount > 0) {
    const fullStars = Math.round(shop.avgRating ?? 0);
    const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    const ratingText = `${shop.avgRating?.toFixed(1)} · ${shop.reviewCount}条点评`;
    const priceText = shop.avgPrice != null ? ` · 人均¥${Math.round(shop.avgPrice)}` : '';
    parts.push(`<div style="margin-top:6px;display:flex;align-items:center;gap:6px"><span style="color:#f59e0b;font-size:13px;letter-spacing:1px">${stars}</span><span style="font-size:11px;color:#9ca3af">${ratingText}${priceText}</span></div>`);
  }

  // Address
  if (shop.address) {
    parts.push(`<div style="font-size:12px;color:#9ca3af;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${shop.address}</div>`);
  }

  // Phone
  if (shop.phone) {
    parts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px">${shop.phone}</div>`);
  }

  // Hours
  if (shop.businessHours) {
    parts.push(`<div style="font-size:12px;color:#6b7280;margin-top:2px">${shop.businessHours}</div>`);
  }

  // Tags
  if (shop.tags && shop.tags.length > 0) {
    const tagsHtml = shop.tags.map(t =>
      `<span style="display:inline-block;padding:1px 6px;font-size:11px;border-radius:3px;background:#f3f4f6;color:#6b7280;margin-right:3px;margin-bottom:2px">${t}</span>`
    ).join('');
    parts.push(`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:2px">${tagsHtml}</div>`);
  }

  // Action buttons
  parts.push(`
    <div style="margin-top:10px;border-top:1px solid #f3f4f6;padding-top:8px;display:flex;gap:8px">
      <button onclick="window.__mapShopDetail('${shop.id}')"
        style="flex:1;padding:5px 0;font-size:12px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">查看详情</button>
      <button onclick="window.__mapShopEdit('${shop.id}')"
        style="flex:1;padding:5px 0;font-size:12px;background:#f3f4f6;color:#374151;border:none;border-radius:6px;cursor:pointer">编辑</button>
    </div>
  `);

  return `<div style="min-width:200px;max-width:280px;padding:2px">${parts.join('')}</div>`;
}

interface MapActionData {
  x: number;
  y: number;
  lng: number;
  lat: number;
}

interface MapActionAddShopData {
  lng: number;
  lat: number;
  address: string;
  name?: string;
  category?: string;
  phone?: string;
  amapPoiId?: string;
}

interface MapViewProps {
  shops: MergedShop[];
  onMapActionAddShop?: (data: MapActionAddShopData) => void;
  flyToShop?: MergedShop | null;
  selectedShopId?: string | null;
  onShopSelect?: (shop: MergedShop) => void;
  onEditShop?: (shop: MergedShop) => void;
  repickMode?: boolean;
}

export default function MapView({ shops, onMapActionAddShop, flyToShop, selectedShopId, onShopSelect, onEditShop, repickMode }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pickMarkerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const poiMarkersRef = useRef<any[]>([]);
  const poiExtraRef = useRef<Partial<MapActionAddShopData> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [actionMenu, setActionMenu] = useState<MapActionData | null>(null);
  const [actionAddress, setActionAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const initialFitDoneRef = useRef(false);
  const locationMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const selectedShopForInfoRef = useRef<MergedShop | null>(null);
  const [currentCity, setCurrentCity] = useState('');
  const [cityMode, setCityMode] = useState<'auto' | 'manual'>('auto');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const lastGeocodeCenterRef = useRef<{ lng: number; lat: number } | null>(null);

  // Reverse geocode when action menu position changes (only if no address yet)
  useEffect(() => {
    if (!actionMenu) return;
    if (actionAddress) return; // Already have address (e.g. from POI)
    if (!geocoderRef.current) return;

    setAddressLoading(true);

    geocoderRef.current.getAddress(
      [actionMenu.lng, actionMenu.lat],
      (status: string, result: any) => {
        setAddressLoading(false);
        if (status === 'complete' && result?.regeocode?.formattedAddress) {
          setActionAddress(result.regeocode.formattedAddress);
        }
      }
    );
  }, [actionMenu]);

  // Update pick marker position
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const AMap = (window as any).AMap;
    if (!AMap) return;

    if (actionMenu) {
      if (pickMarkerRef.current) {
        pickMarkerRef.current.setPosition([actionMenu.lng, actionMenu.lat]);
      } else {
        pickMarkerRef.current = new AMap.Marker({
          position: [actionMenu.lng, actionMenu.lat],
          label: {
            content: '选取位置',
            direction: 'top',
          },
          zIndex: 150,
        });
        pickMarkerRef.current.setMap(mapInstanceRef.current);
      }
    } else {
      if (pickMarkerRef.current) {
        pickMarkerRef.current.setMap(null);
        pickMarkerRef.current = null;
      }
    }
  }, [actionMenu]);

  const handleAddShop = useCallback((data: { lng: number; lat: number; address: string }) => {
    setActionMenu(null);
    const extra = poiExtraRef.current;
    poiExtraRef.current = null;
    // Clear POI markers after user confirms adding a shop
    poiMarkersRef.current.forEach((m) => m?.setMap?.(null));
    poiMarkersRef.current = [];
    onMapActionAddShop?.({
      lng: data.lng,
      lat: data.lat,
      address: data.address,
      name: extra?.name,
      category: extra?.category,
      phone: extra?.phone,
      amapPoiId: extra?.amapPoiId,
    });
  }, [onMapActionAddShop]);

  const handleCloseMenu = useCallback(() => {
    setActionMenu(null);
    setActionAddress('');
    poiExtraRef.current = null;
    // Clear POI markers when menu is dismissed
    poiMarkersRef.current.forEach((m) => m?.setMap?.(null));
    poiMarkersRef.current = [];
  }, []);

  // Helper: search local shops by keyword
  const searchLocalShops = useCallback((keyword: string, center?: any) => {
    const lowerKw = keyword.toLowerCase();
    return shops
      .filter(s => !s.isDeleted && typeof s.lng === 'number' && typeof s.lat === 'number')
      .filter(s => {
        const name = (s.name || '').toLowerCase();
        const address = (s.address || '').toLowerCase();
        const category = (s.category || '').toLowerCase();
        const tags = (s.tags || []).join(' ').toLowerCase();
        return name.includes(lowerKw) || address.includes(lowerKw) || category.includes(lowerKw) || tags.includes(lowerKw);
      })
      .map(s => ({
        name: s.name,
        address: s.address || '',
        lng: s.lng!,
        lat: s.lat!,
        category: s.category || undefined,
        phone: s.phone || undefined,
        distance: center
          ? haversineDistance(center.lng, center.lat, s.lng!, s.lat!)
          : undefined,
        isLocalShop: true as const,
        shopId: s.id,
      }));
  }, [shops]);

  // Unified search: searchNearBy with local shops merged
  const handleSearch = useCallback((keyword: string, callback: (results: PoiResult[]) => void) => {
    const center = mapInstanceRef.current?.getCenter();
    const localResults = searchLocalShops(keyword, center);

    if (!placeSearchRef.current) {
      localResults.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      callback(localResults);
      return;
    }

    const AMap = (window as any).AMap;
    const searchCallback = (status: string, result: any) => {
      const amapPois: PoiResult[] = (status === 'complete' && result?.poiList?.pois)
        ? result.poiList.pois.map((poi: any) => ({
            name: poi.name || '',
            address: poi.address || poi.pname + poi.cityname + poi.adname || '',
            lng: poi.location?.lng ?? 0,
            lat: poi.location?.lat ?? 0,
            category: poi.type ? poi.type.split(';')[0] : undefined,
            phone: poi.tel || undefined,
            amapPoiId: poi.id || undefined,
            distance: typeof poi.distance === 'number'
              ? poi.distance
              : (center && poi.location)
                ? haversineDistance(center.lng, center.lat, poi.location.lng, poi.location.lat)
                : undefined,
          }))
        : [];

      // Deduplicate by name
      const localNames = new Set(localResults.map(l => l.name.toLowerCase()));
      const filtered = amapPois.filter(p => !localNames.has(p.name.toLowerCase()));

      const merged = [...localResults, ...filtered];
      merged.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      callback(merged.slice(0, 20));
    };

    if (center) {
      const zoom = mapInstanceRef.current.getZoom();
      const radius = getSearchRadius(zoom);
      placeSearchRef.current.searchNearBy(keyword, new AMap.LngLat(center.lng, center.lat), radius, searchCallback);
    } else {
      placeSearchRef.current.search(keyword, searchCallback);
    }
  }, [searchLocalShops]);

  const handleCitySelect = useCallback((city: string, center: [number, number]) => {
    setCityMode('manual');
    setCurrentCity(city);
    setShowCityPicker(false);
    mapInstanceRef.current?.setZoomAndCenter(12, center, false, 500);
    localStorage.setItem('map_city', JSON.stringify({ mode: 'manual', city }));
  }, []);

  const handleAutoMode = useCallback(() => {
    setCityMode('auto');
    setShowCityPicker(false);
    localStorage.setItem('map_city', JSON.stringify({ mode: 'auto', city: '' }));
    const center = mapInstanceRef.current?.getCenter();
    if (center && geocoderRef.current) {
      geocoderRef.current.getAddress([center.lng, center.lat], (status: string, result: any) => {
        if (status === 'complete' && result?.regeocode?.addressComponent) {
          const { city, province } = result.regeocode.addressComponent;
          const cityName = (city || province || '').replace(/市$/, '');
          setCurrentCity(cityName);
          lastGeocodeCenterRef.current = { lng: center.lng, lat: center.lat };
        }
      });
    }
  }, []);

  // Show action menu at a POI position after map finishes moving
  const showPoiActionMenu = useCallback((poi: PoiResult) => {
    if (!mapInstanceRef.current) return;

    // Fly to the POI
    mapInstanceRef.current.setZoomAndCenter(16, [poi.lng, poi.lat], false, 300);

    // Store POI extra data
    poiExtraRef.current = {
      name: poi.name,
      category: poi.category,
      phone: poi.phone,
      amapPoiId: poi.amapPoiId,
    };

    // Pre-fill address (no reverse geocode needed)
    setActionAddress(poi.address || '');
    setAddressLoading(false);

    // Wait for map animation to finish before calculating pixel position
    const map = mapInstanceRef.current;
    function onMoveEnd() {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      const pixel = map.lngLatToContainer(new (window as any).AMap.LngLat(poi.lng, poi.lat));
      setActionMenu({
        x: pixel.getX(),
        y: pixel.getY(),
        lng: poi.lng,
        lat: poi.lat,
      });
    }
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
  }, []);

  // Render POI result markers on map (with click handlers)
  const updatePoiMarkers = useCallback((pois: PoiResult[]) => {
    const AMap = (window as any).AMap;
    if (!AMap || !mapInstanceRef.current) return;

    // Clear existing POI markers
    poiMarkersRef.current.forEach((m) => m?.setMap?.(null));
    poiMarkersRef.current = [];

    pois.forEach((poi) => {
      if (!poi.lng || !poi.lat) return;
      try {
        const marker = new AMap.Marker({
          position: [poi.lng, poi.lat],
          title: poi.name,
          zIndex: 120,
          label: {
            content: poi.name,
            direction: 'top',
          },
        });
        marker.setContent(
          '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>'
        );
        // Click POI marker → same action as selecting from list
        marker.on('click', () => {
          showPoiActionMenu(poi);
          setShowSearch(false);
        });
        marker.setMap(mapInstanceRef.current);
        poiMarkersRef.current.push(marker);
      } catch (_e) {}
    });

    // Fit view to show POI markers
    if (poiMarkersRef.current.length > 0) {
      try {
        mapInstanceRef.current.setFitView(poiMarkersRef.current);
      } catch (_e) {}
    }
  }, [showPoiActionMenu]);

  // Handle POI selection from search dropdown
  const handlePoiSelect = useCallback((poi: PoiResult) => {
    if (!mapInstanceRef.current || !poi.lng || !poi.lat) return;
    setShowSearch(false);

    // Local shop → select directly
    if (poi.isLocalShop && poi.shopId) {
      const shop = shops.find(s => s.id === poi.shopId);
      if (shop) {
        mapInstanceRef.current.setZoomAndCenter(16, [poi.lng, poi.lat], false, 300);
        onShopSelect?.(shop);
        return;
      }
    }

    showPoiActionMenu(poi);
  }, [showPoiActionMenu, shops, onShopSelect]);

  // Clean up POI markers when search closes
  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    poiMarkersRef.current.forEach((m) => m?.setMap?.(null));
    poiMarkersRef.current = [];
  }, []);

  // Calculate nearby shops when action menu position changes
  const nearbyShops = useMemo(() => {
    if (!actionMenu) return [];
    return shops
      .filter(s => !s.isDeleted && typeof s.lng === 'number' && typeof s.lat === 'number')
      .map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        distance: haversineDistance(actionMenu.lng, actionMenu.lat, s.lng!, s.lat!),
      }))
      .filter(s => s.distance < 500)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [actionMenu, shops]);

  // Search wrapper with map markers
  const handleSearchWithMarkers = useCallback((keyword: string, callback: (results: PoiResult[]) => void) => {
    handleSearch(keyword, (results) => {
      updatePoiMarkers(results);
      callback(results);
    });
  }, [handleSearch, updatePoiMarkers]);

  // Locate current position
  const handleLocateMe = useCallback(() => {
    if (!mapInstanceRef.current) return;
    if (locating) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    setLocating(true);
    setLocateError('');

    // Place or update the blue dot marker and center map
    function placeMarker(lng: number, lat: number) {
      setLocating(false);
      mapInstanceRef.current.setZoomAndCenter(16, [lng, lat], false, 500);
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setPosition([lng, lat]);
      } else {
        locationMarkerRef.current = new AMap.Marker({
          position: [lng, lat],
          zIndex: 300,
          offset: new AMap.Pixel(-12, -12),
          content: `<div style="position:relative;width:24px;height:24px">
            <div style="position:absolute;inset:0;background:rgba(59,130,246,0.2);border-radius:50%;animation:locPulse 2s ease-in-out infinite"></div>
            <div style="position:absolute;inset:4px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.4)"></div>
          </div>
          <style>@keyframes locPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(2.5);opacity:0}}</style>`,
        });
        locationMarkerRef.current.setMap(mapInstanceRef.current);
      }
    }

    // IP-based fallback (returns GCJ-02 already)
    function fallbackIpLocation() {
      AMap.plugin('AMap.CitySearch', () => {
        const cs = new AMap.CitySearch();
        cs.getLocalCity((status: string, result: any) => {
          if (status === 'complete' && result?.info === 'OK' && result?.bounds) {
            const center = result.bounds.getCenter();
            placeMarker(center.lng, center.lat);
          } else {
            setLocating(false);
            setLocateError('定位失败');
          }
        });
      });
    }

    // Try browser GPS first (returns WGS-84, must convert to GCJ-02)
    if (!navigator.geolocation) {
      fallbackIpLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // WGS-84 → GCJ-02
        AMap.convertFrom(
          [pos.coords.longitude, pos.coords.latitude],
          'gps',
          (cStatus: string, cResult: any) => {
            if (cStatus === 'complete' && cResult?.locations?.[0]) {
              const loc = cResult.locations[0];
              placeMarker(loc.lng, loc.lat);
            } else {
              placeMarker(pos.coords.longitude, pos.coords.latitude);
            }
          },
        );
      },
      () => {
        fallbackIpLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [locating]);

  // Auto-dismiss locate error after 3s
  useEffect(() => {
    if (!locateError) return;
    const t = setTimeout(() => setLocateError(''), 3000);
    return () => clearTimeout(t);
  }, [locateError]);

  // AUTO city detection — geocode map center on moveend
  useEffect(() => {
    if (!mapLoaded || cityMode !== 'auto') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const handler = () => {
      const center = map.getCenter();
      if (!center) return;
      const last = lastGeocodeCenterRef.current;
      if (last && haversineDistance(last.lng, last.lat, center.lng, center.lat) < 5000) return;
      if (!geocoderRef.current) return;

      geocoderRef.current.getAddress([center.lng, center.lat], (status: string, result: any) => {
        if (status === 'complete' && result?.regeocode?.addressComponent) {
          const { city, province } = result.regeocode.addressComponent;
          const cityName = (city || province || '').replace(/市$/, '');
          setCurrentCity(cityName);
          lastGeocodeCenterRef.current = { lng: center.lng, lat: center.lat };
        }
      });
    };

    map.on('moveend', handler);
    handler();
    return () => { map.off('moveend', handler); };
  }, [mapLoaded, cityMode]);

  // Update PlaceSearch city when city changes
  useEffect(() => {
    if (!placeSearchRef.current) return;
    placeSearchRef.current.setCity(currentCity || '全国');
    placeSearchRef.current.setCityLimit(!!currentCity);
  }, [currentCity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.clientHeight > 0) {
      loadAMap();
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          observer.disconnect();
          loadAMap();
          return;
        }
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  function loadAMap() {
    if ((window as any).AMap) {
      initMap();
      return;
    }

    if ((window as any).__amapLoading) {
      const check = setInterval(() => {
        if ((window as any).AMap) {
          clearInterval(check);
          initMap();
        }
      }, 200);
      return;
    }

    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '';
    if (!amapKey) {
      console.error('[MapView] Missing NEXT_PUBLIC_AMAP_KEY');
      setMapError(true);
      return;
    }

    (window as any)._AMapSecurityConfig = {
      serviceHost: `${window.location.origin}/_AMapService`,
    };
    loadScript(amapKey);
  }

  function loadScript(amapKey: string) {
    (window as any).__amapLoading = true;

    const timeout = setTimeout(() => {
      console.error('[MapView] AMap script load timed out (15s)');
      (window as any).__amapLoading = false;
      setMapError(true);
    }, 15_000);

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      (window as any).__amapLoading = false;
      initMap();
    };
    script.onerror = (e) => {
      clearTimeout(timeout);
      (window as any).__amapLoading = false;
      console.error('[MapView] AMap script failed to load', e);
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

      // Restore saved viewport
      let initialZoom = 13;
      let initialCenter: [number, number] = [116.397428, 39.90923];
      try {
        const saved = localStorage.getItem('map_viewport');
        if (saved) {
          const vp = JSON.parse(saved);
          if (vp.zoom) initialZoom = vp.zoom;
          if (vp.lng && vp.lat) initialCenter = [vp.lng, vp.lat];
        }
      } catch (_e) {}

      mapInstanceRef.current = new AMap.Map(containerRef.current, {
        zoom: initialZoom,
        center: initialCenter,
        viewMode: '2D',
      });

      // Save viewport on move/zoom
      mapInstanceRef.current.on('moveend', () => {
        try {
          const center = mapInstanceRef.current.getCenter();
          const zoom = mapInstanceRef.current.getZoom();
          localStorage.setItem('map_viewport', JSON.stringify({
            lng: center.lng, lat: center.lat, zoom,
          }));
        } catch (_e) {}
      });
      mapInstanceRef.current.on('zoomend', () => {
        try {
          const center = mapInstanceRef.current.getCenter();
          const zoom = mapInstanceRef.current.getZoom();
          localStorage.setItem('map_viewport', JSON.stringify({
            lng: center.lng, lat: center.lat, zoom,
          }));
        } catch (_e) {}
      });

      // Restore saved city mode
      try {
        const savedCity = localStorage.getItem('map_city');
        if (savedCity) {
          const parsed = JSON.parse(savedCity);
          if (parsed.mode === 'manual' && parsed.city) {
            setCityMode('manual');
            setCurrentCity(parsed.city);
          }
        }
      } catch (_e) {}

      // Initialize plugins
      AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.DistrictSearch'], () => {
        geocoderRef.current = new AMap.Geocoder();
        placeSearchRef.current = new AMap.PlaceSearch({
          pageSize: 20,
          extensions: 'all',
        });
      });

      mapInstanceRef.current.on('click', (e: any) => {
        const { lng, lat } = e.lnglat;
        const { x, y } = e.pixel;
        setActionMenu({ x, y, lng, lat });
        infoWindowRef.current?.close();
      });

      infoWindowRef.current = new AMap.InfoWindow({
        isCustom: false,
        closeWhenClickMap: false,
        offset: new AMap.Pixel(0, -30),
      });

      setMapLoaded(true);
    } catch {
      setMapError(true);
    }
  }

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker?.setMap?.(null));
      markersRef.current = [];
      poiMarkersRef.current.forEach((m) => m?.setMap?.(null));
      poiMarkersRef.current = [];
      pickMarkerRef.current?.setMap?.(null);
      locationMarkerRef.current?.setMap?.(null);
      infoWindowRef.current?.close?.();
      mapInstanceRef.current?.destroy?.();
    };
  }, []);

  // Global handlers for InfoWindow button clicks
  useEffect(() => {
    (window as any).__mapShopDetail = (shopId: string) => {
      const shop = selectedShopForInfoRef.current;
      if (shop?.id === shopId) {
        onShopSelect?.(shop);
      }
      infoWindowRef.current?.close();
    };
    (window as any).__mapShopEdit = (shopId: string) => {
      const shop = selectedShopForInfoRef.current;
      if (shop?.id === shopId) {
        onEditShop?.(shop);
      }
      infoWindowRef.current?.close();
    };
    return () => {
      delete (window as any).__mapShopDetail;
      delete (window as any).__mapShopEdit;
    };
  }, [onShopSelect, onEditShop]);

  // Render shop markers with selected highlighting
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
        const isSelected = selectedShopId === shop.id;
        const color = isSelected ? '#2563eb' : getCategoryColor(shop.category);
        const marker = new AMap.Marker({
          position: [shop.lng, shop.lat],
          title: shop.name,
          zIndex: isSelected ? 200 : 100,
          offset: new AMap.Pixel(-14, -42),
          content: `<svg viewBox="0 0 24 36" width="28" height="42" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="5" fill="#fff"/>
          </svg>`,
          label: {
            content: shop.name,
            direction: 'top',
            offset: new AMap.Pixel(0, -6),
          },
        });

        marker.on('click', () => {
          selectedShopForInfoRef.current = shop;
          infoWindowRef.current?.setContent(buildShopInfoHtml(shop));
          infoWindowRef.current?.open(mapInstanceRef.current, [shop.lng!, shop.lat!]);
          setActionMenu(null);
        });

        marker.setMap(mapInstanceRef.current);
        markersRef.current.push(marker);
      } catch {
        // Skip invalid markers silently
      }
    });

    if (validShops.length > 0 && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      try {
        mapInstanceRef.current.setFitView(markersRef.current);
      } catch {
        // Ignore fit view errors
      }
    }
  }, [shops, mapLoaded, selectedShopId]);

  // Fly to selected shop
  useEffect(() => {
    if (!flyToShop || !mapInstanceRef.current) return;
    if (typeof flyToShop.lng !== 'number' || typeof flyToShop.lat !== 'number') return;
    mapInstanceRef.current.setZoomAndCenter(16, [flyToShop.lng, flyToShop.lat], false, 300);
  }, [flyToShop]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ minHeight: '300px' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Re-pick mode hint banner */}
      {repickMode && mapLoaded && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-md z-20 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          点击地图选取新位置
        </div>
      )}

      {/* Search toggle button */}
      {mapLoaded && !showSearch && !repickMode && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute top-3 left-3 z-20 w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="搜索地点"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      {/* Search box */}
      <MapSearchBox
        visible={showSearch}
        onSearch={handleSearchWithMarkers}
        onPoiSelect={handlePoiSelect}
        onClose={handleCloseSearch}
        currentCity={currentCity}
        isAutoCity={cityMode === 'auto'}
        showCityPicker={showCityPicker}
        onToggleCityPicker={() => setShowCityPicker(v => !v)}
        onCitySelect={handleCitySelect}
        onAutoMode={handleAutoMode}
        onCloseCityPicker={() => setShowCityPicker(false)}
      />

      {/* Locate me button */}
      {mapLoaded && !repickMode && (
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="absolute bottom-4 right-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-60 transition-colors"
          aria-label="定位当前位置"
          title="定位到当前位置"
        >
          {locating ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2M2 12h2m16 0h2" />
            </svg>
          )}
        </button>
      )}

      {/* Locate error toast */}
      {locateError && (
        <div className="absolute bottom-16 right-4 z-20 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg shadow-md max-w-[200px]">
          {locateError}
        </div>
      )}

      {actionMenu && (
        <MapActionMenu
          x={actionMenu.x}
          y={actionMenu.y}
          lng={actionMenu.lng}
          lat={actionMenu.lat}
          address={actionAddress}
          addressLoading={addressLoading}
          onAddShop={handleAddShop}
          onClose={handleCloseMenu}
          nearbyShops={nearbyShops}
          onShopSelect={(shopId) => {
            const shop = shops.find(s => s.id === shopId);
            if (shop) onShopSelect?.(shop);
          }}
        />
      )}

      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
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
