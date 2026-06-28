'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ShopList from '@/components/shop/ShopList';
import ShopForm from '@/components/shop/ShopForm';
import ReviewForm from '@/components/review/ReviewForm';
import { useMergedShops, useMergedReviews, deleteShop, deleteReview, getOriginalShop, getOriginalReview } from '@/lib/db';
import type { MergedShop, MergedReview, ServerShop, ServerReview } from '@/lib/types';
import { autoPullIfReady } from '@/lib/sync/pull';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function HomePage() {
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShop, setEditingShop] = useState<MergedShop | undefined>(undefined);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
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
  const [isPulling, setIsPulling] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [mapMobileHeight, setMapMobileHeight] = useState<number | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startPos: number; startSize: number; pointerId: number; moved: boolean } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const shops = useMergedShops();
  const selectedShop = useMemo(
    () => (selectedShopId && shops ? shops.find((s) => s.id === selectedShopId) ?? null : null),
    [selectedShopId, shops],
  );
  const shopReviews = useMergedReviews(selectedShopId ?? undefined);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Background auto-pull on mount — silently refreshes if identity is saved and throttle window has elapsed.
  useEffect(() => {
    autoPullIfReady();
  }, []);

  // Auto-dismiss pull toast after 3 seconds.
  useEffect(() => {
    if (!pullMessage) return;
    const timer = setTimeout(() => setPullMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [pullMessage]);

  const handleRefresh = useCallback(async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const result = await autoPullIfReady();
      if (result.status === 'success') {
        setPullMessage(`已刷新 ${result.shopCount} 店 ${result.reviewCount} 点评`);
      } else if (result.status === 'skipped') {
        setPullMessage(result.reason === 'no-identity' ? '未设置同步身份' : '刚刚同步过，请稍后再试');
      } else {
        setPullMessage(`同步失败：${result.error}`);
      }
    } finally {
      setIsPulling(false);
    }
  }, [isPulling]);

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
  }, [selectedShopId]);

  const handleShopSaved = useCallback(() => {
    setShowShopForm(false);
    setEditingShop(undefined);
    setPrefilledFormData(null);
    setRepickMode(false);
    setRepickEditingShop(null);
  }, []);

  const handleShopClick = useCallback((shop: MergedShop) => {
    setSelectedShopId(shop.id);
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
    if (typeof editingShop.lng === 'number' && typeof editingShop.lat === 'number') {
      setFlyToShop(editingShop);
    }
  }, [editingShop]);

  const handleCancelRepick = useCallback(() => {
    if (repickEditingShop) {
      setEditingShop(repickEditingShop);
      setShowShopForm(true);
    }
    setRepickMode(false);
    setRepickEditingShop(null);
  }, [repickEditingShop]);

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
        setSelectedShopId(null);
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

  const renderStars = (rating: number) => <StarRating rating={rating} />;

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
          selectedShopId={selectedShopId}
          repickMode={repickMode}
          repickShopName={repickEditingShop?.name}
          onCancelRepick={handleCancelRepick}
          onShopSelect={(shop) => handleShopClick(shop)}
          onEditShop={(shop) => handleOpenEditShop(shop)}
        />
      </div>

      {/* Desktop resize handle with collapse toggle */}
      <div
        className="hidden md:flex relative w-1.5 bg-border/80 hover:bg-primary/60 active:bg-primary cursor-col-resize touch-none shrink-0"
        onPointerDown={handleDesktopPointerDown}
        onPointerMove={handleDesktopPointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setPanelCollapsed(!panelCollapsed); }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-surface border border-border rounded-[var(--radius-button)] shadow-[var(--shadow-card)] flex items-center justify-center hover:bg-primary-muted/50 hover:border-primary/30 transition-colors"
          title={panelCollapsed ? '展开面板' : '折叠面板'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={panelCollapsed ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className="relative overflow-hidden bg-surface shadow-[var(--shadow-card)]"
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
        <div className={cn('h-full flex flex-col', isDesktop && 'border-l border-border')}>
          <div
            className={cn(
              'flex-shrink-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-2',
              !isDesktop && 'cursor-row-resize touch-none',
            )}
            onPointerDown={handleMobilePointerDown}
            onPointerMove={handleMobilePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Hide title on mobile when a shop is selected so the action cluster has room. */}
            <div className="flex items-center gap-1 min-w-0">
              {(isDesktop || !selectedShop) && (
                <h2 className="text-lg font-semibold text-foreground shrink-0">
                  店铺列表
                </h2>
              )}
              <button
                onClick={handleRefresh}
                disabled={isPulling}
                className="p-2 text-muted hover:text-foreground hover:bg-primary-muted/50 rounded-[var(--radius-button)] transition-colors flex items-center justify-center disabled:opacity-50"
                title="刷新"
                aria-label="刷新"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isPulling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedShop ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedShopId(null);
                      setFlyToShop(null);
                      setShowReviewForm(false);
                    }}>
                    ← 返回列表
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleOpenEditShop(selectedShop)}>
                    编辑店铺
                  </Button>
                  <Button variant="soft-danger" size="sm" onClick={() => handleDeleteShop(selectedShop)}>
                    删除
                  </Button>
                </>
              ) : (
                isDesktop && (
                  <button
                    type="button"
                    onClick={handleOpenShopForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-primary-hover transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    新增店铺
                  </button>
                )
              )}
              {/* Mobile collapse chevron. closest('button') guard in handleMobilePointerDown lets taps reach onClick instead of starting a drag. */}
              {!isDesktop && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPanelCollapsed(true); }}
                  className="md:hidden p-2.5 -mr-2 text-muted hover:text-foreground hover:bg-primary-muted/50 rounded-[var(--radius-button)] transition-colors flex items-center justify-center"
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
                  <h1 className="text-xl font-bold text-foreground break-words leading-snug">
                    {selectedShop.name}
                  </h1>
                  {selectedShop.reviewCount > 0 && (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      {renderStars(selectedShop.avgRating ?? 0)}
                      <span className="text-foreground font-medium tabular-nums">{selectedShop.avgRating?.toFixed(1)}</span>
                      <span className="text-muted text-xs">({selectedShop.reviewCount}条)</span>
                      {selectedShop.avgPrice != null && (
                        <span className="text-muted text-xs">人均¥{Math.round(selectedShop.avgPrice)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Draft/Original Toggle */}
                {(selectedShop._syncBadge === 'draft' || selectedShop._syncBadge === 'pending') && (
                  <div className="flex items-center gap-2 p-2.5 bg-warning-muted border border-warning/20 rounded-[var(--radius-button)]">
                    <Badge variant="warning">
                      {selectedShop._syncBadge === 'draft' ? '有未提交的修改' : '修改同步中'}
                    </Badge>
                    {originalShopData ? (
                      <div className="flex-1 flex justify-end">
                        <button
                          onClick={() => setShowOriginalShop(!showOriginalShop)}
                          className="text-xs px-2.5 py-1 rounded-[var(--radius-button)] font-medium transition-colors bg-warning-muted text-warning hover:bg-warning/10"
                        >
                          {showOriginalShop ? '显示变更' : '显示原始'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-warning ml-auto">新创建</span>
                    )}
                  </div>
                )}

                {/* Shop Info */}
                <Card padding="md" className="bg-background space-y-2">
                  {(() => {
                    const displayShop = showOriginalShop && originalShopData ? originalShopData : selectedShop;
                    return (
                      <>
                        {displayShop.category && (
                          <Badge variant="default">{displayShop.category}</Badge>
                        )}
                        {displayShop.address && (
                          <p className="text-sm text-muted">{displayShop.address}</p>
                        )}
                        {displayShop.phone && (
                          <p className="text-sm text-muted">{displayShop.phone}</p>
                        )}
                        {displayShop.businessHours && (
                          <p className="text-sm text-muted">{displayShop.businessHours}</p>
                        )}
                        {displayShop.tags && displayShop.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {displayShop.tags.map((tag, i) => (
                              <Badge key={i} variant="muted">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </Card>

                {/* Reviews Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      点评 ({shopReviews?.length ?? 0})
                    </h3>
                    <Button size="sm" onClick={handleAddReview}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      写点评
                    </Button>
                  </div>

                  {showReviewForm && (
                    <Card padding="md" className="mb-4">
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        {editingReview ? '编辑点评' : '新增点评'}
                      </h4>
                      <ReviewForm
                        shopId={selectedShop.id}
                        review={editingReview}
                        onSubmit={handleReviewSaved}
                        onCancel={() => { setShowReviewForm(false); setEditingReview(undefined); }}
                      />
                    </Card>
                  )}

                  {(!shopReviews || shopReviews.length === 0) ? (
                    <div className="text-center py-8 text-muted">
                      <p className="text-sm">还没有点评</p>
                      <p className="text-xs mt-1">点击「写点评」分享你的体验</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shopReviews.map((review) => {
                        const isShowingOriginal = reviewOriginalIds.has(review.id);
                        const originalReview = isShowingOriginal ? originalReviewData.get(review.id) : null;
                        const displayReview = isShowingOriginal && originalReview ? originalReview : review;

                        return (
                          <Card key={review.id} padding="sm" className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm flex items-center gap-1.5">
                                {renderStars(displayReview.rating)}
                                <span className="text-muted font-medium tabular-nums">{displayReview.rating.toFixed(1)}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                {displayReview.avgPrice != null && (
                                  <span className="text-xs text-muted">¥{displayReview.avgPrice}/人</span>
                                )}
                                {(review._syncBadge === 'draft' || review._syncBadge === 'pending') && (
                                  <button
                                    onClick={() => toggleReviewOriginal(review)}
                                    className="text-xs px-1.5 py-0.5 rounded-[var(--radius-button)] bg-warning-muted text-warning hover:bg-warning/10 transition-colors"
                                  >
                                    {isShowingOriginal ? '显示变更' : '显示原始'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {displayReview.author && (
                              <p className="text-xs text-muted mb-1">{displayReview.author}</p>
                            )}
                            {displayReview.content && (
                              <p className="text-sm text-foreground whitespace-pre-wrap">{displayReview.content}</p>
                            )}
                            {displayReview.tags && displayReview.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {displayReview.tags.map((tag, i) => (
                                  <Badge key={i} variant="muted">{tag}</Badge>
                                ))}
                              </div>
                            )}
                            {displayReview.visitDate && (
                              <p className="text-xs text-muted mt-2">到访: {displayReview.visitDate}</p>
                            )}
                            <div className="flex justify-end mt-2 gap-3">
                              <button
                                onClick={() => handleEditReview(review)}
                                className="text-xs text-primary hover:text-primary-hover"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review)}
                                className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-[var(--radius-button)] border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </Card>
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
            className="md:hidden absolute bottom-6 right-6 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-[var(--shadow-elevated)] flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all"
            aria-label="新增店铺"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* Pull feedback toast */}
        {pullMessage && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 bg-foreground/90 text-background text-xs rounded-full shadow-[var(--shadow-elevated)] whitespace-nowrap pointer-events-none">
            {pullMessage}
          </div>
        )}
      </div>

      {/* Desktop expand button (when sidebar collapsed) */}
      {panelCollapsed && isDesktop && (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-16 bg-surface border border-border rounded-l-[var(--radius-card)] shadow-[var(--shadow-elevated)] items-center justify-center hover:bg-primary-muted/40 transition-colors"
          title="展开面板"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M17 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {panelCollapsed && !isDesktop && (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-surface border border-border rounded-full shadow-[var(--shadow-elevated)] items-center justify-center hover:bg-primary-muted/40 active:scale-95 transition-all text-sm text-muted font-medium flex gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          展开列表
        </button>
      )}

      {/* ShopForm modal */}
      {showShopForm && (
        <Modal
          open={showShopForm}
          onClose={() => { setShowShopForm(false); setEditingShop(undefined); setPrefilledFormData(null); setRepickMode(false); setRepickEditingShop(null); }}
          maxWidth="lg"
          className="max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <h3 className="text-lg font-semibold text-foreground">
              {editingShop ? '编辑店铺' : '新增店铺'}
            </h3>
            <button
              onClick={() => { setShowShopForm(false); setEditingShop(undefined); setPrefilledFormData(null); setRepickMode(false); setRepickEditingShop(null); }}
              className="p-1 rounded-full hover:bg-primary-muted/50 transition-colors text-muted"
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
        </Modal>
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
