# 前端技术架构文档

> 文档版本：2026-08-24；已同步 `/interview/:interviewId` 刷新恢复、面试官类型、完整练习流程、5–60 分钟正式模拟和截止答题宽限。

## 目录

1. [技术栈总览](#1-技术栈总览)
2. [项目结构](#2-项目结构)
3. [构建与开发环境](#3-构建与开发环境)
4. [路由系统](#4-路由系统)
5. [认证体系](#5-认证体系)
6. [状态管理](#6-状态管理)
7. [国际化 (i18n)](#7-国际化-i18n)
8. [样式系统](#8-样式系统)
9. [组件体系](#9-组件体系)
10. [页面详解](#10-页面详解)
11. [SSE 流式通信](#11-sse-流式通信)
12. [语音交互 (TTS / STT)](#12-语音交互-tts--stt)
13. [动效系统](#13-动效系统)
14. [后端通信](#14-后端通信)
15. [环境变量与配置](#15-环境变量与配置)
16. [设计规范](#16-设计规范)

---

## 1. 技术栈总览

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | React | 18.3 | UI 组件化开发 |
| **构建工具** | Vite | 8.2 | 极速 HMR + 生产构建 |
| **路由** | React Router | 7.18 | SPA 路由 + 路由守卫 |
| **样式** | Tailwind CSS | 3.4 | 原子化 CSS 方案 |
| **后处理** | PostCSS + Autoprefixer | 8.5 / 10.4 | CSS 编译与厂商前缀 |
| **认证** | Supabase Auth | 2.45 | OAuth (Google / LinkedIn OIDC) |
| **国际化** | i18next + react-i18next | 25.10 / 16.6 | 三语 (zh/en/de) |
| **语言检测** | i18next-browser-languagedetector | 8.2 | 浏览器自动语言检测 |
| **图标** | Lucide React | 0.446 | SVG 图标库 |
| **动效** | Framer Motion | 11.5 | 页面过渡与交互动画 |
| **工具** | clsx | 2.1 | 条件 className 合并（已安装，预留） |
| **3D（预留）** | Three.js / TalkingHead | 0.180 / 1.7 | 数字人（已安装，代码中未使用） |

### 依赖一览

**生产依赖**：

```json
{
  "@met4citizen/talkinghead": "^1.7.0",
  "@supabase/supabase-js": "^2.45.0",
  "clsx": "^2.1.1",
  "framer-motion": "^11.5.0",
  "i18next": "^25.10.9",
  "i18next-browser-languagedetector": "^8.2.1",
  "lucide-react": "^0.446.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-i18next": "^16.6.6",
  "react-router-dom": "^7.18.2",
  "three": "^0.180.0"
}
```

**开发依赖**：

```json
{
  "@vitejs/plugin-react": "^6.0.5",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.5.26",
  "tailwindcss": "^3.4.11",
  "vite": "^8.2.1"
}
```

---

## 2. 项目结构

```
frontend/
├── public/
│   ├── avatars/               # 用户头像图片
│   ├── crab_logo.png          # OfferClaw Logo
│   └── index.html             # 入口 HTML（含首屏防闪烁脚本）
├── src/
│   ├── main.jsx               # React 入口，加载 i18n → 渲染 App
│   ├── App.jsx                # 路由定义 + Layout 壳
│   ├── index.css              # 全局样式（Tailwind + 自定义动画）
│   ├── pages/                 # 10 个页面组件
│   │   ├── LandingPage.jsx        # 首页（营销、特性展示）
│   │   ├── LoginPage.jsx          # 登录页（Google/LinkedIn OAuth）
│   │   ├── AuthCallbackPage.jsx   # OAuth 回调处理
│   │   ├── SetupPage.jsx          # 面试配置（职位/JD/简历/历史记录）
│   │   ├── InterviewPage.jsx      # 面试核心页（全屏沉浸模式）
│   │   ├── DashboardPage.jsx      # 仪表盘（面试历史 + 游戏化）
│   │   ├── ProfilePage.jsx        # 个人资料（简历/头像/Gallup/CV 解析）
│   │   ├── InterviewReportPage.jsx# 面试报告详情
│   │   ├── GallupTestPage.jsx     # 盖洛普优势测试
│   │   └── ExperiencesPage.jsx    # 面经库展示
│   ├── components/            # 16 个功能组件
│   │   ├── ChatInterface.jsx      # 核心：SSE + TTS + STT + 消息渲染
│   │   ├── PracticeInterviewPanel.jsx # 练习状态控制器；复用 ChatInterface 的正式模拟房间界面
│   │   ├── Navbar.jsx             # 顶栏导航
│   │   ├── Footer.jsx             # 页脚
│   │   ├── ProtectedRoute.jsx     # 路由守卫
│   │   ├── BackgroundAurora.jsx   # 背景极光装饰
│   │   ├── ThemeToggle.jsx        # 主题切换按钮
│   │   ├── LanguageSwitcher.jsx   # 语言切换下拉
│   │   ├── GamificationDashboard.jsx # 游戏化数据面板
│   │   ├── GallupReport.jsx       # Gallup 报告展示
│   │   ├── CheckInModal.jsx       # 签到弹层
│   │   ├── OfferLogosMarquee.jsx  # 品牌 Logo 滚动
│   │   ├── TestimonialsMarquee.jsx# 用户评价跑马灯
│   │   ├── AdvantagesShowcase.jsx # 优势卖点区块
│   │   ├── HowItWorksShowcase.jsx # 流程说明区块
│   │   └── TechnologyShowcase.jsx # 技术能力展示区块
│   ├── context/               # 全局 Context
│   │   └── ThemeContext.jsx       # 主题管理 Provider
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useAuth.js             # Supabase 认证 Hook
│   │   └── useGeminiLiveInterview.js # Gemini Live 语音连接（携带 interviewId）
│   ├── lib/                   # 工具库
│   │   ├── supabase.js            # Supabase 客户端初始化
│   │   ├── backendBase.js         # 后端 URL 管理
│   │   ├── promptBuilder.js       # 面试系统提示词构建
│   │   └── cvProfileDefaults.js   # 简历结构化默认值
│   ├── locales/               # 国际化资源
│   │   ├── zh.json                # 简体中文
│   │   ├── en.json                # English
│   │   └── de.json                # Deutsch
│   └── i18n/
│       └── config.js              # i18next 初始化配置
├── tailwind.config.js         # Tailwind 主题扩展
├── postcss.config.js          # PostCSS 插件链
├── vite.config.js             # Vite 配置（端口、代理）
├── package.json
└── .env                       # 环境变量（不入版本库）
```

---

## 3. 构建与开发环境

### Vite 配置

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

**关键点**：
- 开发服务器端口：**3000**
- API 代理：`/api` → `localhost:5000`（开发环境无需 CORS）
- React 插件：`@vitejs/plugin-react`（Fast Refresh + JSX 转换）
- 模块系统：ESM（`"type": "module"`）

### 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 (HMR) |
| `npm run build` | 生产构建到 `dist/` |
| `npm run preview` | 预览生产构建 |

---

## 4. 路由系统

### 路由架构

```
BrowserRouter
└── AppThemeShell (ThemeProvider + Outlet)
    ├── / .......................... LandingPage (Layout)
    ├── /login .................... LoginPage (无 Layout)
    ├── /auth/callback ............ AuthCallbackPage (无 ProtectedRoute)
    ├── /setup .................... SetupPage (Layout + ProtectedRoute)
    ├── /interview ................ InterviewPage (无 Layout, 全屏)
    ├── /interview/:interviewId ... InterviewPage (无 Layout, 全屏，可刷新恢复)
    ├── /dashboard ................ DashboardPage (Layout + ProtectedRoute)
    ├── /profile .................. ProfilePage (Layout + ProtectedRoute)
    ├── /profile/edit ............. ProfilePage (Layout + ProtectedRoute)
    ├── /interview/:id/report ..... InterviewReportPage (Layout + ProtectedRoute)
    ├── /gallup ................... GallupTestPage (Layout + ProtectedRoute)
    └── /experiences .............. ExperiencesPage (Layout, 公开)
```

### Layout 组件

```
Layout = Navbar + BackgroundAurora + <main>{children}</main> + Footer
```

- 面试页 (`/interview`、`/interview/:interviewId`) 不使用 Layout，实现全屏沉浸模式
- 登录页和 OAuth 回调页独立于 Layout
- 面经库 (`/experiences`) 公开访问，不需要登录

### ProtectedRoute

使用 `useAuth()` 检查 Supabase 会话，未登录自动跳转 `/login`。

### 路由间数据传递

`SetupPage → InterviewPage` 创建成功后导航到 `/interview/:interviewId`，同时用 React Router
`state` 传递首屏配置以减少一次等待：
- `position`、`jobDescription`、`language`、`duration`
- `interviewId`（后端创建的面试记录 ID）
- `mode`（`practice` / `formal`）与 `difficulty`（Easy/Medium/Hard/Adaptive）
- `interviewerType`（`hr` / `technical` / `mixed`）
- `resumeContext`（简历文本）

直接刷新 `/interview/:interviewId` 时，页面通过 `GET /api/interviews/:id` 重新取得配置，再由
聊天或练习组件恢复 checkpoint、题目、尝试和有限对话历史。无 ID 的兼容路由 `/interview`
仍要求导航 `state`，缺失时返回 `/setup`。

---

## 5. 认证体系

### 架构

```
用户 → LoginPage (OAuth Button)
          │
          ▼
      Supabase Auth (Google / LinkedIn OIDC)
          │
          ▼
      /auth/callback → AuthCallbackPage
          │ exchangeCodeForSession
          ▼
      Supabase Session (JWT)
          │
          ▼
      localStorage (自动持久化)
```

### Supabase 客户端

`src/lib/supabase.js`：

```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,    // OAuth 回调自动检测
    persistSession: true,        // localStorage 持久化
    autoRefreshToken: true,      // Token 自动续期
  },
})
```

### useAuth Hook

`src/hooks/useAuth.js`：

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `user` | `User \| null` | 当前用户对象 |
| `loading` | `boolean` | 会话加载中 |
| `signInWithGoogle()` | `async function` | Google OAuth 登录 |
| `signInWithLinkedIn()` | `async function` | LinkedIn OIDC 登录 |
| `signOut()` | `async function` | 退出登录 |

### Bearer Token 传递

所有需要认证的 API 调用统一模式：

```javascript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

fetch(`${backendUrl}/api/xxx`, {
  headers: { Authorization: `Bearer ${token}` },
})
```

---

## 6. 状态管理

### 策略：无全局状态库

本项目 **不使用** Redux、Zustand 等全局状态管理库，采用以下方式：

| 层级 | 方式 | 范围 |
|------|------|------|
| 全局主题 | `ThemeContext` | 整个应用 |
| 认证状态 | `useAuth` Hook | 各组件独立调用 |
| 页面数据 | `useState` + `useEffect` | 页面级 |
| 组件间传参 | Props / 路由 `state` | 父子组件 |
| 持久化 | `localStorage` | 主题、语言、JD 历史 |
| 面试业务状态 | Supabase（通过后端 API） | checkpoint、消息、题目、尝试、提示、笔记和计时 |

### ThemeContext

`src/context/ThemeContext.jsx`：

```javascript
const value = {
  theme,            // 'light' | 'dark'
  setTheme,         // (mode) => void
  appTheme,         // theme 的别名
  setAppTheme,      // setTheme 的别名
  isInterview,      // 当前是否在 /interview 路由
  isDark,           // theme === 'dark'
}
```

**机制**：
- `localStorage` key: `interviewde_theme`
- `useLayoutEffect` 同步 `document.documentElement.classList.toggle('dark')`
- 面试路由下不包裹外层背景色 div

### localStorage 键值表

| Key | 用途 | 模块 |
|-----|------|------|
| `interviewde_theme` | 主题偏好 | ThemeContext |
| `interviewde_lang` | UI 语言偏好 | i18n config |
| `interviewde_jd_history` | 职位描述历史记录 | SetupPage |

---

## 7. 国际化 (i18n)

### 配置

`src/i18n/config.js`：

```javascript
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { zh, en, de },
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en', 'de'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'interviewde_lang',
    },
  })
```

### 三语资源文件

| 文件 | 说明 | 大致 Key 数 |
|------|------|------------|
| `locales/zh.json` | 简体中文（默认） | ~400+ |
| `locales/en.json` | English | ~400+ |
| `locales/de.json` | Deutsch | ~400+ |

### 命名空间结构

```
{
  "meta": { ... },
  "nav": { ... },
  "footer": { ... },
  "landing": { ... },
  "setup": { ... },
  "interview": { ... },
  "dashboard": { ... },
  "report": { ... },
  "profile": { ... },
  "exp": { ... },
  "gallup": { ... },
  "login": { ... },
}
```

### UI 语言 vs 面试语言

| 概念 | 控制方式 | 影响范围 |
|------|---------|---------|
| UI 语言 | `i18n.changeLanguage()` / LanguageSwitcher | 按钮文字、标签、提示信息 |
| 面试语言 | SetupPage `form.language` | AI 提问语种、TTS 音色、STT 识别语言 |

两者相互独立：可以用中文 UI 进行英语面试。

---

## 8. 样式系统

### Tailwind CSS 配置

**深色模式**：`darkMode: 'class'`（通过 `<html class="dark">` 切换）

**品牌色**：Orange 系列（`primary-50` ~ `primary-950`）

```javascript
colors: {
  primary: {
    50: '#fff7ed',   // 最浅
    500: '#f97316',  // 主色
    900: '#7c2d12',  // 最深
    950: '#431407',
  },
}
```

**字体**：

| 字体族 | 字体 | 用途 |
|--------|------|------|
| `sans` | Inter | 正文默认 |
| `serif` | Source Serif 4 | 标题（如页面大标题） |
| `display` | Outfit | 展示文字 |
| `font-chinese-modern` | Noto Sans SC | 中文粗体场景 |

### 自定义组件类

在 `index.css` 的 `@layer components` 中定义：

| 类名 | 用途 |
|------|------|
| `.btn-primary` | 橙色渐变主按钮（圆角全圆、阴影、hover 上浮） |
| `.btn-primary-dark` | 黑/白反色主按钮 |
| `.btn-secondary` | 白底边框次要按钮 |
| `.btn-ghost` | 无底色幽灵按钮 |
| `.btn-setup-action` | 设置页操作按钮（灰色圆角矩形） |
| `.btn-setup-action-pill` | 设置页胶囊按钮 |
| `.input-field-premium` | 高级输入框（圆角 2xl、聚焦环） |
| `.textarea-field-premium` | 高级文本域（圆角 2rem） |
| `.card-premium` | 高级卡片（圆角 2.5rem、hover 阴影+上浮） |
| `.section-badge` | 区域徽章（如"配置你的模拟面试"） |
| `.gradient-text` | 渐变文字（橙色系） |
| `.glass` | 毛玻璃效果 |

### 自定义动画

| 动画名 | 用途 |
|--------|------|
| `fade-in` | 淡入 (0.8s) |
| `slide-up` | 上滑淡入 (0.8s) |
| `reveal` | 弹性揭示 (1.2s) |
| `aurora-blob` | 背景极光飘动 |
| `dh-mouth` / `dh-wave` / `dh-breathe` / `dh-thinking` | 数字人动效（预留） |
| `marquee` / `marquee-reverse` | 水平无限滚动 |

### 滚动条定制

全局使用细滚动条，track 透明，thumb 为圆角灰色，hover 时加深。

---

## 9. 组件体系

### 核心组件

#### ChatInterface.jsx

面试核心组件，承载整个对话交互：

| 模块 | 说明 |
|------|------|
| `useStreamingTTS` Hook | 流式 TTS 播放（AudioContext + PCM 流） |
| SSE 解析循环 | `fetch` + `getReader()` 解析 `text/event-stream` |
| 分句策略 | 5 级优先级自动分句，用于增量 TTS |
| 调度链 (`scheduleChainRef`) | 确保音频按文本顺序播放 |
| STT 集成 | `webkitSpeechRecognition` 语音转文字 |
| 消息渲染 | 用户/AI 消息气泡 + Agent 角色标签 |
| 降级链 | Gemini TTS → 浏览器 SpeechSynthesis |
| 持久化协议 | 每次文本请求携带 `interviewId` 与新的 `idempotencyKey` |

#### PracticeInterviewPanel.jsx

练习模式不复用正式面试的即时流式反馈流程，而是通过规范化状态机 API 操作：

- 页面加载时恢复当前题、全部尝试、提示和私人笔记；没有当前题时幂等生成下一题。
- 支持暂停/恢复、四级提示、浏览器语音听写、题目朗读、多次作答、重试、掌握、带可选原因的跳过和笔记保存。
- 首次作答后必须先执行“重试”才能再次提交；未作答不能标记掌握，四级提示用尽后按钮锁定。
- 用服务端 `remainingSeconds` 同步倒计时；暂停时前端计时冻结，达到时长或题数上限自动定稿。
- 每次写操作生成幂等键；网络失败时使用同一个请求体重试，避免重复出题或重复保存。
- `getTranscript()` 从规范化 questions/attempts 生成兼容报告所需的 transcript。

#### Navbar.jsx (318 行)

| 功能 | 说明 |
|------|------|
| 桌面端导航 | 首页 / 面试 / 历史 / 资料 / 面经库 / 优势测试 |
| 移动端抽屉 | 汉堡菜单 → 全屏链接列表 |
| 用户菜单 | 头像下拉 → Dashboard / Profile / 求职状态 / 退出 |
| 路由高亮 | `isActive(path)` + 下划线指示器 |
| 集成 | LanguageSwitcher + ThemeToggle |

#### ProtectedRoute.jsx (54 行)

```
检查 Supabase 会话 → 有效：渲染 children → 无效：跳转 /login
```

### 营销 / 展示组件

| 组件 | 行数 | 说明 |
|------|------|------|
| `OfferLogosMarquee` | 124 | 品牌 Logo 无限水平滚动 |
| `TestimonialsMarquee` | 90 | 用户评价跑马灯 |
| `AdvantagesShowcase` | 118 | 平台优势卖点展示 |
| `HowItWorksShowcase` | 106 | 使用流程步骤说明 |
| `TechnologyShowcase` | 158 | 技术能力/特性展示 |
| `GamificationDashboard` | 294 | 游戏化数据面板 |
| `GallupReport` | 208 | Gallup 报告卡片渲染 |
| `CheckInModal` | 207 | 签到弹层（含动画） |

---

## 10. 页面详解

### LandingPage (294 行)

首页/营销页，包含多个营销区块组件，展示平台特性、使用流程、技术亮点和用户评价。

### LoginPage (171 行)

OAuth 登录页面，支持 Google 和 LinkedIn OIDC 两种登录方式，使用 Supabase Auth SDK。

### AuthCallbackPage (151 行)

OAuth 回调处理页面，调用 `exchangeCodeForSession` 将授权码换为会话 token，成功后跳转 `/dashboard`。

### SetupPage

面试配置页，功能丰富：

| 区域 | 功能 |
|------|------|
| 职位信息 | 粘贴完整 JD，一键识别求职类型、行业类别和应聘职位；识别结果可编辑 |
| 职位描述 | 文本域 + JD 历史记录（localStorage，最多 10 条） |
| 简历匹配 | 默认读取个人资料中的简历；仅在没有资料简历时提示上传 |
| 面试配置 | 求职类型 + 模式 + 难度说明 + 语言 + 时长 |
| 时长控制 | 正式模拟使用 5–60 分钟滑条（步长 1 分钟）；练习模式不限时并禁用滑条 |
| 幂等创建 | 一个启动动作复用稳定的 `idempotencyKey`，网络重试不会重复创建或扣分 |

### InterviewPage

全屏面试页（无 Navbar/Footer），集成：
- 正式和练习模式统一使用 `ChatInterface` 的数字面试房间、摄像头、对话栏和 Gemini Live 音频层
- `PracticeInterviewPanel` 不再维护独立页面，只加载持久化练习状态并向 `ChatInterface` 注入练习控制器
- 练习模式的右侧对话栏增加可编辑回答、暂停、分层提示、重答、掌握、跳过和即时反馈
- 练习语音使用 Gemini Live 实时转写；停止录音不会自动提交，用户可修改文字后再提交
- 练习录音期间 Live 仅提供转写：候选人的停顿不会触发可听见的 AI 回应，也不会自动进入下一题
- Live 因停顿切分出多个输入 turn 时，前端将各段转写累积到同一份可编辑答案，不会用后一段覆盖前一段
- 提交回答只保存并分析当前答案；只有用户点击“已掌握 → 下一题”或“跳过 → 下一题”后才请求下一题
- 新题生成会读取最近已提交的答案及反馈，然后在既定面试阶段内决定下一道题；新题创建后才向 Live 发送一次朗读控制消息
- 练习 workspace 恢复完成后立即展示与正式模式相同的面试房间，首题在房间内继续生成；请求超时或失败时显示可重试错误，不再永久停留在加载页
- 已提交答案通过“重新回答”复制回编辑框，并以新 attempt 保存，不覆盖历史回答
- 正式模式根据服务端 `deadline_at` 同步倒计时；练习模式不限时
- 倒计时归零时通过 `ChatInterface.isCandidateAnswering()` 检查录音、实时转写和文字输入
- 用户未在回答时立即结束；正在回答时保留当前界面并显示截止提示
- 最后答案提交前同步写入 `messagesRef`；提交后不请求下一题，直接生成报告
- 截止宽限提示支持中文、英文和德文
- 面试进度条
- 面试结束 → 根据模式生成不同侧重点的报告

### DashboardPage (584 行)

仪表盘，展示：
- 面试历史列表（含删除、查看报告）
- 游戏化统计（签到、经验值、等级）
- 快速操作入口

### ProfilePage (2062 行)

最大的页面组件，包含：
- 个人信息编辑
- 头像选择
- 简历管理（粘贴/上传/解析）
- 求职状态切换
- Gallup 优势测试入口

### InterviewReportPage (916 行)

面试报告详情页，展示 AI 生成的结构化反馈：
- 总体评估
- 优势与不足
- 改进建议
- 每轮题目回顾

### GallupTestPage (281 行)

盖洛普优势测试页面，嵌入式测试 + 结果展示。

### ExperiencesPage (388 行)

面经库展示页，特点：
- 统计卡片（总数、工作、学校、Offer 数）
- 筛选标签（全部/实习学生工/学校面试）
- 全文搜索（企业、岗位、题目、感想）
- 展开/折叠卡片交互
- 公开访问（无需登录）

---

## 11. SSE 流式通信

### 通信流程

```
前端                                后端
  │                                  │
  ├─ POST /api/chat/message ────────►│
  │  (Body: interviewId,             │
  │   idempotencyKey, messages, ...)  │
  │                                  │
  │◄── SSE: {type:'agent', name}  ───┤  ← Agent 切换
  │◄── SSE: {type:'text', content} ──┤  ← Token 流
  │◄── SSE: {type:'text', content} ──┤
  │         ...                       │
  │◄── SSE: {type:'done'}  ──────────┤  ← 完成
  │                                  │
```

### 前端 SSE 解析

```javascript
const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    interviewId,
    idempotencyKey: crypto.randomUUID(),
    messages,
    position,
    jobDescription,
    language,
    duration,
  }),
})

const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  
  // 按 \n\n 分割 SSE 事件
  const events = buffer.split('\n\n')
  buffer = events.pop()
  
  for (const event of events) {
    if (!event.startsWith('data: ')) continue
    const data = JSON.parse(event.slice(6))
    
    switch (data.type) {
      case 'agent': /* 更新当前说话角色 */ break
      case 'text':  /* 追加文字到消息气泡 + 触发分句 TTS */ break
      case 'done':  /* flush 剩余缓冲 + 结束 */ break
      case 'error': /* 错误处理 */ break
    }
  }
}
```

---

## 12. 语音交互 (TTS / STT)

### TTS (Text-to-Speech)

**useStreamingTTS Hook** — 四级降级链：

```
Level 1: POST /api/chat/tts-stream
         → ReadableStream PCM 流
         → AudioContext + AudioBufferSourceNode
         → 边收边播

Level 2: POST /api/chat/tts
         → 完整 WAV Blob
         → ctx.decodeAudioData → AudioBufferSourceNode

Level 3: 浏览器 SpeechSynthesis
         → SpeechSynthesisUtterance
         → 免费、音质一般

Level 4: 静默跳过
```

**关键参数**：

| 参数 | 值 | 说明 |
|------|-----|------|
| `TTS_SAMPLE_RATE` | 24000 Hz | Gemini TTS 输出采样率 |
| `TTS_MIN_CHUNK_BYTES` | 4800 | 最小播放块 (~100ms) |

**有序调度**：`scheduleChainRef` Promise 链确保多句并行 fetch 但按原文顺序播放。

### STT (Speech-to-Text)

使用浏览器原生 `webkitSpeechRecognition`：

```javascript
const recognition = new webkitSpeechRecognition()
recognition.lang = language === 'Deutsch' ? 'de-DE' : 'en-US'
recognition.continuous = true
recognition.interimResults = true
```

### 分句策略

LLM 流式输出时，前端实时分句触发 TTS：

| 优先级 | 条件 | 切分点 |
|--------|------|--------|
| 1 | 句末标点 `.!?。！？\n` 且 ≥ 15 字符 | 标点后 |
| 2 | 首句 ≥ 40 字符 | 最近标点 |
| 3 | 首句 ≥ 60 字符无标点 | 最近空格 |
| 4 | 逗号/分号 且 ≥ 100 字符 | 逗号后 |
| 5 | 缓冲 ≥ 150 字符 | 最近空格 |

---

## 13. 动效系统

### Framer Motion 使用

**页面级动画**：

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="..."
>
```

**列表动画**：

```jsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    />
  ))}
</AnimatePresence>
```

**展开/收起**：

```jsx
<AnimatePresence>
  {expanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
    />
  )}
</AnimatePresence>
```

### 使用 Framer Motion 的文件

**页面**：LandingPage, SetupPage, DashboardPage, ProfilePage, InterviewReportPage, ExperiencesPage, LoginPage, GallupTestPage

**组件**：TechnologyShowcase, TestimonialsMarquee, OfferLogosMarquee, HowItWorksShowcase, GamificationDashboard, GallupReport, AdvantagesShowcase, CheckInModal

### CSS 动画

部分场景使用 Tailwind + 自定义 CSS（如 marquee 滚动、极光背景），不依赖 Framer Motion。

---

## 14. 后端通信

### API 基地址

`src/lib/backendBase.js`：

```javascript
export function getBackendBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '<configured production Cloud Run origin>'
  }
  return 'http://localhost:5000'
}
```

开发环境下 Vite 同时代理 `/api` 到 5000，两种方式互为冗余。

### API 端点一览

| 端点 | 方法 | 说明 | 调用页面 |
|------|------|------|---------|
| `/api/chat/message` | POST (SSE) | 面试对话流 | ChatInterface |
| `/api/chat/tts-stream` | POST | 流式 TTS | ChatInterface |
| `/api/chat/tts` | POST | 完整 TTS | ChatInterface |
| `/api/chat/reset` | POST | 携带 `interviewId` 的兼容初始化/恢复检查，不清空持久化状态 | InterviewPage |
| `/api/chat/session?interviewId=...` | GET | 指定面试的持久化流程状态 | InterviewPage |
| `/api/chat/live` | WebSocket | `start.config.interviewId` 必填的 Gemini Live 面试 | useGeminiLiveInterview |
| `/api/interviews` | GET/POST | 面试列表/原子幂等创建 | Dashboard/SetupPage |
| `/api/interviews/:id` | GET/DELETE | 面试详情/删除 | Report/Dashboard |
| `/api/interview-sessions/:id` | GET | 恢复题目、尝试、提示、笔记、checkpoint 和服务端练习限制 | PracticeInterviewPanel |
| `/api/interview-sessions/:id/questions/next` | POST | 按固定或 Adaptive 难度生成下一题 | PracticeInterviewPanel |
| `/api/interview-sessions/:id/questions/:questionId/answer` | POST | 保存回答；练习返回即时反馈，正式隐藏反馈 | PracticeInterviewPanel / formal client |
| `/api/interview-sessions/:id/questions/:questionId/hint` | POST | 获取下一层提示，最多四级（仅练习） | PracticeInterviewPanel |
| `/api/interview-sessions/:id/pause`、`/resume` | POST | 练习暂停/恢复 | PracticeInterviewPanel |
| `/api/interview-sessions/:id/questions/:questionId/retry`、`master`、`skip` | POST | 练习题状态动作 | PracticeInterviewPanel |
| `/api/interview-sessions/:id/questions/:questionId/note` | PUT | 保存私人笔记 | PracticeInterviewPanel |
| `/api/interview-sessions/:id/reconnect` | POST | 记录持久化重连动作 | Live/恢复客户端 |
| `/api/interview-sessions/:id/reconnect-context` | GET | 只读取当前题和有限最近消息 | Live/恢复客户端 |
| `/api/interview-sessions/:id/competencies` | GET | 岗位能力矩阵与评分证据 | 后续进度 UI / 调试 |
| `/api/interview-sessions/progress/practice` | GET | 跨场练习进步汇总 | 后续进度 UI / 调试 |
| `/api/profile` | GET/PUT | 个人资料 | ProfilePage/Navbar |
| `/api/profile/resume` | GET/PUT | 简历文本 | SetupPage/Profile |
| `/api/profile/resume/parse-pdf` | POST | PDF 解析 | SetupPage/Profile |
| `/api/profile/game-stats` | GET/POST | 游戏化数据 | DashboardPage |
| `/api/gallup/*` | GET/POST | Gallup 测试 | GallupTestPage |
| `/api/ai-assistant/generate-motivation-letter` | POST | 动机信生成 | SetupPage |
| `/api/experiences` | GET | 面经列表 | ExperiencesPage |

---

## 15. 环境变量与配置

### .env 文件

| 变量 | 必填 | 说明 |
|------|------|------|
| `VITE_SUPABASE_URL` | 是 | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | 是 | Supabase 匿名公钥 |
| `VITE_BACKEND_URL` | 否 | 后端 API 地址（默认 `http://localhost:5000`） |

### 重要说明

- 所有前端环境变量必须以 `VITE_` 开头（Vite 约定）
- `.env` 不入版本库，需从 `.env.example` 复制
- Supabase 的 Anon Key 是公开的（Row Level Security 保障安全）

---

## 16. 设计规范

### 视觉风格

- **设计语言**：Premium Minimalist（高端极简）
- **圆角**：大圆角为主（`rounded-2xl` ~ `rounded-[2.5rem]`）
- **阴影**：轻柔阴影 + hover 时加深上浮
- **字重**：标题 `font-black`(900)，正文 `font-medium`(500)~`font-bold`(700)
- **间距**：宽松留白（`space-y-8` ~ `space-y-16`）
- **大小写**：标签/徽章全大写 `uppercase tracking-widest`

### 色彩体系

| 用途 | 浅色模式 | 深色模式 |
|------|---------|---------|
| 页面背景 | `#FAF9F6` / `bg-sky-50/50` | `slate-950` (#020617) |
| 卡片背景 | `white` | `slate-950` |
| 主文字 | `slate-900` | `white` |
| 次文字 | `slate-500`~`slate-600` | `slate-400`~`slate-500` |
| 品牌色 | `orange-500`~`orange-600` | `orange-400`~`orange-500` |
| 成功 | `emerald-*` | `emerald-*` |
| 错误 | `red-*` | `red-*` |
| 边框 | `slate-100`~`slate-200` | `slate-800` |

### 响应式断点

使用 Tailwind 默认断点：

| 断点 | 宽度 | 用途 |
|------|------|------|
| `sm` | 640px | 小屏适配 |
| `md` | 768px | 平板/桌面分列 |
| `lg` | 1024px | 桌面宽屏 |

### 最大宽度

- 内容区：`max-w-7xl`（1280px）
- 内边距：`px-6 lg:px-10` 或 `px-6 lg:px-12`
