<div align="center">

<img src="docs/images/hero-landing.png" width="100%" />

<br/><br/>

# 🦀 OfferClaw

**德国面试，AI 赋能，练到满分。**

从 JD 智能解析到多角色 Agent 实时对话，从神经语音对练到结构化反馈——<br/>
一套为赴德求职者打造的全链路 AI 面试训练系统，让你在每一场 Bewerbungen 中掌控全局。

<br/>

[开始练习](#快速开始) · [核心功能](#-一切为了你通过面试) · [技术文档](technical%20documents/Frontend-Architecture.md)

</div>

## 🌐 在线使用

直接访问：<https://aiinterviewer-491711-7b1cf.web.app>

用户无需安装本地环境，使用 Google 账号登录即可。生产环境使用 Firebase Hosting，
后端运行于 Google Cloud Run，用户数据和认证由 Supabase Cloud 管理。

- 前端：`https://aiinterviewer-491711-7b1cf.web.app`
- 后端：`https://interview-backend-557559701677.europe-west1.run.app`
- 后端健康检查：`https://interview-backend-557559701677.europe-west1.run.app/api/health`

<br/>

---

<br/>

## 💡 痛点

你是否也遇到过——

- 面试题千篇一律，刷了 100 道 LeetCode 结果面试官问的全是 Behavioral
- 对着镜子练口语，但没人追问，永远不知道自己的回答有多少漏洞
- 投了 Werkstudent / Praktikum，JD 写得天花乱坠，但不知道面试官真正想考什么
- 简历改了 10 版，依然收不到回复，不知道到底哪里出了问题

**OfferClaw 解决的就是这些问题。**

不是又一个通用聊天机器人套壳，而是一个**理解你的简历、读懂你的 JD、模拟真实面试官追问逻辑**的全链路训练系统。

<br/>

---

<br/>

## ⚡ 一切为了你通过面试

<img src="docs/images/features-core.png" width="100%" />

<br/>

<table>
<tr>
<td width="50%" valign="top">

**🎯 AI 赋能 · 专属题库**

岗位与 JD 驱动整条面试线——技术面与行为面深度贴合你的背景。多 Agent 系统自动规划面试节奏，追问像真人面试官一样犀利。

</td>
<td width="50%" valign="top">

**🌍 德语 / 英语双语**

全德语或全英语会话，结合前沿大模型，还原德国雇主真实语境与追问节奏。不是翻译题目，而是地道的 Vorstellungsgespräch。

</td>
</tr>
<tr>
<td valign="top">

**🎙️ 神经语音对练**

语音作答 + Gemini Neural TTS 实时回放面试官话术。增量流式播放，延迟低至毫秒级，节奏和停顿与真人无异，专治临场紧张。

</td>
<td valign="top">

**⏱️ 灵活时长**

5 / 10 / 15 / 20 分钟自由选择。碎片时间快速练一轮，也能全真模拟 20 分钟完整面试。实时计时 + 进度条，节奏一目了然。

</td>
</tr>
</table>

### 可恢复的练习与正式面试

- **面试官类型**：创建前可选择 HR、Technical 或 Mixed；题型、追问、RAG 和最终报告遵守对应边界。
- **练习模式**：支持暂停/恢复、四级提示、私人笔记、语音听写、题目朗读、多次作答、重试、掌握和跳过；每次尝试保留即时证据化反馈，达到时长或题数上限自动结束。
- **正式模式**：服务端截止时间持续生效，关闭页面不会暂停；中途禁止提示和重答，最终统一生成报告。
- **四种难度**：Easy、Medium、Hard 使用不同提问约束，Adaptive 会依据回答质量动态调整下一题。
- **断线恢复**：每场面试使用 `/interview/:interviewId`；刷新、文本和 Gemini Live 重连都只恢复当前面试的 checkpoint 和必要上下文。
- **安全重试**：创建面试和所有有副作用的练习动作使用幂等键，网络重试不会重复创建、扣分、出题或保存答案。

<br/>

---

<br/>

## 🏆 为什么选择 OfferClaw

<img src="docs/images/advantages.png" width="100%" />

<br/>

> 针对当前 AI 面试工具的局限，提供更深入、更垂直、更具导师意义的闭环体验。

| | 能力 | 描述 |
|:---:|------|------|
| 🔬 | **深度垂直与个性化定位** | 根据你的简历和岗位 JD 深度提问，不是通用题库，是只属于你的面试 |
| 🔄 | **全链路求职闭环** | 简历分析 → 修改建议 → 面试模拟 → 反馈报告 → 改进，一站到底 |
| 🎓 | **个性化职场导师** | 职业测评 + 学习路径规划，帮你从学生平滑过渡到职场 |
| 📄 | **大模型简历赋能** | STAR 法则自动拆解经历，量化成果，让 Recruiter 一眼看到你的价值 |
| 🎬 | **全真模拟面试环境** | 神经 TTS 还原面试官语音压力 + Zoom 式全真窗口，练的就是实战 |

<br/>

---

<br/>

## 📝 智能简历分析

<img src="docs/images/resume-analysis.png" width="100%" />

<br/>

上传简历，AI 会**逐条** bullet point 给出诊断：

| 步骤 | 做什么 |
|:----:|--------|
| **发现** | 识别每条经历中的模糊表述、缺失量化、结构问题 |
| **为何重要** | 解释这样改如何让技术贡献更清晰，让 Recruiter 印象更深 |
| **修改建议** | 直接输出修改前 vs 修改后的对比——从解决的问题出发，落到具体指标 |

不是泛泛的"建议多量化"，而是精确到**每一个 bullet point** 的可操作改写。

<br/>

---

<br/>

## 📊 简历评分引擎

<img src="docs/images/resume-score.png" width="100%" />

<br/>

**OfferClaw Resume Score** —— 五维度量化你的简历竞争力：

```
  清晰度        ████████░░  表达是否简洁、逻辑是否通顺
  成果影响力    ██████████  是否用数据说话、量化业务成果
  结构逻辑      ████░░░░░░  排版层次与信息优先级
  关键词 / ATS  ████████████  岗位关键词覆盖率，能否通过 ATS
  专业度        ██████░░░░  语言与格式的整体专业程度
```

配合评分，系统自动生成**优先执行清单**——先改什么、怎么改、改完能提升多少分。

<br/>

---

<br/>

## 🎯 成长中心

<img src="docs/images/dashboard.png" width="100%" />

<br/>

打开页面先看到今天该做什么，再查看结果和历史：

- **🚀 Offer 冲刺计划** — 设置目标岗位与日期，查看倒计时、本周进度和一个明确的今日任务
- **🎯 职场胜算** — 根据真实面试报告，从技术、经历证据、结构表达、沟通协作、策略匹配五个维度评估
- **📄 最新复盘** — 报告入口直接可见；暂停的练习可以恢复原题目、回答、提示、笔记和计时状态
- **🔖 题目收藏库** — 统一保存练习笔记和报告中的题目、回答与建议，支持筛选和再次练习
- **📚 面试复盘记录** — 按报告和待继续状态筛选，不需要猜测记录是否可以点击

<br/>

---

<br/>

## 💎 盖洛普优势测试

<img src="docs/images/gallup-test.png" width="100%" />

<br/>

> *"你最大的优势是什么？"* —— 这道题你真的答得上来吗？

四大领域 —— **执行力** · **影响力** · **关系建立** · **战略思维**。

通过专业测评发现你的 Top 5 天赋主题，并将结果融入面试准备策略。当面试官问到这道经典题时，你的回答将**有理有据**，而非空洞的自我表扬。

<br/>

---

<br/>

## 🚀 快速开始

本项目是 Node.js/Vite 前端，不使用 Python `venv`。依赖安装在当前目录的
`node_modules` 中，并由 `package-lock.json` 锁定版本，形成项目级隔离环境。

前置要求：Node.js 20.19+ 或 22.12+（推荐当前 LTS 版本，Vite 8 的最低要求）。从仓库根目录执行：

```bash
cd ai_interviewer_frontend

# 严格按照 package-lock.json 安装依赖
npm ci

# macOS / Linux
cp .env.example .env

# Windows PowerShell（与上一条二选一）
Copy-Item .env.example .env
```

编辑 `.env`，填入 Supabase 项目地址和 Anon Key，然后启动开发服务器：

```bash
npm run dev
```

开发地址为 `http://localhost:3000`。Vite 会把 `/api` 请求代理到
`http://localhost:5000`，因此请先启动后端服务。

当 `.env` 设置 `VITE_LOCAL_SUPABASE=true` 时，登录页会显示本地账户按钮，并隐藏
云端 OAuth 按钮。首次点击会在本地 Supabase 自动创建开发账户，后续直接登录。

| 环境变量 | 必填 | 说明 |
|---------|:----:|------|
| `VITE_SUPABASE_URL` | ✅ | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名公钥 |
| `VITE_API_URL` | — | 后端 API 地址；优先级高于 `VITE_BACKEND_URL`，生产环境推荐使用 |
| `VITE_BACKEND_URL` | — | 后端 API 地址；本地未设置时通过 Vite 代理访问 `localhost:5000` |

### 构建与本地预览

```bash
npm run build
npm run preview
```

生产构建产物位于 `dist/`。`preview` 仅用于部署前检查，不应作为生产 Web 服务器。

持久化面试功能的完整本地验收还需要同时启动后端和本地 Supabase。自动化状态机、
并发与幂等测试位于后端仓库；前端最低回归检查为 `npm run build`，上线前还应人工覆盖：

- 练习模式的暂停/恢复、提示、笔记、多次作答、掌握和跳过；
- 正式模式不能暂停且关闭页面后服务端计时继续；
- 两个标签页分别打开不同面试时不会串线；
- Gemini Live 断线重连只恢复当前 `interviewId` 的上下文。

### Firebase Hosting 部署

项目已包含 `firebase.json` 和 `.firebaserc`。先在 `.env.production` 中设置线上后端地址，
再执行：

```bash
npm ci
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project aiinterviewer-491711-7b1cf
```

Supabase Anon Key 会被编译进浏览器代码，只能使用公开的 Anon Key；绝不能在任何
`VITE_*` 变量中填写 Supabase Service Role Key 或其他服务端密钥。

<br/>

---

<br/>

## 🛠️ 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| UI 框架 | **React 18** | 组件化 + Hooks 驱动 |
| 构建 | **Vite 8** | 极速 HMR + ESM 原生模块 |
| 路由 | **React Router 7** | 嵌套路由 + 路由守卫 |
| 样式 | **Tailwind CSS 3** | 原子化 CSS + 自定义设计系统 |
| 认证 | **Supabase Auth** | Google / LinkedIn OIDC |
| 国际化 | **i18next** | 中 / 英 / 德三语 |
| 动效 | **Framer Motion** | 页面过渡 + 交互微动画 |
| 语音 | **Gemini Neural TTS** | 流式 PCM + Web Audio API |
| 通信 | **SSE** | 实时流式 Token 推送 |
| 持久化协议 | **Supabase + interviewId** | 服务端 checkpoint、幂等重试、乐观锁和断线恢复 |
| 图标 | **Lucide React** | 轻量 SVG 图标库 |

> 📖 完整技术架构文档 → [`Frontend-Architecture.md`](technical%20documents/Frontend-Architecture.md)

<br/>

---

<div align="center">

<br/>

**OfferClaw** — 不只是模拟面试，是你的德国求职全链路 AI 教练。

*Viel Erfolg bei deinem Vorstellungsgespräch!* 🇩🇪

<br/>

</div>
