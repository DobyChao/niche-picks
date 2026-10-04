# 小众点评 — 本轮需求（2026-10-04）

项目路径：/home/agentuser/projects/xiaozhong-review
构建规范：`npm run build` 必须以 agentuser 身份执行（当前已是 agentuser，直接执行即可）。
本机 E2E：`npx playwright test`（如现有用例涉及评分/主界面头部，需同步更新）。

## 需求 1：店铺列表栏新增「快捷推送」按钮

位置：`src/app/page.tsx` 店铺列表标题栏（"店铺列表" h2 + 刷新按钮所在的 flex 容器），
新按钮放在**刷新按钮的右边**，样式与刷新按钮完全一致（ghost 图标按钮：`p-2 text-muted hover:text-foreground hover:bg-primary-muted/50 rounded-[var(--radius-button)]`，图标 `h-5 w-5`）。

行为规格（全部要求实现）：
1. 数据源：复用 `src/lib/sync/push.ts` 的 `pushLocalChanges(token, authorName)`，身份取 `getSavedSyncIdentity()`（同 `src/components/sync/SyncPanel.tsx` 的用法，不要重写推送逻辑）。
2. 待推送计数：用 `useAllChanges()`（`src/lib/db`）统计。仅统计**有实际内容的变更**——判断逻辑参考 ChangeList 的分组：draft 状态算待推送；如果页面已有现成的"待推送条数"选择器/工具函数优先复用。徽标显示在图标右上角（absolute 定位小圆点+数字，超过 99 显示 99+）。
3. 状态机：
   - 待推送数 = 0 → 按钮 disabled，`title="没有待推送的变更"`，不显示徽标
   - 待推送数 > 0 → 可点击，`title="快捷推送"`，徽标显示条数
   - 推送中 → 图标 `animate-spin` + disabled（与刷新按钮 isPulling 的表现一致）
   - 未设置同步身份 → 点击时弹出与刷新一致的提示方式（页面已有 pullMessage 提示机制，复用 `setPullMessage('未设置同步身份')`）
   - 推送成功 → `setPullMessage('已推送 N 条变更')`；若 `result.autoApproved === true` 则追加自动刷新（调用 `autoPullIfReady()` 强制拉取，注意绕过节流——看 pull.ts 里是否有 force 参数，没有就加一个可选的 `force?: boolean`）
   - 推送失败 → `setPullMessage('推送失败: <err.message>')`
4. 图标：向上箭头（参考 SyncPanel 里推送按钮的 SVG：`M12 21V9m0 0l-4 4m4-4l4 4M4 3h16`）。
5. 移动端同样可见可用（按钮在标题栏，本身就在移动端布局内）。

## 需求 2：点评评分下限 0.5 → 0

文件：`src/components/review/ReviewForm.tsx`
- L50 校验：`rating < 0.5 || rating > 5` → `rating < 0 || rating > 5`，错误文案改为 `'评分必须在 0-5 之间'`
- L108 滑杆：`min="1"` → `min="0"`
- 保持：默认值 5 分不变；step 0.1 不变；StarRating 组件不用改（0 分自然显示空星）
- 检查 `src/components/ui/StarRating.tsx`：确认 0 分渲染不出错（0 除以任何数、空数组等边界），如有 bug 一并修复
- 全局搜索其它写死 0.5 下限的评分校验（如表单外的导入校验、admin 审核展示），一并对齐

## 需求 3：项目管理文档

在仓库根目录新建：
1. `CHANGELOG.md`：
   ```markdown
   # Changelog

   ## 2026-10-04
   - 店铺列表栏新增快捷推送按钮（待推送徽标计数、推送中动效、成功后自动审批时强制刷新）
   - 点评评分下限从 0.5 调整为 0（滑杆 min=0，校验文案同步）
   ```
2. `docs/BACKLOG.md`：需求池模板，含说明（如何添加/完成条目）和"已完成"分区把上面两条记录进去。

## 验收标准（必须全部满足才算完成）

1. `npm run build` 通过（agentuser 身份）
2. `npx playwright test` 通过（如有用例断言 0.5 下限需同步更新断言）
3. 本地起 dev server（port 3000）或直接对 build 产物做验证：
   - 主页面加载无控制台错误
   - 刷新按钮右侧出现推送按钮；无变更时禁用
   - 手工造一条草稿变更（如新建一个店铺不推送）→ 徽标出现数字 1 → 点击推送 → 成功消息 + 徽标消失
   - 点评表单滑杆能拉到 0 分并成功提交
4. 完成后把改动文件清单、测试输出摘要写进最终回复

## 注意

- 不要动 deploy 脚本和 systemd；部署由外部流程负责
- 提交 git：完成并验证后 commit（不 push），message 用中文概括本次改动
