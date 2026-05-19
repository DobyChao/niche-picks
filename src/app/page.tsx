'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ShopList from '@/components/shop/ShopList';
import ShopForm from '@/components/shop/ShopForm';

// Dynamic import MapView to avoid SSR issues with map libraries
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [shops, setShops] = useState<any[]>([]);

  // Load shops from Dexie on mount
  useEffect(() => {
    (async () => {
      const { db } = await import('@/lib/db');
      const allShops = await db.shops.toArray();
      setShops(allShops);
    })();
  }, []);

  const handleShopAdded = async () => {
    const { db } = await import('@/lib/db');
    const allShops = await db.shops.toArray();
    setShops(allShops);
    setShowForm(false);
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full relative">
      {/* Desktop: Map on left (flex-1), Mobile: Map on top (40vh) */}
      <div className="h-[40vh] md:flex-1 md:min-h-0 relative">
        <MapView shops={shops} />
      </div>

      {/* Desktop: Fixed 420px sidebar on right */}
      <div className="flex-1 md:flex-none md:w-[420px] md:h-full overflow-y-auto bg-white border-l border-gray-200 shadow-sm">
        {/* Sidebar header with add button */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">店铺列表</h2>
          <button
            onClick={() => setShowForm(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新增店铺
          </button>
        </div>

        {/* Shop list */}
        <ShopList />
      </div>

      {/* Mobile floating add button */}
      <button
        onClick={() => setShowForm(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        aria-label="新增店铺"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* ShopForm modal/panel overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">新增店铺</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                aria-label="关闭"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ShopForm
                onSubmit={handleShopAdded}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
