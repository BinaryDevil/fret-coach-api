# Fret Coach API

Fret Coach 是为吉他爱好者提供演奏训练与反馈的后端基础。第一个功能是练习库：用户选择爬格子、音阶或手指机动性训练，查看六线谱，按 BPM 跟随伴奏并循环指定小节。

这不是答题型产品。服务端不存储标准答案，也不处理“答对/答错”。

## 当前架构边界

`Exercise` 描述训练目标；`ExerciseScore` 存储 alphaTab 可加载的 Guitar Pro、MusicXML 或 alphaTex 曲谱，以及默认 BPM 和伴奏；`LoopRegion` 保存可循环的小节范围；`PracticeSession` 保存用户实际选择的循环与 BPM、时长和完成状态。

前端使用 **alphaTab** 渲染六线谱和播放高亮。伴奏 `<audio>` / Web Audio 是唯一时间轴，alphaTab 仅跟随同步；后续实时音高检测将与该时间轴上的当前目标音比较。

此阶段只建立 AI 分析的异步 API 契约和持久化模型：`POST /recordings/:id/analysis` 创建 `QUEUED` 分析记录。实际音频转写、节拍/音高检测、推弦检测和队列 worker 将在后续接入，不会阻塞基础 API 的迭代。

## 本地启动

1. `npm install`
2. `cp .env.example .env`，生产环境请替换两个 JWT secret。
3. `docker compose up -d`
4. `npm run prisma:deploy`
5. `npm run prisma:seed`
6. `npm run start:dev`

API 基址为 `http://localhost:3000/api/v1`；Swagger 为 `http://localhost:3000/api/docs`；健康检查为 `GET /api/v1/health`。

## API 概览

- `POST /auth/register`、`/auth/login`、`/auth/refresh`、`/auth/logout`
- `GET/PATCH /users/me`
- `GET /exercises`、`GET /exercises/:id`
- `POST /practice-sessions`：提交 `exerciseId`、可选 `loopRegionId` 与 `targetBpm`
- `POST /practice-sessions/:id/recordings`：登记已直传对象存储的音频
- `POST /recordings/:recordingId/analysis`、`GET /recordings/:recordingId/analysis`
- `POST /practice-sessions/:id/complete`、`GET /progress/me`

除健康检查与认证接口外均需要 `Authorization: Bearer <accessToken>`。

## 命令

- `npm run prisma:migrate -- --name <migration_name>`：创建迁移
- `npm run prisma:deploy`：部署迁移
- `npm run prisma:seed`：导入开发练习
- `psql "$DATABASE_URL" -f prisma/seed.sql`：使用原生 SQL 导入同一份基础练习数据
- `npm test`、`npm run lint:check`、`npm run format:check`、`npm run build`

## 下一步

接入对象存储的预签名上传、队列 worker 及音频 AI 管线；随后实现曲谱解析和可选的伴奏生成。分析结果应以统一的毫秒时间轴返回，方便前端在波形、曲谱和训练回放中定位问题。
