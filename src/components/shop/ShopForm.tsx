'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { addShop, updateShop } from '@/lib/db';
import type { MergedShop } from '@/lib/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface PrefilledData {
  lng: number;
  lat: number;
  address: string;
  name?: string;
  category?: string;
  phone?: string;
  amapPoiId?: string;
}

interface ShopFormProps {
  shop?: MergedShop;
  prefilledData?: PrefilledData | null;
  onSubmit?: () => void;
  onCancel?: () => void;
  onRepickLocation?: () => void;
}

interface FormErrors {
  name?: string;
  lng?: string;
  lat?: string;
  general?: string;
}

interface PoiSuggestion {
  name: string;
  address: string;
  category?: string;
  phone?: string;
  amapPoiId?: string;
  lng: number;
  lat: number;
}

export default function ShopForm({ shop, prefilledData, onSubmit, onCancel, onRepickLocation }: ShopFormProps) {
  const isEditing = !!shop;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [lng, setLng] = useState('');
  const [lat, setLat] = useState('');
  const [amapPoiId, setAmapPoiId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [suggestions, setSuggestions] = useState<PoiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const placeSearchRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap) return;
    AMap.plugin(['AMap.PlaceSearch'], () => {
      placeSearchRef.current = new AMap.PlaceSearch({ pageSize: 10, extensions: 'all' });
    });
  }, []);

  useEffect(() => {
    if (shop) {
      setName(shop.name ?? '');
      setAddress(shop.address ?? '');
      setCategory(shop.category ?? '');
      setPhone(shop.phone ?? '');
      setBusinessHours(shop.businessHours ?? '');
      setTagsInput(shop.tags?.join(', ') ?? '');
      setLng(shop.lng?.toString() ?? '');
      setLat(shop.lat?.toString() ?? '');
      setAmapPoiId(shop.amapPoiId ?? '');
    }
  }, [shop]);

  useEffect(() => {
    if (prefilledData) {
      setLng(prefilledData.lng.toFixed(6));
      setLat(prefilledData.lat.toFixed(6));
      if (prefilledData.address) setAddress(prefilledData.address);
      if (!shop) {
        if (prefilledData.name) setName(prefilledData.name);
        if (prefilledData.category) setCategory(prefilledData.category);
        if (prefilledData.phone) setPhone(prefilledData.phone);
        if (prefilledData.amapPoiId) setAmapPoiId(prefilledData.amapPoiId);
      } else if (prefilledData.amapPoiId) {
        setAmapPoiId(prefilledData.amapPoiId);
      }
    }
  }, [prefilledData, shop]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = useCallback((keyword: string) => {
    const AMap = (window as any).AMap;
    if (!AMap) return;

    const lngNum = Number(lng);
    const latNum = Number(lat);
    const hasCoords = !isNaN(lngNum) && !isNaN(latNum) && lngNum !== 0;
    if (!hasCoords) { setSuggestions([]); setSuggestLoading(false); return; }
    if (!placeSearchRef.current) return;

    const radius = keyword.trim() ? 2000 : 500;
    placeSearchRef.current.searchNearBy(keyword.trim(), [lngNum, latNum], radius, (status: string, result: any) => {
      setSuggestLoading(false);
      if (status === 'complete' && result?.poiList?.pois) {
        const items: PoiSuggestion[] = result.poiList.pois.map((poi: any) => ({
          name: poi.name || '',
          address: poi.address || poi.pname + poi.cityname + poi.adname || '',
          category: poi.type ? poi.type.split(';')[0] : undefined,
          phone: poi.tel || undefined,
          amapPoiId: poi.id || undefined,
          lng: poi.location?.lng ?? lngNum,
          lat: poi.location?.lat ?? latNum,
        }));
        setSuggestions(items.slice(0, 8));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    });
  }, [lng, lat]);

  const handleNameFocus = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSuggestLoading(true);
    debounceRef.current = setTimeout(() => fetchSuggestions(name), name.trim() ? 1000 : 300);
  }, [name, fetchSuggestions]);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      const lngNum = Number(lng);
      const latNum = Number(lat);
      if (!isNaN(lngNum) && !isNaN(latNum) && lngNum !== 0) {
        setSuggestLoading(true);
        debounceRef.current = setTimeout(() => fetchSuggestions(''), 1000);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    setSuggestLoading(true);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 1000);
  }, [lng, lat, fetchSuggestions]);

  const handleSelectSuggestion = useCallback((poi: PoiSuggestion) => {
    setName(poi.name);
    if (poi.address) setAddress(poi.address);
    if (poi.category) setCategory(poi.category);
    if (poi.phone) setPhone(poi.phone);
    if (poi.amapPoiId) setAmapPoiId(poi.amapPoiId);
    if (poi.lng && poi.lat) {
      setLng(poi.lng.toFixed(6));
      setLat(poi.lat.toFixed(6));
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = '店铺名称不能为空';
    if (lng && isNaN(Number(lng))) newErrors.lng = '经度必须是有效数字';
    if (lat && isNaN(Number(lat))) newErrors.lat = '纬度必须是有效数字';
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = tagsInput.split(/[,，]/).map((t) => t.trim()).filter((t) => t.length > 0);
      const shopData = {
        name: name.trim(),
        address: address.trim() || undefined,
        category: category.trim() || undefined,
        phone: phone.trim() || undefined,
        businessHours: businessHours.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        lng: lng ? Number(lng) : undefined,
        lat: lat ? Number(lat) : undefined,
        amapPoiId: amapPoiId || undefined,
        photos: [] as string[],
        updatedAt: new Date().toISOString(),
      };

      if (isEditing && shop) {
        await updateShop(shop.id, shopData);
        setSuccessMessage('店铺信息已更新');
      } else {
        await addShop({ ...shopData, createdAt: new Date().toISOString() } as any);
        setSuccessMessage('店铺已创建');
      }

      onSubmit?.();
    } catch (err) {
      setErrors({ general: `保存失败: ${err instanceof Error ? err.message : '未知错误'}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && <Toast variant="success">✓ {successMessage}</Toast>}
      {errors.general && <Toast variant="error">✕ {errors.general}</Toast>}

      <div ref={wrapperRef} className="relative">
        <label htmlFor="shop-name" className="block text-sm font-medium text-foreground mb-1">
          店铺名称 <span className="text-red-500">*</span>
        </label>
        <input
          id="shop-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={handleNameFocus}
          placeholder="输入店铺名称"
          autoComplete="off"
          className={cn(
            'w-full px-3 py-2 bg-surface border rounded-[var(--radius-button)] text-sm text-foreground',
            'placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
            errors.name ? 'border-red-400 bg-red-50/50' : 'border-border',
          )}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}

        {showSuggestions && (suggestLoading || suggestions.length > 0) && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] max-h-[200px] overflow-y-auto">
            {suggestLoading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-xs text-muted">搜索中...</span>
              </div>
            )}
            {suggestions.map((poi, i) => (
              <button
                key={poi.amapPoiId ?? i}
                type="button"
                onClick={() => handleSelectSuggestion(poi)}
                className="w-full text-left px-3 py-2 hover:bg-primary-muted/60 transition-colors border-b border-border/50 last:border-b-0"
              >
                <div className="text-sm font-medium text-foreground truncate">{poi.name}</div>
                <div className="text-xs text-muted truncate mt-0.5">{poi.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Input id="shop-address" label="地址" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="输入店铺地址" />
      <Input id="shop-category" label="分类" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="如：餐厅、咖啡厅、书店" />
      <Input id="shop-phone" label="电话" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="联系电话" />
      <Input id="shop-hours" label="营业时间" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="如：09:00-22:00" />
      <Input id="shop-tags" label="标签" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="用逗号分隔，如：安静, 适合工作, WiFi" hint="多个标签用逗号分隔" />

      <div className="grid grid-cols-2 gap-3">
        <Input id="shop-lng" label="经度 (lng)" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="116.397" error={errors.lng} />
        <Input id="shop-lat" label="纬度 (lat)" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="39.909" error={errors.lat} />
      </div>

      {isEditing && onRepickLocation && (
        <Button type="button" variant="ghost" size="sm" onClick={onRepickLocation} className="text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          从地图重新选取位置
        </Button>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? '保存中...' : isEditing ? '更新店铺' : '添加店铺'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  );
}
