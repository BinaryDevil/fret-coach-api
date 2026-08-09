# Fret Coach — 项目上下文

> 此文件是跨会话、跨设备开发的持久交接记录。更新功能方向、关键技术选择或 API 合约后，应同步更新它。

## 产品目标

Fret Coach 是面向吉他学习者的 Web 产品。它帮助用户练习技术与整首歌曲，并逐步提供基于演奏音频的反馈。

不是答题产品：不使用“题目答案”或“正确率”作为核心练习模型。

长期主链路：

```text
练习库 / 整曲练习 → 演奏录音 → 异步 AI 分析 → 音准、节奏、推弦与技巧反馈
```

## 当前阶段：练习库

当前只实现练习库与基础练习记录，暂不实现录音输入、AI 判别、实时音高检测、曲谱上传或伴奏生成。

用户可以：

1. 浏览爬格子、音阶和手指机动性练习；
2. 查看六线谱；
3. 选择 BPM 与循环小节；
4. 开始和完成一次练习，保存时长及连续练习天数。

## 谱面与播放方案

前端使用 **alphaTab**，不要自行用 Canvas 绘制六线谱。

- 支持格式：`GUITAR_PRO`、`MUSIC_XML`、`ALPHA_TEX`。
- alphaTex 可直接从 API 的 `score.content` 读取。
- Guitar Pro/MusicXML 后续通过对象存储 URL 加载；数据库先保存 `storageKey`。
- 伴奏 `<audio>` 或 Web Audio 是唯一时间轴；alphaTab 负责播放光标、当前 beat/note 高亮、滚动和谱面同步。
- `LoopRegion` 以小节范围保存循环配置。

首个练习：

- slug：`chromatic-1-2-3-4`
- 标题：`1-2-3-4 爬格子`
- 格式：alphaTex
- 默认速度：60 BPM
- 循环：第 1–2 小节（`完整循环`）

## 技术栈

- Node.js + TypeScript + NestJS
- PostgreSQL（当前使用 Supabase）+ Prisma
- REST API + Swagger
- JWT access token + refresh token
- Docker Compose 用于可选本地 PostgreSQL
- ESLint、Prettier、Jest

## 领域模型

| 模型 | 用途 |
| --- | --- |
| `User` | 账号、惯用手、调弦、时区和 refresh token hash |
| `Exercise` | 练习的标题、类型、说明和训练配置 |
| `ExerciseScore` | alphaTab 曲谱、默认 BPM、拍号、伴奏资源 |
| `LoopRegion` | 指定练习内可循环的小节范围 |
| `PracticeSession` | 用户练习选择的循环、BPM、时长和状态 |
| `UserProgress` | 总练习数、总时长、连续练习天数 |
| `PerformanceRecording` / `PerformanceAnalysis` / `PerformanceFeedback` | 预留给后续音频 AI 分析 |

数据库模型权威来源是 `prisma/schema.prisma`。迁移在 `prisma/migrations/`。

## API

API 基址：`http://localhost:3001/api/v1`

Swagger：`http://localhost:3001/api/docs`

健康检查：`GET /health`

认证：

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

练习库（均需 `Authorization: Bearer <accessToken>`）：

- `GET /exercises`
- `GET /exercises/slug/chromatic-1-2-3-4`
- `GET /exercises/:id`
- `POST /practice-sessions`
- `POST /practice-sessions/:id/complete`
- `GET /progress/me`

创建会话请求：

```json
{
  "exerciseId": "<exercise.id>",
  "loopRegionId": "<optional loopRegion.id>",
  "targetBpm": 60
}
```

## 本地运行

```bash
npm install
cp .env.example .env
# 填入 DATABASE_URL 和 JWT secret；不要提交 .env
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

端口约定：前端通常使用 `3000`，后端 `.env` 使用 `PORT=3001`。

原生 SQL 初始数据：

```bash
psql "$DATABASE_URL" -f prisma/seed.sql
```

## 已知事项

- `joi` 必须使用 `import * as Joi from 'joi'`，否则运行时为 `undefined`。
- 生产启动脚本是 `node dist/src/main`，原因是当前 TypeScript 构建结构输出到 `dist/src/`。
- Prisma CLI 会提示 package.json 中的 `prisma.seed` 配置未来弃用；尚未阻塞开发，未来可迁移到 `prisma.config.ts`。
- `.env`、`node_modules` 不进入 Git；Supabase 连接串和 JWT secret 需在各设备独立注入。

## 后续优先级

1. 前端实现 alphaTab 练习详情页、BPM 控制和循环播放。
2. 添加更多练习内容与内容管理流程。
3. 接入对象存储的预签名上传，供 GP/MusicXML 和伴奏文件使用。
4. 加入录音采集与后台队列。
5. 实现音高、节奏、推弦与技巧分析，并以统一毫秒时间轴返回反馈。
