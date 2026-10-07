import type { MergedShop } from './types/index';
import { escapeHtml, getCategoryColor } from './utils';

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * InfoWindow HTML. Shop fields are user-controlled and must be escaped;
 * the shop id is passed through a data attribute, never interpolated into JS.
 */
export function buildShopInfoHtml(shop: MergedShop): string {
  const parts: string[] = [];
  const name = escapeHtml(shop.name || '');
  const catColor = getCategoryColor(shop.category);
  const categoryHtml = shop.category
    ? `<span style="display:inline-block;padding:1px 8px;font-size:11px;border-radius:9999px;background:${catColor};color:white;margin-left:6px;vertical-align:middle">${escapeHtml(shop.category)}</span>`
    : '';
  parts.push(`<div style="font-size:14px;font-weight:600;color:#111827;line-height:1.4">${name}${categoryHtml}</div>`);

  const reviewCount = finite(shop.reviewCount);
  if (reviewCount > 0) {
    const r = finite(shop.avgRating);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (r >= i) {
        starsHtml += '<span style="color:#f59e0b">★</span>';
      } else if (r > i - 1) {
        const pct = Math.round((i - r) * 100);
        starsHtml += `<span style="position:relative;display:inline-block"><span style="color:#d1d5db">★</span><span style="position:absolute;top:0;left:0;color:#f59e0b;clip-path:inset(0 ${pct}% 0 0)">★</span></span>`;
      } else {
        starsHtml += '<span style="color:#d1d5db">★</span>';
      }
    }
    const ratingText = `${r.toFixed(1)} · ${Math.round(reviewCount)}条点评`;
    const priceText = shop.avgPrice != null && Number.isFinite(shop.avgPrice) ? ` · 人均¥${Math.round(shop.avgPrice)}` : '';
    parts.push(`<div style="margin-top:6px;display:flex;align-items:center;gap:6px"><span style="font-size:13px;letter-spacing:1px">${starsHtml}</span><span style="font-size:11px;color:#9ca3af">${escapeHtml(ratingText)}${escapeHtml(priceText)}</span></div>`);
  }

  if (shop.address) {
    parts.push(`<div style="font-size:12px;color:#9ca3af;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${escapeHtml(shop.address)}</div>`);
  }
  if (shop.phone) {
    parts.push(`<div style="font-size:12px;color:#6b7280;margin-top:4px">${escapeHtml(shop.phone)}</div>`);
  }
  if (shop.businessHours) {
    parts.push(`<div style="font-size:12px;color:#6b7280;margin-top:2px">${escapeHtml(shop.businessHours)}</div>`);
  }
  if (shop.tags && shop.tags.length > 0) {
    const tagsHtml = shop.tags.map((t) =>
      `<span style="display:inline-block;padding:1px 6px;font-size:11px;border-radius:3px;background:#f3f4f6;color:#6b7280;margin-right:3px;margin-bottom:2px">${escapeHtml(String(t))}</span>`
    ).join('');
    parts.push(`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:2px">${tagsHtml}</div>`);
  }

  const safeId = escapeHtml(shop.id || '');
  parts.push(`
    <div style="margin-top:10px;border-top:1px solid #f3f4f6;padding-top:8px;display:flex;gap:8px">
      <button type="button" data-shop-id="${safeId}" onclick="window.__mapShopDetail(this.getAttribute('data-shop-id'))"
        style="flex:1;padding:5px 0;font-size:12px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">查看详情</button>
      <button type="button" data-shop-id="${safeId}" onclick="window.__mapShopEdit(this.getAttribute('data-shop-id'))"
        style="flex:1;padding:5px 0;font-size:12px;background:#f3f4f6;color:#374151;border:none;border-radius:6px;cursor:pointer">编辑</button>
    </div>
  `);

  return `<div style="min-width:200px;max-width:280px;padding:2px">${parts.join('')}</div>`;
}
