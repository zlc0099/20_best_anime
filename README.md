# 二十年番单 · 20 Best Anime

从 1990–2026 的 37 年里挑出 20 年，每年选一部最喜欢的动画，生成一张 1080 × 1920 的纯文字番单海报。

视觉小说（ADV）风格：浅色天空场景、半透明深色对话面板、彩色角色铭牌、L 形角饰与毛玻璃卡片。

纯前端，无后端，无账号。草稿存在浏览器本地，海报由 DOM 直接导出为 PNG。

- 仓库：<https://github.com/zlc0099/20_best_anime>
- 线上地址（启用 GitHub Pages 后）：<https://zlc0099.github.io/20_best_anime/>

## 本地运行

需要 Node.js 20 及以上。

```bash
npm install
npm run dev
```

打开终端提示的本地地址即可。

## 构建

```bash
npm run build
npm run preview
```

产物在 `dist/`。

## 部署到 GitHub Pages

1. 把仓库推到 <https://github.com/zlc0099/20_best_anime>。
2. 进入仓库 **Settings → Pages**。
3. **Build and deployment → Source** 选择 **GitHub Actions**。
4. 向 `main` 分支推送代码，工作流 `.github/workflows/deploy.yml` 会自动构建并发布到
   <https://zlc0099.github.io/20_best_anime/>。
5. 如果 Pages 尚未生效，在 **Actions → Deploy to GitHub Pages → Run workflow** 手动触发一次。

`vite.config.js` 已设置 `base: './'`，无需按仓库名改配置。

## 数据

已生成的年份数据在 `src/data/years/*.json`，随仓库一起发布，页面运行时不请求任何数据接口。

想更新数据：

```bash
npm run data                # 全量刷新 1990–2026
npm run data -- --year=2026 # 只刷新某一年
npm run data -- --refresh   # 忽略本地缓存重新请求
```

脚本会：

- 从 unpkg 下载 `bangumi-data`，取简体中文名与 Bangumi 条目 ID；
- 按年请求 AniList GraphQL，拿评分、热度、首播日期、集数、格式和封面；
- 按 AniList ID → MAL ID → 规范化日文标题的顺序合并中文名；
- 输出按年拆分的 JSON 与 `src/data/meta.json`。

原始响应缓存在 `.cache/`（已 gitignore），中断后重跑会从断点继续。AniList 有速率限制，全量刷新大约需要 20–40 分钟。

### 数据来源与许可

- 元数据、评分、封面：[AniList](https://anilist.co)
- 简体中文名：[bangumi-data](https://github.com/bangumi-data/bangumi-data)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

封面仅用于站内识别，不会进入导出海报。海报只包含文字与年份。

## 结构

```
src/
├─ App.vue                 步骤路由、页头、确认与提示
├─ components/
│  ├─ IntroStep.vue        昵称
│  ├─ YearStep.vue         37 选 20
│  ├─ PickStep.vue         按年选片
│  ├─ PosterStep.vue       海报预览与导出
│  ├─ PosterCanvas.vue     1080 × 1920 海报本体
│  ├─ ToastBar.vue
│  └─ ConfirmDialog.vue
├─ composables/            草稿、数据加载、Toast、确认框
├─ utils/anime.js          标题/格式/海报字号
├─ data/                   已生成的番剧数据
└─ styles/app.css
scripts/fetch-data.mjs     数据生成脚本
```

## 说明

- 年份按 AniList 的播出年份归档；包含 TV、TV 短篇、剧场版、OVA、ONA、特别篇，排除 MUSIC 与成人内容。
- 2026 年只包含目前已收录的作品。
- 早期冷门作品可能没有简体中文名，会回退显示日文原名；搜索支持中文名、日文名和罗马音。
- 导出使用 [`html-to-image`](https://github.com/bubkoo/html-to-image)，海报不含外部图片，因此不受 Canvas 跨域限制。
