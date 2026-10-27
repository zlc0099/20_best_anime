# 二十年番单 · 20 Best Anime

从 1990–2026 的 37 年里挑出 10–20 年，每年从热度前 20 部里选一部最喜欢的动画，生成一张宽 1440 px、5 列、行数随作品数量变化的封面番单海报。

填写昵称后有三种玩法：**自选年份**、**随机 10 / 15 / 20 年**直接进入选动画，以及**动漫大乱斗**——32 部随机对阵，32 强打到决赛，每场二选一，最后导出完整冠军对阵图。

视觉是档案 / 编辑部风格的双主题：深色（#0b0d0f + 橙色强调）与纸质（#f2efe9 + 衬线标题），Barlow Condensed 标题、Inter 正文、JetBrains Mono 标签，1 px 分隔线、圆角不超过 3 px；主题存在 localStorage，首帧不闪色。

番单流程仍是纯前端；“大家都在看”榜单是可选功能，接入 Supabase（匿名提交年份与作品 ID，不含昵称），未配置环境变量时整块隐藏。

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
npm run data                # 刷新 1990–2026（每年热度前 20）
npm run data -- --year=2026 # 只刷新某一年
npm run data -- --refresh   # 忽略本地缓存重新请求
```

脚本会：

- 从 unpkg 下载 `bangumi-data`，取简体中文名与 Bangumi 条目 ID；
- 按年请求 AniList GraphQL 热度榜，拿评分、热度、首播日期、集数、格式和封面；
- 按 AniList ID → MAL ID → 规范化日文标题的顺序合并中文名；
- 每年按热度保留前 20 部，输出按年拆分的 JSON 与 `src/data/meta.json`；
- 同时输出大乱斗候选池 `src/data/battle/all.json`（每年前 50、含 `year` 字段，共约 1830 部）与 `src/data/battle/meta.json`，仅在进入大乱斗时按需加载。

站点番单数据共 37 年 × 20 部 = 740 部。原始响应缓存在 `.cache/`（已 gitignore），中断后重跑会从断点继续。AniList 有速率限制，刷新大约需要 2–5 分钟。

### 数据来源与许可

- 元数据、评分、封面：[AniList](https://anilist.co)
- 简体中文名：[bangumi-data](https://github.com/bangumi-data/bangumi-data)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

封面会随海报一起导出，仅用于个人番单记录；页面与海报保留 AniList / bangumi-data 署名。

### 不收录的作品

`src/utils/anime.js` 的 `isExcludedTitle` 是一份显式排除清单：《我的英雄学院》系列（含剧场版与衍生作）因作者以侵华日军部队番号“731”命名反派单位、作品在大陆下架，不进入数据、搜索与榜单。生成数据时会用该年下一部热度的作品补足名额，因此每年仍是 20 部。

## 众人榜单（可选）

首页与海报页下方的“大家都在看”来自 Supabase：

1. 在 Supabase 的 SQL Editor 里执行一次 `supabase/schema.sql`（两张表 + 两个 RPC + RLS，匿名只能写入与读取聚合结果）；
2. 配置环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（只需 publishable / anon key，**绝不能**放 `service_role`）。本地写 `.env.local`（已 gitignore）；线上在仓库 **Settings → Secrets and variables → Actions** 里新增同名 Variables 或 Secrets，`.github/workflows/deploy.yml` 会自动注入构建，两处都支持、变量优先。改完在 **Actions → Deploy to GitHub Pages → Run workflow** 重跑一次生效；
3. 生成海报时匿名提交一次 `{年份, 作品 ID}`，不含昵称，可在首页取消勾选；
4. 占比 = 该作品被选次数 ÷ 该年代总选择次数；样本少于 30 份会标注“样本还少”。

缺少环境变量时，榜单与提交逻辑整体关闭，站点仍是纯静态。

## 动漫大乱斗

- 三种开局：按年份范围（1990–2026 任选区间）随机抽 32 部、全年代随机 32 部，或自己从候选池点选 32 部再乱序对阵；
- 自选页支持关键词搜索与年代筛选，选到 32 部才能开战，未开走的草稿存在 localStorage，刷新不丢；
- 32 强 → 16 强 → 8 强 → 半决赛 → 决赛共 31 场，每场二选一，可撤回上一场；
- 对阵与结果存在 localStorage（`anime-years.battle.v1`），刷新后可继续；
- 冠军产生后可导出 1440 px 宽对阵图海报：**世界杯式左右半区**，每半区 16 个签位，32 强 → 半决赛向中间收窄，决赛与冠军居中；胜者描橙线、负者灰显删除线。对阵页的树形概览用同一套半区结构。

## 结构

```
src/
├─ App.vue                 步骤路由、页头、确认与提示
├─ components/
│  ├─ IntroStep.vue        昵称、三种模式、匿名计入开关
│  ├─ YearStep.vue         37 选 10–20
│  ├─ PickStep.vue         按年选片
│  ├─ PosterStep.vue       番单海报预览与导出
│  ├─ PosterCanvas.vue     1440 px 宽、自适应高的番单海报
│  ├─ CrowdStats.vue       大家都在看（年代 TOP3 + 占比）
│  ├─ BattleStep.vue       大乱斗对阵与撤回
│  ├─ BattlePosterStep.vue 冠军对阵图导出
│  ├─ BattlePosterCanvas.vue 1440 px 宽完整对阵图
│  ├─ ToastBar.vue
│  └─ ConfirmDialog.vue
├─ composables/            草稿、对阵状态机、封面载入、数据加载、Toast、确认框
├─ utils/anime.js          标题/格式/海报字号、排除清单
├─ utils/stats.js          Supabase 提交与聚合读取
├─ data/                   番单数据与 battle/ 大乱斗候选池
└─ styles/app.css
scripts/fetch-data.mjs     数据生成脚本
supabase/schema.sql        榜单建表与 RPC
```

## 说明

- 年份按 AniList 的播出年份归档；包含 TV、TV 短篇、剧场版、OVA、ONA、特别篇，排除 MUSIC 与成人内容。
- 2026 年只包含目前已收录的作品。
- 早期冷门作品可能没有简体中文名，会回退显示日文原名；搜索支持中文名、日文名和罗马音。
- 导出使用 [`html-to-image`](https://github.com/bubkoo/html-to-image)。导出前会把封面通过 CORS 抓取并转成 data URL，画布不会跨域污染；封面加载失败时使用首字占位，仍可正常导出。
