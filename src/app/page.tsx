'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ShopList from '@/components/shop/ShopList';
import ShopForm from '@/components/shop/ShopForm';
import ReviewForm from '@/components/review/ReviewForm';
import type { LocalShop, LocalReview } from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function HomePage() {
  const [shops, setShops] = useState<LocalShop[]>([]);
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShop, setEditingShop] = useState<LocalShop | undefined>(undefined);
  const [selectedShop, setSelectedShop] = useState<LocalShop | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<LocalReview | undefined>(undefined);
  const [shopReviews, setShopReviews] = useState<LocalReview[]>([]);
  const [mapPickedCoords, setMapPickedCoords] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { db } = await import('@/lib/db');
      const allShops = await db.shops.filter((s) => !s.isDeleted).toArray();
      setShops(allShops);
    })();
  }, []);

  const refreshShops = useCallback(async () => {
    const { db } = await import('@/lib/db');
    const allShops = await db.shops.filter((s) => !s.isDeleted).toArray();
    setShops(allShops);
  }, []);

  const handleShopSaved = async () => {
    await refreshShops();
    setShowShopForm(false);
    setEditingShop(undefined);
  };

  const handleShopClick = (shop: LocalShop) => {
    setSelectedShop(shop);
    setEditingReview(undefined);
    setShowReviewForm(false);
    loadShopReviews(shop.id);
  };

  const loadShopReviews = async (shopId: string) => {
    const { db } = await import('@/lib/db');
    const reviews = await db.reviews
      .where('shopId')
      .equals(shopId)
      .filter((r) => !r.isDeleted)
      .toArray();
    setShopReviews(reviews);
  };

  const handleAddReview = () => {
    setEditingReview(undefined);
    setShowReviewForm(true);
  };

  const handleEditReview = (review: LocalReview) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleReviewSaved = async () => {
    setShowReviewForm(false);
    setEditingReview(undefined);
    if (selectedShop) {
      await loadShopReviews(selectedShop.id);
    }
  };

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setMapPickedCoords({ lng, lat });
  }, []);

  const handleOpenShopForm = () => {
    setEditingShop(undefined);
    setMapPickedCoords(null);
    setShowShopForm(true);
  };

  const handleOpenEditShop = (shop: LocalShop) => {
    setEditingShop(shop);
    setMapPickedCoords(null);
    setShowShopForm(true);
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full relative">
      {/* Desktop: Map on left (flex-1), Mobile: Map on top (40vh) */}
      <div className="h-[40vh] md:flex-1 md:min-h-0 relative">
        <MapView
          shops={shops}
          onMapClick={handleMapClick}
          pickMode={showShopForm}
        />
      </div>

      {/* Desktop: Fixed 420px sidebar on right */}
      <div className="flex-1 md:flex-none md:w-[420px] md:h-full overflow-y-auto bg-white border-l border-gray-200 shadow-sm">
        {/* Sidebar header with add button */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedShop ? selectedShop.name : '店铺列表'}
          </h2>
          {selectedShop ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedShop(null);
                  setShopReviews([]);
                  setShowReviewForm(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← 返回列表
              </button>
              <button
                onClick={() => handleOpenEditShop(selectedShop)}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                编辑店铺
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenShopForm}
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              新增店铺
            </button>
          )}
        </div>

        {/* Shop list or shop detail */}
        {selectedShop ? (
          <div className="p-4 space-y-4">
            {/* Shop Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {selectedShop.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedShop.category}
                </span>
              )}
              {selectedShop.address && (
                <p className="text-sm text-gray-600">📍 {selectedShop.address}</p>
              )}
              {selectedShop.phone && (
                <p className="text-sm text-gray-600">📞 {selectedShop.phone}</p>
              )}
              {selectedShop.businessHours && (
                <p className="text-sm text-gray-600">🕐 {selectedShop.businessHours}</p>
              )}
              {selectedShop.tags && selectedShop.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedShop.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  点评 ({shopReviews.length})
                </h3>
                <button
                  onClick={handleAddReview}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  写点评
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {editingReview ? '编辑点评' : '新增点评'}
                  </h4>
                  <ReviewForm
                    shopId={selectedShop.id}
                    review={editingReview}
                    onSubmit={handleReviewSaved}
                    onCancel={() => { setShowReviewForm(false); setEditingReview(undefined); }}
                  />
                </div>
              )}

              {/* Review List */}
              {shopReviews.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">还没有点评</p>
                  <p className="text-xs mt-1">点击"写点评"分享你的体验</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shopReviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-yellow-500 text-sm">{renderStars(review.rating)}</span>
                        {review.avgPrice != null && (
                          <span className="text-xs text-gray-500">¥{review.avgPrice}/人</span>
                        )}
                      </div>
                      {review.author && (
                        <p className="text-xs text-gray-500 mb-1">{review.author}</p>
                      )}
                      {review.content && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                      )}
                      {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {review.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {review.visitDate && (
                        <p className="text-xs text-gray-400 mt-2">到访: {review.visitDate}</p>
                      )}
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          编辑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ShopList onShopClick={handleShopClick} />
        )}
      </div>

      {/* Mobile floating add button */}
      {!selectedShop && (
        <button
          onClick={handleOpenShopForm}
          className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
          aria-label="新增店铺"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* ShopForm modal */}
      {showShopForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingShop ? '编辑店铺' : '新增店铺'}
              </h3>
              <button
                onClick={() => { setShowShopForm(false); setEditingShop(undefined); }}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                aria-label="关闭"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {showShopForm && !editingShop && (
              <p className="px-6 pt-3 text-xs text-blue-600 bg-blue-50 py-2">
                💡 提示：可以在地图上点击选取坐标
              </p>
            )}
            <div className="p-6">
              <ShopForm
                shop={editingShop}
                pickedCoords={mapPickedCoords}
                onSubmit={handleShopSaved}
                onCancel={() => { setShowShopForm(false); setEditingShop(undefined); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
