import { test, expect } from '@playwright/test';

test.describe('小众点评 Basic E2E', () => {
  test('homepage loads with nav and main sections', async ({ page }) => {
    await page.goto('/');

    // Nav header
    await expect(page.locator('header')).toContainText('小众点评');
    await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
    await expect(page.getByRole('link', { name: '同步' })).toBeVisible();

    // Shop list sidebar header
    await expect(page.getByRole('heading', { name: '店铺列表' })).toBeVisible();

    // Map container is rendered
    const mapWrapper = page.locator('[class*="md:flex-1"]');
    await expect(mapWrapper).toBeVisible();
  });

  test('can add a shop via modal form', async ({ page }) => {
    await page.goto('/');

    // Click "新增店铺" button in sidebar header (desktop)
    await page.getByRole('button', { name: '新增店铺' }).click();

    // Modal heading should appear
    await expect(page.getByRole('heading', { name: '新增店铺', exact: true })).toBeVisible();
    await expect(page.locator('#shop-name')).toBeVisible();

    // Fill form
    await page.fill('#shop-name', '测试咖啡店');
    await page.fill('#shop-address', '北京市朝阳区测试路123号');
    await page.fill('#shop-category', '咖啡厅');
    await page.fill('#shop-phone', '13800138000');
    await page.fill('#shop-hours', '09:00-22:00');
    await page.fill('#shop-tags', '安静, WiFi');
    await page.fill('#shop-lng', '116.397');
    await page.fill('#shop-lat', '39.909');

    // Submit
    await page.getByRole('button', { name: '添加店铺' }).click();

    // Modal should close and shop appears in list
    await expect(page.locator('text=测试咖啡店')).toBeVisible();
    await expect(page.locator('text=咖啡厅')).toBeVisible();
  });

  test('can click shop card to view detail', async ({ page }) => {
    await page.goto('/');

    // Add a shop
    await page.getByRole('button', { name: '新增店铺' }).click();
    await page.fill('#shop-name', '可点击的店铺');
    await page.fill('#shop-lng', '116.4');
    await page.fill('#shop-lat', '39.9');
    await page.getByRole('button', { name: '添加店铺' }).click();

    // Click the shop card
    await page.locator('text=可点击的店铺').click();

    // Detail view shows shop name as heading and review controls
    await expect(page.getByRole('heading', { name: '可点击的店铺' })).toBeVisible();
    await expect(page.getByRole('button', { name: '← 返回列表' })).toBeVisible();
    await expect(page.getByRole('button', { name: '编辑店铺' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '点评 (0)' })).toBeVisible();
    await expect(page.getByRole('button', { name: '写点评' })).toBeVisible();
  });

  test('can add a review to a shop', async ({ page }) => {
    await page.goto('/');

    // Add a shop
    await page.getByRole('button', { name: '新增店铺' }).click();
    await page.fill('#shop-name', '有点评的店');
    await page.getByRole('button', { name: '添加店铺' }).click();

    // Enter shop detail
    await page.locator('text=有点评的店').click();

    // Open review form
    await page.getByRole('button', { name: '写点评' }).click();
    await expect(page.locator('#review-content')).toBeVisible();

    // Fill review — click 4th star
    const stars = page.locator('button >> text=★');
    await stars.nth(3).click();
    await page.fill('#review-content', '这家店环境不错，适合办公。');
    await page.fill('#review-author', '测试用户');
    await page.fill('#review-price', '60');
    await page.fill('#review-date', '2026-05-19');
    await page.fill('#review-tags', '环境好, 适合办公');

    // Submit
    await page.getByRole('button', { name: '提交点评' }).click();

    // Review appears
    await expect(page.locator('text=测试用户')).toBeVisible();
    await expect(page.locator('text=这家店环境不错')).toBeVisible();
    await expect(page.locator('text=环境好')).toBeVisible();
    await expect(page.locator('text=¥60/人')).toBeVisible();
  });

  test('can edit a shop', async ({ page }) => {
    await page.goto('/');

    // Add a shop
    await page.getByRole('button', { name: '新增店铺' }).click();
    await page.fill('#shop-name', '待编辑店铺');
    await page.fill('#shop-category', '餐厅');
    await page.getByRole('button', { name: '添加店铺' }).click();

    // Enter detail and click edit
    await page.locator('text=待编辑店铺').click();
    await page.getByRole('button', { name: '编辑店铺' }).click();

    // Modal with pre-filled form
    const modal = page.locator('[class*="rounded-2xl"]');
    await expect(modal.getByRole('heading', { name: '编辑店铺', exact: true })).toBeVisible();
    await expect(page.locator('#shop-name')).toHaveValue('待编辑店铺');

    // Update
    await page.fill('#shop-name', '已编辑店铺');
    await page.fill('#shop-category', '书店');
    await page.getByRole('button', { name: '更新店铺' }).click();

    // Go back to list and verify
    await page.getByRole('button', { name: '← 返回列表' }).click();
    await expect(page.locator('text=已编辑店铺')).toBeVisible();
    await expect(page.locator('text=书店')).toBeVisible();
  });

  test('search filters shops', async ({ page }) => {
    await page.goto('/');

    // Add two shops
    await page.getByRole('button', { name: '新增店铺' }).click();
    await page.fill('#shop-name', '面条馆');
    await page.fill('#shop-category', '餐厅');
    await page.getByRole('button', { name: '添加店铺' }).click();

    await page.getByRole('button', { name: '新增店铺' }).click();
    await page.fill('#shop-name', '茶空间');
    await page.fill('#shop-category', '茶馆');
    await page.getByRole('button', { name: '添加店铺' }).click();

    // Both visible
    await expect(page.locator('text=面条馆')).toBeVisible();
    await expect(page.locator('text=茶空间')).toBeVisible();

    // Search
    await page.fill('input[placeholder*="搜索"]', '面');
    await expect(page.locator('text=面条馆')).toBeVisible();
    await expect(page.locator('text=茶空间')).not.toBeVisible();

    // Clear
    await page.click('button:has-text("✕")');
    await expect(page.locator('text=茶空间')).toBeVisible();
  });

  test('map container is present with proper dimensions', async ({ page }) => {
    await page.goto('/');
    const mapArea = page.locator('[class*="md:flex-1"]');
    await expect(mapArea).toBeVisible();
    const box = await mapArea.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
  });
});
