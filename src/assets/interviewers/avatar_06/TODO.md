# avatar_06 — 待提供的素材

本目录下的**图片文件需要手动放入**，仓库不会生成占位二进制。
文件名必须完全一致，注册表按约定路径解析。

## 必需

| 文件 | 用途 | 建议规格 |
| :--- | :--- | :--- |
| `portrait_main.png` | 面试页主视觉（静态回退 / 未说话时） | 竖版，≥ 1024×1536，透明或纯色背景 |
| `card_thumb.png` | 选择面试官时的卡片缩略图 | 正方形 512×512 |

## 可选

| 文件 | 用途 |
| :--- | :--- |
| `neutral.png` | 中性表情帧；缺失时回退到 `portrait_main.png` |

## 不要放在这里

`reference_idle.mp4` **不放前端**——它是 MuseTalk 预处理的输入，几十 MB，
放进 `src/assets/` 会被 Vite 打进产物。它属于后端：

```
ai_interviewer_backend/data/interviewer_assets/avatar_06/reference_idle.mp4
```

完整说明见 [docs/AVATAR_ASSET_PIPELINE.md](../../../docs/AVATAR_ASSET_PIPELINE.md)。
