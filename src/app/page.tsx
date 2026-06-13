'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ShopList from '@/components/shop/ShopList';
import ShopForm from '@/components/shop/ShopForm';
import ReviewForm from '@/components/review/ReviewForm';
import { useMergedShops, useMergedReviews, deleteShop, deleteReview, getOriginalShop, getOriginalReview } from '@/lib/db';
import type { MergedShop, MergedReview, ServerShop, ServerReview } from '@/lib/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function HomePage() {
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShop, setEditingShop] = useState<MergedShop | undefined>(undefined);
  const [selectedShop, setSelectedShop] = useState<MergedShop | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<MergedReview | undefined>(undefined);
  const [flyToShop, setFlyToShop] = useState<MergedShop | null>(null);
  const [prefilledFormData, setPrefilledFormData] = useState<{
    lng: number;
    lat: number;
    address: string;
    name?: string;
    category?: string;
    phone?: string;
    amapPoiId?: string;
  } | null>(null);
  const [showOriginalShop, setShowOriginalShop] = useState(false);
  const [originalShopData, setOriginalShopData] = useState<ServerShop | null>(null);
  const [reviewOriginalIds, setReviewOriginalIds] = useState<Set<string>>(new Set());
  const [originalReviewData, setOriginalReviewData] = useState<Map<string, ServerReview>>(new Map());
  const [repickMode, setRepickMode] = useState(false);
  const [repickEditingShop, setRepickEditingShop] = useState<MergedShop | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [mapMobileHeight, setMapMobileHeight] = useState<number | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startPos: number; startSize: number; pointerId: number; moved: boolean } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const SIDEBAR_MIN = 280;
  const SIDEBAR_MAX = 600;

  const handleDesktopPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (panelCollapsed) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startPos: e.clientX, startSize: sidebarWidth, pointerId: e.pointerId, moved: false };
  }, [panelCollapsed, sidebarWidth]);

  const handleDesktopPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - dragRef.current.startPos);
    if (dx > 5) {
      dragRef.current.moved = true;
      setIsDragging(true);
      const delta = dragRef.current.startPos - e.clientX;
      setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragRef.current.startSize + delta)));
    }
  }, []);

  const handleMobilePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDesktop || panelCollapsed) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startSize = mapMobileHeight ?? window.innerHeight * 0.4;
    dragRef.current = { startPos: e.clientY, startSize, pointerId: e.pointerId, moved: false };
  }, [isDesktop, panelCollapsed, mapMobileHeight]);

  const handleMobilePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const dy = Math.abs(e.clientY - dragRef.current.startPos);
    if (dy > 5) {
      dragRef.current.moved = true;
      setIsDragging(true);
      const delta = e.clientY - dragRef.current.startPos;
      setMapMobileHeight(Math.max(80, Math.min(window.innerHeight * 0.8, dragRef.current.startSize + delta)));
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  // Load original shop data when toggled
  useEffect(() => {
    if (selectedShop && showOriginalShop && (selectedShop._syncBadge === 'draft' || selectedShop._syncBadge === 'pending')) {
      getOriginalShop(selectedShop.id).then(setOriginalShopData);
    } else {
      setOriginalShopData(null);
    }
  }, [selectedShop, showOriginalShop]);

  // Reset toggle when shop changes
  useEffect(() => {
    setShowOriginalShop(false);
    setReviewOriginalIds(new Set());
    setOriginalReviewData(new Map());
  }, [selectedShop?.id]);

  const shops = useMergedShops();
  const shopReviews = useMergedReviews(selectedShop?.id);

  const handleShopSaved = useCallback(() => {
    setShowShopForm(false);
    setEditingShop(undefined);
    setPrefilledFormData(null);
    setRepickMode(false);
    setRepickEditingShop(null);
  }, []);

  const handleShopClick = useCallback((shop: MergedShop) => {
    setSelectedShop(shop);
    setEditingReview(undefined);
    setShowReviewForm(false);
    setFlyToShop(shop);
    setPanelCollapsed(false);
  }, []);

  const handleAddReview = useCallback(() => {
    setEditingReview(undefined);
    setShowReviewForm(true);
  }, []);

  const handleEditReview = useCallback((review: MergedReview) => {
    setEditingReview(review);
    setShowReviewForm(true);
  }, []);

  const handleReviewSaved = useCallback(() => {
    setShowReviewForm(false);
    setEditingReview(undefined);
  }, []);

  const handleMapActionAddShop = useCallback((data: {
    lng: number; lat: number; address: string;
    name?: string; category?: string; phone?: string; amapPoiId?: string;
  }) => {
    if (repickMode && repickEditingShop) {
      // Re-pick flow: reopen form with updated coords
      setPrefilledFormData(data);
      setEditingShop(repickEditingShop);
      setRepickMode(false);
      setRepickEditingShop(null);
      setShowShopForm(true);
    } else {
      // Normal flow: create new shop
      setPrefilledFormData(data);
      setEditingShop(undefined);
      setShowShopForm(true);
    }
  }, [repickMode, repickEditingShop]);

  const handleRepickLocation = useCallback(() => {
    if (!editingShop) return;
    setRepickEditingShop(editingShop);
    setShowShopForm(false);
    setRepickMode(true);
  }, [editingShop]);

  const handleOpenShopForm = useCallback(() => {
    setEditingShop(undefined);
    setPrefilledFormData(null);
    setShowShopForm(true);
  }, []);

  const handleOpenEditShop = useCallback((shop: MergedShop) => {
    setEditingShop(shop);
    setPrefilledFormData(null);
    setShowShopForm(true);
  }, []);

  const handleDeleteShop = useCallback(async (shop: MergedShop) => {
    setConfirmState({
      title: '删除店铺',
      message: `确定要删除「${shop.name}」吗？删除后无法恢复。`,
      onConfirm: async () => {
        setConfirmState(null);
        await deleteShop(shop.id);
        setSelectedShop(null);
        setShowReviewForm(false);
      },
    });
  }, []);

  const handleDeleteReview = useCallback(async (review: MergedReview) => {
    setConfirmState({
      title: '删除点评',
      message: '确定要删除这条点评吗？删除后无法恢复。',
      onConfirm: async () => {
        setConfirmState(null);
        await deleteReview(review.id);
      },
    });
  }, []);

  const toggleReviewOriginal = useCallback(async (review: MergedReview) => {
    setReviewOriginalIds((prev) => {
      const next = new Set(prev);
      if (next.has(review.id)) {
        next.delete(review.id);
      } else {
        next.add(review.id);
        getOriginalReview(review.id).then((data) => {
          if (data) {
            setOriginalReviewData((prev) => {
              const next = new Map(prev);
              next.set(review.id, data);
              return next;
            });
          }
        });
      }
      return next;
    });
  }, []);

  const renderStars = (rating: number) => {
    return (
      <>
        {[1, 2, 3, 4, 5].map((i) =>
          rating >= i ? (
            <span key={i} className="text-yellow-400">★</span>
          ) : rating > i - 1 ? (
            <span key={i} className="relative inline-block">
              <span className="text-gray-300">★</span>
              <span className="absolute top-0 left-0 text-yellow-400" style={{ clipPath: `inset(0 ${(i - rating) * 100}% 0 0)` }}>★</span>
            </span>
          ) : (
            <span key={i} className="text-gray-300">★</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full relative">
      {/* Map */}
      <div
        className="relative overflow-hidden"
        style={isDesktop
          ? { flex: '1 1 0%', minWidth: 0, height: '100%' }
          : { height: panelCollapsed ? '100%' : (mapMobileHeight ?? '40vh'), flex: 'none', width: '100%' }
        }
      >
        <MapView
          shops={shops ?? []}
          onMapActionAddShop={handleMapActionAddShop}
          flyToShop={flyToShop}
          selectedShopId={selectedShop?.id ?? null}
          repickMode={repickMode}
          onShopSelect={(shop) => handleShopClick(shop)}
          onEditShop={(shop) => handleOpenEditShop(shop)}
        />
      </div>

      {/* Desktop resize handle with collapse toggle */}
      <div
        className="hidden md:flex relative w-1.5 bg-gray-200/80 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize touch-none shrink-0"
        onPointerDown={handleDesktopPointerDown}
        onPointerMove={handleDesktopPointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setPanelCollapsed(!panelCollapsed); }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-center hover:bg-gray-50 hover:border-blue-300 transition-colors"
          title={panelCollapsed ? '展开面板' : '折叠面板'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={panelCollapsed ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className="relative overflow-hidden bg-white shadow-sm"
        style={isDesktop
          ? {
              width: panelCollapsed ? 0 : sidebarWidth,
              height: '100%',
              flex: 'none',
              transition: isDragging ? 'none' : 'width 200ms ease',
            }
          : {
              flex: panelCollapsed ? 'none' : '1 1 0%',
              height: panelCollapsed ? 0 : undefined,
              minHeight: 0,
              overflow: 'hidden',
              transition: isDragging ? 'none' : 'height 200ms ease',
            }
        }
      >
        <div className={`h-full flex flex-col ${isDesktop ? 'border-l border-gray-200' : ''}`}>
          {/* Sidebar header doubles as the mobile drag-to-resize handle. handleMobilePointerDown early-returns on desktop. */}
          <div
            className={`flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-2 ${!isDesktop ? 'cursor-row-resize touch-none' : ''}`}
            onPointerDown={handleMobilePointerDown}
            onPointerMove={handleMobilePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Hide title on mobile when a shop is selected so the action cluster has room. */}
            {(isDesktop || !selectedShop) && (
              <h2 className="text-lg font-semibold text-gray-800 shrink-0">
                店铺列表
              </h2>
            )}
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedShop ? (
                <>
                  <button
                    onClick={() => {
                      setSelectedShop(null);
                      setFlyToShop(null);
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
                  <button
                    onClick={() => handleDeleteShop(selectedShop)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    删除
                  </button>
                </>
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
              {/* Mobile collapse chevron. closest('button') guard in handleMobilePointerDown lets taps reach onClick instead of starting a drag. */}
              {!isDesktop && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPanelCollapsed(true); }}
                  className="md:hidden p-2.5 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="折叠列表"
                  aria-label="折叠列表"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {selectedShop ? (
              <div className="p-4 space-y-4">
                {/* Shop name (title) + rating summary */}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 break-words leading-tight">
                    {selectedShop.name}
                  </h1>
                  {selectedShop.reviewCount > 0 && (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-amber-500">{renderStars(selectedShop.avgRating ?? 0)}</span>
                      <span className="text-gray-600 font-medium tabular-nums">{selectedShop.avgRating?.toFixed(1)}</span>
                      <span className="text-gray-400 text-xs">({selectedShop.reviewCount}条)</span>
                      {selectedShop.avgPrice != null && (
                        <span className="text-gray-400 text-xs">人均¥{Math.round(selectedShop.avgPrice)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Draft/Original Toggle */}
                {(selectedShop._syncBadge === 'draft' || selectedShop._syncBadge === 'pending') && (
                  <div className="flex items-center gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-xs text-yellow-700 font-medium">
                      {selectedShop._syncBadge === 'draft' ? '有未提交的修改' : '修改同步中'}
                    </span>
                    {originalShopData ? (
                      <div className="flex-1 flex justify-end">
                        <button
                          onClick={() => setShowOriginalShop(!showOriginalShop)}
                          className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        >
                          {showOriginalShop ? '显示变更' : '显示原始'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-yellow-600 ml-auto">新创建</span>
                    )}
                  </div>
                )}

                {/* Shop Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {(() => {
                    const displayShop = showOriginalShop && originalShopData ? originalShopData : selectedShop;
                    return (
                      <>
                        {displayShop.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {displayShop.category}
                          </span>
                        )}
                        {displayShop.address && (
                          <p className="text-sm text-gray-600">📍 {displayShop.address}</p>
                        )}
                        {displayShop.phone && (
                          <p className="text-sm text-gray-600">📞 {displayShop.phone}</p>
                        )}
                        {displayShop.businessHours && (
                          <p className="text-sm text-gray-600">🕐 {displayShop.businessHours}</p>
                        )}
                        {displayShop.tags && displayShop.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {displayShop.tags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Reviews Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      点评 ({shopReviews?.length ?? 0})
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
                  {(!shopReviews || shopReviews.length === 0) ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">还没有点评</p>
                      <p className="text-xs mt-1">点击"写点评"分享你的体验</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shopReviews.map((review) => {
                        const isShowingOriginal = reviewOriginalIds.has(review.id);
                        const originalReview = isShowingOriginal ? originalReviewData.get(review.id) : null;
                        const displayReview = isShowingOriginal && originalReview ? originalReview : review;

                        return (
                          <div
                            key={review.id}
                            className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm flex items-center gap-1.5">
                                {renderStars(displayReview.rating)}
                                <span className="text-gray-500 font-medium tabular-nums">{displayReview.rating.toFixed(1)}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                {displayReview.avgPrice != null && (
                                  <span className="text-xs text-gray-500">¥{displayReview.avgPrice}/人</span>
                                )}
                                {(review._syncBadge === 'draft' || review._syncBadge === 'pending') && (
                                  <button
                                    onClick={() => toggleReviewOriginal(review)}
                                    className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                                  >
                                    {isShowingOriginal ? '显示变更' : '显示原始'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {displayReview.author && (
                              <p className="text-xs text-gray-500 mb-1">{displayReview.author}</p>
                            )}
                            {displayReview.content && (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayReview.content}</p>
                            )}
                            {displayReview.tags && displayReview.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {displayReview.tags.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {displayReview.visitDate && (
                              <p className="text-xs text-gray-400 mt-2">到访: {displayReview.visitDate}</p>
                            )}
                            <div className="flex justify-end mt-2 gap-3">
                              <button
                                onClick={() => handleEditReview(review)}
                                className="text-xs text-blue-500 hover:text-blue-700"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <ShopList onShopClick={handleShopClick} />
            )}
          </div>
        </div>

        {/* Mobile FAB (inside sidebar, absolute positioned) */}
        {!selectedShop && (
          <button
            onClick={handleOpenShopForm}
            className="md:hidden absolute bottom-6 right-6 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
            aria-label="新增店铺"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Desktop expand button (when sidebar collapsed) */}
      {panelCollapsed && isDesktop && (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-16 bg-white border border-gray-200 rounded-l-lg shadow-md items-center justify-center hover:bg-gray-50 transition-colors"
          title="展开面板"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M17 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Mobile expand button (when sidebar collapsed) */}
      {panelCollapsed && !isDesktop && (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-sm text-gray-600 font-medium flex gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          展开列表
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
                onClick={() => { setShowShopForm(false); setEditingShop(undefined); setPrefilledFormData(null); setRepickMode(false); setRepickEditingShop(null); }}
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
                shop={editingShop}
                prefilledData={prefilledFormData}
                onSubmit={handleShopSaved}
                onCancel={() => { setShowShopForm(false); setEditingShop(undefined); setPrefilledFormData(null); setRepickMode(false); setRepickEditingShop(null); }}
                onRepickLocation={editingShop ? handleRepickLocation : undefined}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        confirmText="删除"
        variant="danger"
        onConfirm={confirmState?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
