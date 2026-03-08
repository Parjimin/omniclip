# OmniClip

Web app Next.js fullstack untuk generate halaman manga visual 4-20 panel dengan AI Qwen + WAN2.6, branching story choice, SSE progress, dan embeddable Ramadan Dino mini-game.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

App berjalan di `http://localhost:3000`.

## Environment

- `QWEN_API_KEY` (required)
- `QWEN_BASE_URL` default: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- `QWEN_CHAT_ENDPOINT` default: `/chat/completions`
- `QWEN_CHAT_MODEL` default: `qwen3.5-plus`
- `QWEN_TIMEOUT_MS` default: `180000`
- `IMAGE_PROVIDER` default: `wan` (`wan` | `qwen`)
- `WAN_API_KEY` (fallback ke `QWEN_API_KEY` jika kosong)
- `WAN_BASE_URL` default: `https://dashscope-intl.aliyuncs.com/api/v1`
- `WAN_MODEL` default: `wan2.6-image`
- `WAN_USE_ASYNC` default: `true`
- `WAN_ASYNC_ENDPOINT` default: `/services/aigc/image-generation/generation`
- `WAN_TASK_ENDPOINT` default: `/tasks/{taskId}`
- `WAN_SIZE` default: `1024*1536` (portrait comic page)
- `QWEN_IMAGE_ENDPOINT` default: `/images/generations` (dipakai jika `IMAGE_PROVIDER=qwen`)
- `QWEN_IMAGE_MODEL` default: `qwen-image-edit-max` (fallback provider qwen)
- `DEBUG_FORCE_SINGLE_PANEL` default: `false` (set `true` hanya untuk debug cepat 1 panel).

## Flow

1. Form awal (`/`)
2. Story branching (`/story/[sessionId]`)
3. Generate + mini-game (`/generate/[jobId]`)
4. Hasil viewer + download (`/result/[jobId]`)

## Studio-like Setup (mirip flow generator manga modern)

Form awal sekarang sederhana:
- `Story Setup`: nama, tema, art style, jumlah panel, foto.
- `Prompt Tambahan`: template plain text editable untuk custom karakter + arahan visual.

Prompt ini ikut masuk ke:
- prompt story graph (Qwen3.5-Plus),
- panel plan (Qwen3.5-Plus),
- prompt render panel (WAN2.6 / fallback Qwen image).

Progress bar generate juga membaca jumlah file panel nyata di `storage/jobs/<jobId>/panels`.

Default visual saat ini:
- Grid engine: `dynamic` (rotasi template aksi).
- Bubble style viewer: `bold shonen`.

## API Ringkas

- `POST /api/session/create`
- `POST /api/story/graph`
- `POST /api/story/choose`
- `POST /api/generation/start`
- `GET /api/generation/stream/[jobId]` (SSE)
- `GET /api/generation/result/[jobId]`
- `GET /api/generation/download/[jobId]?format=pdf|zip|panel&index=1`

## Ramadan Dino Module API

Module: `src/features/ramadan-dino`

```ts
init(containerEl, options?)
start()
stop(reason?)
getScore()
getState()
```

Callbacks:
- `onScoreChange(score)`
- `onExit(reason)`
- `onGameOver(finalScore)`

## Style Packs

Isi folder:
- `public/style-packs/naruto`
- `public/style-packs/one-piece`
- `public/style-packs/jujutsu-kaisen`

Nama file referensi yang dipakai loader:
- `action-1.(png|jpg|jpeg|webp)`
- `action-2.(png|jpg|jpeg|webp)`
- `action-3.(png|jpg|jpeg|webp)`
- `closeup-1.(png|jpg|jpeg|webp)`
- `environment-1.(png|jpg|jpeg|webp)`

Lihat detail di `public/style-packs/README.md`.
