# InterviewDE — 前端应用 (Frontend)

> **基于 React + Vite + TailwindCSS 的沉浸式 AI 面试体验前端**

InterviewDE 前端是一个高性能、响应式的单页应用 (SPA)，专为赴德求职者设计。它不仅提供了美观的 UI 界面，还集成了流式文本对话、实时语音播放、简历上传解析及面试报告展示等核心功能。

---

## 🌟 核心特性

- **🎭 沉浸式面试厅**：支持全屏面试模式，集成实时计时器、进度条及智能体状态切换动画。
- **💬 流式 AI 对话**：基于服务端发送事件 (SSE) 实现毫秒级响应的打字机对话效果。
- **🎙️ 多模态支持**：集成浏览器语音识别 (STT) 与后端 Gemini 神经语音播放 (TTS)。
- **📊 动态仪表盘**：可视化展示面试历史记录，支持一键查看 AI 生成的深度诊断报告。
- **🌍 完整国际化**：UI 支持 **简体中文**, **English**, **Deutsch** 一键切换（i18next 驱动）。
- **🌙 响应式设计**：完美适配移动端与桌面端，支持深色模式 (Dark Mode) 与浅色模式切换。

---

## 🛠️ 技术栈

| 类别 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **核心框架** | React 18 / Vite 5 | 现代前端开发底座，极致的构建与热更新速度 |
| **路由** | React Router v6 | 处理页面跳转、导航守卫与状态传递 |
| **样式/UI** | TailwindCSS / Lucide | 原子化 CSS 方案与精美图标库 |
| **认证/后端通信**| Supabase Auth / Fetch | 使用 Google OAuth 登录，消费 RESTful 及 SSE API |
| **状态/国际化** | i18next | 系统级多语言配置与持久化存储 |

---

## 📂 目录结构

```text
frontend/
├── src/
│   ├── pages/             # 页面组件
│   │   ├── LandingPage.jsx     # 项目首页（功能介绍、特性展示）
│   │   ├── SetupPage.jsx       # 面试配置页（职位输入、简历上传）
│   │   ├── InterviewPage.jsx   # 面试核心页（全屏、计时、流式对话）
│   │   ├── DashboardPage.jsx   # 个人中心（历史列表、报告查看）
│   │   └── ProfilePage.jsx     # 个人设置（简历管理、AI 诊断）
│   ├── components/        # 功能组件
│   │   ├── ChatInterface.jsx   # *核心*：处理 SSE 流、语音、STT 与 UI 渲染
│   │   ├── Navbar.jsx          # 导航栏（含登录态与语言切换）
│   │   └── ThemeToggle.jsx     # 主题切换组件
│   ├── lib/               # 工具类
│   │   ├── supabase.js         # Supabase Anon 客户端初始化
│   │   └── backendBase.js      # 后端 URL 统一管理
│   ├── locales/           # 多语言 JSON 资源 (zh/en/de)
│   └── hooks/             # 自定义 Hook (如 useAuth)
├── tailwind.config.js     # Tailwind 样式定制
├── vite.config.js         # 开发代理与构建配置
└── README.md              # 本文档
```

---

## ⚙️ 环境变量

创建 `.env` 文件并配置：

| 变量名 | 说明 |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥（Anon Key） |
| `VITE_BACKEND_URL` | 后端 API 地址（开发环境通常为 `http://localhost:5000`） |

---

## 🚀 开发与运行

```bash
cd frontend
npm install              # 安装依赖
cp .env.example .env     # 配置环境变量
npm run dev              # 启动本地服务 (默认 http://localhost:3000)
```

---

## 💡 关键模块说明

### 1. 流式对话 (SSE)
前端通过 `fetch` 的 `body.getReader()` 实时解析后端传回的 `text/event-stream`。根据数据包中的 `type` (text, agent, done, error) 动态更新对话气泡。

### 2. 语音交互
- **TTS**: 优先调用 `/api/chat/tts` 获取 Gemini 合成的 WAV 音频流。若失败，自动降级为浏览器的 `window.speechSynthesis`。
- **STT**: 使用 `webkitSpeechRecognition` 实现语音转文字，语言参数自动同步面试设置。

### 3. 多语言支持
通过 `react-i18next` 统一管理。请注意：**UI 语言**决定按钮和标签文字；**面试语言**决定 AI 提出的问题语种和音频语音。

---

## 🛡️ 注意事项

- **状态丢失**：`InterviewPage` 依赖路由跳转时的 `state`。直接在浏览器刷新面试页面会导致数据丢失并重定向至配置页。
- **跨域设置**：确保后端 `FRONTEND_URL` 允许当前前端地址进行跨域请求。
