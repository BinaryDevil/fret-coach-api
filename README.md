# Fret Coach API

Fret Coach 是为吉他爱好者提供演奏训练与反馈的后端基础：练习库用于爬格子、音阶和手指机动性训练；整曲练习支持曲谱、伴奏和用户录音。录音通过异步 AI 分析产出音准、节奏、推弦和技巧反馈。

这不是答题型产品。服务端不存储标准答案，也不处理“答对/答错”。

## 当前架构边界

`Exercise` 描述练习目标和配置（速度、指法、音阶等）。`PracticeSession` 代表一次库内练习或整曲练习。会话中的 `PerformanceRecording` 指向对象存储的音频，`PerformanceAnalysis` 保存异步分析状态与分数，`PerformanceFeedback` 保存可定位到毫秒区间的建议。

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
- `POST /practice-sessions`：提交 `exerciseId` 或 `pieceTitle`（二选一）；整曲可附带 `sheetMusicUrl`、`backingTrackUrl`
- `POST /practice-sessions/:id/recordings`：登记已直传对象存储的音频
- `POST /recordings/:recordingId/analysis`、`GET /recordings/:recordingId/analysis`
- `POST /practice-sessions/:id/complete`、`GET /progress/me`

除健康检查与认证接口外均需要 `Authorization: Bearer <accessToken>`。

## 命令

- `npm run prisma:migrate -- --name <migration_name>`：创建迁移
- `npm run prisma:deploy`：部署迁移
- `npm run prisma:seed`：导入开发练习
- `npm test`、`npm run lint:check`、`npm run format:check`、`npm run build`

## 下一步

接入对象存储的预签名上传、队列 worker 及音频 AI 管线；随后实现曲谱解析和可选的伴奏生成。分析结果应以统一的毫秒时间轴返回，方便前端在波形、曲谱和训练回放中定位问题。
