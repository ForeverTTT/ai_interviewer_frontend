# 虚拟面试官素材管线（Avatar Asset Pipeline）

> 本文档描述 6 位固定虚拟面试官的素材组织方式、Provider 抽象层，以及音频如何路由到口型驱动。
>
> **当前状态**：抽象层已就位，素材待提供。所有 provider 默认回退到静态肖像，
> 现有面试逻辑未做任何改动。

## 目录

- [为什么拆成前后端两处](#为什么拆成前后端两处)
- [每位面试官需要哪些文件](#每位面试官需要哪些文件)
- [三份 JSON 的 schema](#三份-json-的-schema)
- [如何新增一位面试官](#如何新增一位面试官)
- [Provider ID 是怎么来的](#provider-id-是怎么来的)
- [音频如何路由](#音频如何路由)
- [打断如何处理](#打断如何处理)
- [校验与错误码](#校验与错误码)
- [接入 MuseTalk 的后续步骤](#接入-musetalk-的后续步骤)

---

## 为什么拆成前后端两处

素材包**不在一个目录里**，这是刻意的。三类文件的消费方不同：

| 类别 | 位置 | 原因 |
| :--- | :--- | :--- |
| **元数据** (`profile/voice/behavior.json`) | 后端 `src/config/interviewers/profiles/` | 后端需要 `defaultVoiceId` 来配置 Gemini Live session（语音在服务端选定，见下）。若只放前端，后端要维护一份副本 → 双事实源 → 必然漂移。 |
| **图片** (`portrait_main` / `card_thumb` / `neutral`) | 前端 `src/assets/interviewers/<id>/` | 浏览器渲染，需要 Vite 做 hash 和产物优化。 |
| **参考视频** (`reference_idle.mp4`) | 后端 `data/interviewer_assets/<id>/` | MuseTalk 预处理的**输入**，几十 MB，浏览器永远不需要。放进 `src/assets/` 会被打进前端产物。 |

关键约束：**语音（voice）必须服务端可读。**
Gemini Live 的音色是在 session config 里设定的，而 session 由后端创建
（`src/live/interviewLiveSocket.js` 的 `liveVoiceFor()`）。所以 `voice.json`
放后端不是风格选择，是硬性要求。

前端通过 `GET /api/interviewers` 拿到元数据，本地只负责把图片贴上去。

```
后端 (事实源)                          前端 (呈现 + 运行时)
├── profiles/<id>/profile.json  ──┐
├── profiles/<id>/voice.json     ──┼── GET /api/interviewers ──► interviewerRegistry.js
├── profiles/<id>/behavior.json  ──┘                                      │
└── data/interviewer_assets/<id>/reference_idle.mp4          src/assets/interviewers/<id>/*.png
        (MuseTalk 预处理输入，不下发)                                      │
                                                              合并 → { ...metadata, assets }
```

---

## 每位面试官需要哪些文件

### 必需

| 文件 | 位置 | 说明 |
| :--- | :--- | :--- |
| `profile.json` | 后端 | 身份、语言、provider 绑定 |
| `voice.json` | 后端 | 音色与语音风格 |
| `behavior.json` | 后端 | 四种状态下的动作表现 |
| `portrait_main.png` | 前端 | 面试页主视觉。建议竖版 ≥ 1024×1536 |
| `card_thumb.png` | 前端 | 选择卡片缩略图。建议 512×512 |

### 可选

| 文件 | 位置 | 缺失时的行为 |
| :--- | :--- | :--- |
| `neutral.png` | 前端 | 回退到 `portrait_main.png` |
| `reference_idle.mp4` | 后端 | `avatarProvider` 为 `none` 时不需要；否则该面试官无法进入 avatar 模式，自动降级为静态肖像 |

`reference_idle.mp4` 规格建议：正面、中性表情、口型从闭合到微张、无遮挡、
25fps、≥ 512×512、10–30 秒且首尾可循环。

> **图片缺失不会导致构建失败。** 前端用 `import.meta.glob` 扫描而非静态
> `import`，缺文件只是少一个条目；放进去就自动生效，无需改代码。

---

## 三份 JSON 的 schema

Schema 定义在 `ai_interviewer_backend/src/config/interviewers/schema.js`（zod），
加载时强制校验。

### profile.json

```json
{
  "id": "avatar_01",
  "displayName": "TBD",
  "genderPresentation": "female",
  "appearanceGroup": "professional_business",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "de", "zh"],
  "defaultVoiceId": "Sulafat",
  "defaultPersonality": "balanced",
  "portrait": "interviewers/avatar_01/portrait_main.png",
  "referenceVideo": "interviewer_assets/avatar_01/reference_idle.mp4",
  "avatarProvider": "musetalk",
  "avatarProviderId": null
}
```

| 字段 | 约束 |
| :--- | :--- |
| `id` | 必须匹配 `avatar_\d{2}`，且与目录名一致 |
| `genderPresentation` | `female` \| `male` \| `neutral` |
| `defaultLanguage` | 必须出现在 `supportedLanguages` 里（schema 强制） |
| `supportedLanguages` | `en` / `de` / `zh` 的子集，至少一个 |
| `defaultPersonality` | 复用现有四种风格：`balanced` \| `supportive` \| `demanding` \| `analytical` |
| `avatarProvider` | `none` \| `musetalk` \| `tavus` \| `simli` \| `volcengine` |
| `avatarProviderId` | 预处理产出，未跑预处理时为 `null` |

### voice.json

```json
{ "defaultVoiceId": "Sulafat", "style": "professional", "pace": "medium", "tone": "calm", "accent": "neutral" }
```

`pace` 限定 `slow` \| `medium` \| `fast`。
`defaultVoiceId` **必须与 profile.json 一致**，不一致会报 `VOICE_ID_MISMATCH`。

### behavior.json

```json
{ "idle": "calm", "listening": "attentive", "speaking": "subtle_head_motion", "interrupted": "stop_immediately" }
```

目前是给 provider 的**声明式提示**，尚未有 provider 消费它。

---

## 如何新增一位面试官

```bash
# 1. 后端：建元数据目录
cd ai_interviewer_backend
mkdir -p src/config/interviewers/profiles/avatar_07
# 复制一份现有的三个 json 并修改 id / displayName / voice

# 2. 后端：放参考视频
mkdir -p data/interviewer_assets/avatar_07
cp ~/your_video.mp4 data/interviewer_assets/avatar_07/reference_idle.mp4

# 3. 前端：放图片
cd ../ai_interviewer_frontend
mkdir -p src/assets/interviewers/avatar_07
cp ~/portrait.png src/assets/interviewers/avatar_07/portrait_main.png
cp ~/thumb.png    src/assets/interviewers/avatar_07/card_thumb.png

# 4. 校验
cd ../ai_interviewer_backend && npm run dev
curl localhost:5000/api/interviewers/health
```

**不需要改任何代码**——注册表按目录扫描，前端按 glob 扫描。

---

## Provider ID 是怎么来的

`avatarProviderId` 是**预处理产物**，不是你手填的标识符。MuseTalk / LiveTalking
会对参考视频做一次离线处理（人脸检测、latent 缓存、关键点提取），产出一个可复用
的 avatar 句柄，实时推理时按这个 id 加载。

```
reference_idle.mp4
      │
      ▼  MuseTalk 预处理（离线，一次性，分钟级）
  人脸检测 + latent 缓存 + 关键点
      │
      ▼
  返回 avatar id，例如 "mt_av_7f3c21"
      │
      ▼  手动写回
profile.json → "avatarProviderId": "mt_av_7f3c21"
```

在此之前 `avatarProviderId` 保持 `null`，注册表会报 `PROVIDER_ID_UNASSIGNED`，
该面试官自动降级为静态肖像——**不会阻断面试**。

换 provider（Tavus / Simli / Volcengine）时，同样是各自跑一遍预处理拿到各自的 id。
因为 `avatarProviderId` 与 `avatarProvider` 成对出现，切换只需改这两个字段。

> 若要同时支持多家 provider，把这两个字段改成一个 map 即可，schema 已隔离，
> 不影响调用方。

---

## 音频如何路由

**核心原则：Gemini Live 的播放路径不知道 avatar 的存在。**

```
Gemini Live (后端 WS)
      │  base64 PCM 24kHz
      ▼
useGeminiLiveInterview.js  (解码为 AudioBuffer)
      │
      ▼
  AudioRouter.push(chunk)
      │
      ├──► 'local'  sink [primary] ──► Web Audio 排程播放（用户听到的声音）
      │
      └──► 'avatar' sink           ──► AvatarProvider.pushAudio(chunk) ──► 口型
```

`AudioRouter`（`src/avatar/AudioRouter.js`）的保证：

1. **本地播放是 primary sink，永远先执行。** avatar sink 抛错、卡顿，都不会影响
   用户听到声音。
2. **sink 之间互相隔离。** 一个抛错不影响其他。
3. **连续失败自动摘除。** 非 primary sink 连续失败 5 次后被移除，避免刷屏。

这一层就是"不把 Gemini Live 和 MuseTalk 耦合"的具体落点。换 provider 时，
`AudioRouter` 和 `useGeminiLiveInterview.js` 都不用动。

> **注意**：avatar 的**视频**从 LiveTalking 经 WebRTC 回传，但**音频仍走我们
> 自己的 Web Audio 路径**——我们已经在做精确排程，若改从视频轨取音频会引入
> 额外延迟和漂移。因此两条流需要按时间戳对齐，而不能假设视频轨自带音频。

---

## 打断如何处理

打断（barge-in）与音频走**同一条通道**，通过 `meta.interrupted` 标记区分：

```
Gemini Live 发来 { type: 'interrupted' }
      │
      ▼
AudioRouter.interrupt()
      │
      ├──► local  sink → stopAudio()：清空已排程的 AudioBufferSourceNode
      │                  并把 nextAudioTime 归零
      │
      └──► avatar sink → provider.interrupt()：丢弃排队音频，立刻停嘴
```

两个必须遵守的点：

1. **中断信号必须走 `provider.interrupt()`，不能走 `pushAudio(null)`。**
   后者会被当成新音频，导致用户已经打断了、虚拟人的嘴还在动。
   （这是实现时踩到的真实 bug，已在 `attachAvatarProvider` 里修正。）
2. **丢弃而非排空。** 队列里的音频要直接扔掉，不能播完。因为音频是提前排程的，
   不清空就会继续播已经作废的内容。

中断后 router 自动恢复，下一轮 `push()` 正常工作，无需重建。

---

## 校验与错误码

两侧各查自己能观测到的东西，互不重复。

### 后端（`registry.js`）

启动时加载并 zod 校验，**单个面试官损坏不会影响其他人**。

| 错误码 | 含义 |
| :--- | :--- |
| `PROFILE_SCHEMA_INVALID` | profile.json 不符合 schema 或无法解析 |
| `VOICE_CONFIG_INVALID` | voice.json 不合法 |
| `BEHAVIOR_CONFIG_INVALID` | behavior.json 不合法 |
| `VOICE_ID_MISMATCH` | profile.json 与 voice.json 的 `defaultVoiceId` 不一致 |
| `MISSING_REFERENCE_VIDEO` | provider 非 `none` 但视频文件不存在 |
| `PROVIDER_ID_UNASSIGNED` | `avatarProviderId` 仍为 null |

`errors` 会让该面试官从 `GET /api/interviewers` 中消失（`usable = false`）；
`warnings` 只把 `avatarReady` 置为 false，面试官照常可用。

诊断：`GET /api/interviewers/health`

### 前端（`validation.js`）

| 错误码 | 阻断？ | 行为 |
| :--- | :--- | :--- |
| `MISSING_PORTRAIT` | 否 | 回退到 `images/interviewer-hr.png` |
| `MISSING_THUMBNAIL` | 否 | 卡片无缩略图 |
| `INVALID_VOICE_CONFIG` | **是** | 该面试官不可选 |
| `UNSUPPORTED_LANGUAGE` | **是** | 当前面试语言下不可选 |
| `PROVIDER_UNAVAILABLE` | 否 | 降级为静态肖像 |
| `PROVIDER_ID_UNASSIGNED` | 否 | 降级为静态肖像 |

设计取向：**只有会导致面试跑不起来的问题才阻断。** 素材缺失一律降级，
因为素材是渐进补齐的，不该卡住整个功能。

---

## 接入 MuseTalk 的后续步骤

当前 `MuseTalkAvatarProvider` 是**占位实现**，`checkAvailability()` 恒返回
不可用，所以线上行为与今天完全一致。要真正接通：

1. **部署 LiveTalking 服务**，配置 `VITE_MUSETALK_ENDPOINT`。
2. **实现 `MuseTalkAvatarProvider` 里标了 TODO 的四处**：WebRTC 协商、
   音频上行 socket、重采样、interrupt 控制帧。
3. **在 `ChatInterface.jsx` 接线**（三处改动，目前刻意未做）：
   - 创建 provider：`createAvailableAvatarProvider(interviewer.avatarProvider, {...})`
   - 建 `AudioRouter`，把现有 `playAudioChunk` 注册为 primary sink
   - 把 `<img>` 换成 provider 的 `<video>`，无 video 时回退 `<img>`
4. **把 `interviewer` 打通到 session**：目前面试官身份由后端
   `utils.js` 的 `getInterviewerName()` 按 `sessionId.charCodeAt(0) % 4`
   自动派发，用户不能选。要让用户选 6 位面试官之一，需要：
   - `interviews` 表加 `interviewer_id` 列
   - SetupPage 增加选择 UI
   - `liveVoiceFor()` 改为读注册表的 `voice.defaultVoiceId` 而非按 style 取

> 第 3、4 步会修改现有面试逻辑，**本次刻意未做**，留待确认。
