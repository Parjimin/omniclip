# Pitch Deck Brief

## Ringkasan Repo

- Nama produk di codebase: `OmniClip`.
- Bentuk produk: aplikasi web `Next.js 15 + React 19 + TypeScript` untuk membuat halaman manga/komik dari input user.
- Flow produk yang benar-benar ada: landing form -> story choice -> generation screen dengan progress SSE + mini game -> result viewer + download `PDF/ZIP`.
- Output nyata tersimpan di `storage/jobs/*` dan `storage/sessions/*`, jadi MVP ini sudah menghasilkan artefak yang bisa didemokan.
- Image generation aktif memakai adapter `WAN 2.6` atau `Qwen Image`.
- Story branching dan panel planning yang aktif saat ini bersifat template/rule-based. Service `Qwen35Service` sudah ada, tetapi belum dipakai di alur runtime aktif.

## Produk Ini Sebenarnya Apa

Produk ini paling tepat diposisikan sebagai `AI-native manga page generator` yang menggabungkan:

- input user berupa nama, tema, genre, style, jumlah panel, dan foto opsional,
- story engine yang menyusun alur bercabang,
- prompt engine yang mengunci konsistensi karakter dan layout panel,
- image generation dengan style references,
- export hasil ke format yang siap dibagikan.

Bukan posisi yang tepat:

- bukan SaaS kolaborasi tim,
- bukan social network creator,
- bukan marketplace,
- bukan studio pipeline production-grade,
- bukan LLM storyteller penuh yang sudah aktif di produksi.

## Fakta Penting Untuk Pitch

### Klaim yang aman

- User bisa membuat manga personal dengan karakter yang menyerupai dirinya melalui foto referensi opsional.
- User memilih arah cerita, bukan hanya menulis satu prompt generik.
- Sistem menjaga konsistensi visual melalui `character preferences`, `continuity rules`, `layout template`, dan `style pack`.
- Hasil akhir bisa diunduh sebagai kumpulan panel PNG dan file PDF.
- Waktu tunggu generation tidak kosong karena ada mini game `Ramadan Dino` di layar progress.
- MVP sudah punya persistensi lokal berbasis file, event log, dan streaming progress.

### Klaim yang harus hati-hati

- README menyebut `Qwen 3.5` untuk story graph dan panel planning, tetapi route aktif saat ini memakai planner statis di `src/features/manga/story-orchestrator.ts`.
- Struktur data masih menyimpan `dialogue` dan `bubble anchor`, tetapi prompt aktif justru meminta hasil tanpa bubble chat. Jadi deck sebaiknya menyebut produk ini sebagai `visual-first manga generator`, bukan `full dialogue composition engine`.
- Style packs memakai nama IP anime populer seperti `Naruto`, `One Piece`, dan `Jujutsu Kaisen`. Untuk pitch eksternal, lebih aman menyebutnya `anime-inspired style packs`, kecuali Anda memang punya izin atau konteks demo internal.

### Hal yang belum ada

- auth,
- billing,
- analytics,
- database/cloud storage,
- moderation,
- job queue terpisah,
- multi-user collaboration,
- monetization data,
- traction data,
- market sizing.

## Arsitektur Singkat

### Frontend

- `src/app/page.tsx`: landing page untuk setup cerita, style, panel count, dan foto.
- `src/app/story/[sessionId]/page.tsx`: user memilih cabang cerita kiri/kanan.
- `src/app/generate/[jobId]/page.tsx`: progress screen dengan SSE dan mini game.
- `src/app/result/[jobId]/page.tsx`: viewer hasil serta tombol download.

### Backend

- `src/app/api/session/create/route.ts`: buat session dan simpan foto.
- `src/app/api/story/*`: bangun story graph dan simpan choice.
- `src/app/api/generation/*`: start job, stream progress, ambil result, download file.
- `src/lib/runtime-store.ts`: session/job state in-memory + persist ke `storage`.

### Core engine

- `src/features/manga/story-orchestrator.ts`: story graph, outline, character bible, panel spec.
- `src/features/manga/prompt-builder.ts`: prompt panel final.
- `src/features/manga/grid-template-library.ts`: template layout panel.
- `src/features/manga/image-orchestrator.ts`: provider image, style references, continuity image, negative prompt.
- `src/features/manga/generation-orchestrator.ts`: jalankan full pipeline sampai export.

### Adapter AI

- Aktif: `wan-image-service`, `wan-client`, `qwen-image-edit-service`, `qwen-image-20-generate-service`.
- Disiapkan untuk iterasi berikutnya: `Qwen35Service`, `QwenImage20RefineService`, `Wan25ImageRefineService`.

## Posisi Produk Yang Paling Kuat

Kalimat satu baris:

`MangaFlow mengubah preferensi user, foto, dan pilihan cerita menjadi halaman manga yang konsisten, personal, dan siap dibagikan.`

Kalimat tiga baris:

`Sebagian besar tools AI image masih berhenti di gambar tunggal.`
`MangaFlow menyusun alur, karakter, layout, dan style references menjadi pengalaman membuat manga yang lebih terstruktur.`
`Hasilnya bukan sekadar ilustrasi, tetapi paket komik visual yang siap dilihat dan diunduh.`

Angle paling masuk akal untuk deck:

- `Personalized manga experience`
- `structured AI storytelling for visual comics`
- `consumer entertainment + creator tool wedge`

## Target User Yang Masuk Akal

Ini inferensi dari produk, bukan data eksplisit dari repo:

- Fans anime/manga yang ingin jadi karakter utama dalam komik mereka sendiri.
- Event atau campaign brand yang ingin membuat pengalaman personal berbentuk komik.
- Creator dan studio kecil yang butuh storyboard atau manga mockup lebih cepat.
- Komunitas fandom yang suka konten shareable, themed, dan personalized.

## Diferensiasi Yang Layak Diangkat

- Bukan cuma prompt-to-image, tetapi `flow-to-comic`.
- Ada `branching choice`, jadi user ikut membentuk cerita.
- Ada `style pack system`, bukan hanya style text prompt.
- Ada `continuity lock` untuk karakter dan setting.
- Ada `layout engine` berbasis grid template.
- Ada `artifact export` ke PDF/ZIP, bukan berhenti di preview.
- Ada `wait-time engagement layer` lewat mini game.

## Kelemahan MVP Yang Harus Diakui

- Story generation aktif masih template-based.
- Persistensi masih lokal berbasis file.
- Belum ada infrastruktur production untuk scale.
- Belum ada safety/moderation untuk penggunaan foto dan style/IP.
- Belum ada metrik bisnis atau user growth di repo.
- Masih ada artefak eksperimen UI di root seperti `generating-prompt.txt`, `hero-prompt.txt`, dan `chatbox-prompt.txt` yang bukan inti produk.

## Narasi Pitch Yang Disarankan

Narasi terbaik untuk deck ini bukan:

- `kami sudah membangun platform AI comic paling lengkap`

Narasi yang lebih kuat:

- `kami sudah membangun MVP yang membuktikan pengalaman membuat manga personal bisa dibuat jauh lebih terstruktur daripada text-to-image generik`
- `kami sudah memiliki fondasi pipeline visual, export, style system, dan engagement loop`
- `langkah berikutnya adalah mengaktifkan LLM story planning penuh, menambah distribution, dan mengubah demo engine ini menjadi produk yang repeatable`

## Struktur Slide Yang Disarankan

### Slide 1 - Cover

- Judul: `MangaFlow`
- Subjudul: `AI-native manga generator for personalized visual storytelling`
- Pesan inti: ini adalah generator manga yang personal, terstruktur, dan shareable.
- Visual: tampilkan 2-4 contoh panel hasil, nuansa manga editorial, bukan template corporate biasa.

### Slide 2 - Problem

- Banyak tools AI image menghasilkan gambar tunggal, bukan pengalaman membaca cerita.
- Konsistensi karakter, layout, dan alur masih sulit dijaga.
- Untuk user non-expert, prompt engineering masih terlalu berat.

### Slide 3 - Solution

- MangaFlow mengubah preferensi user, foto, dan pilihan cerita menjadi halaman manga siap unduh.
- Sistem menyusun story beats, layout panel, style references, dan continuity lock.
- User tidak perlu mengatur prompt teknis berulang kali.

### Slide 4 - Product Flow

- Setup karakter dan style.
- Pilih cabang cerita kiri/kanan.
- Tunggu generation sambil tetap engaged.
- Lihat hasil dan unduh sebagai PDF/ZIP.

### Slide 5 - Why This Is Different

- `branching story`
- `style-pack based rendering`
- `continuity-aware prompt engine`
- `export-ready comic artifact`
- `engaging wait-screen experience`

### Slide 6 - What The MVP Already Proves

- End-to-end flow sudah jalan dari input sampai output.
- Hasil generation dan event log sudah tersimpan sebagai artefak nyata di repo.
- TypeScript codebase sudah punya validasi, test files, dan type-safe structure.
- Typecheck lolos. Test runner saat ini terhalang mismatch `esbuild` Windows vs Linux di `node_modules`.

### Slide 7 - Initial Wedge

- Personalized manga for fans.
- Branded story experiences for campaigns.
- Fast comic mockups for creators and small studios.

### Slide 8 - Business Model

Bagian ini belum ada di repo. Isi dengan data founder.

- Opsi 1: pay per manga generation.
- Opsi 2: premium style packs / personalization packs.
- Opsi 3: B2B campaign activation for brands and events.

### Slide 9 - Roadmap

- Aktifkan `Qwen35Service` ke story planning runtime.
- Tambahkan cloud storage, account system, dan async job infra.
- Bangun moderation, IP-safe original style packs, dan analytics.
- Kembangkan distribution layer untuk repeat usage.

### Slide 10 - Ask / Closing

- Jika deck untuk investor: minta pilot, design partners, atau pre-seed conversation.
- Jika deck untuk client/partner: minta proof-of-concept campaign.
- Jika deck untuk internal: minta prioritas roadmap dan resource engineering.

## Data Yang Harus Anda Isi Sendiri

Bagian berikut tidak ditemukan di repo dan sebaiknya tidak diada-adakan:

- market size,
- traction,
- monthly active users,
- CAC/LTV,
- revenue,
- conversion,
- team profile,
- fundraising ask,
- go-to-market channel performance.

## Visual Direction Untuk AI PPT

- Gaya visual: `editorial manga x modern product deck`
- Warna: navy gelap, krem kertas, oranye hangat, hitam tinta
- Hindari: ungu default, glassmorphism generik, layout startup template yang terlalu standar
- Gunakan: screenshot flow, grid komik, panel borders, kontras tinggi, tipografi tegas
- Tone: ambisius tapi jujur, demo-first, bukan overclaim

## Lampiran Bukti Repo

- Landing/setup: `src/app/page.tsx`
- Story choice: `src/app/story/[sessionId]/page.tsx`
- Progress + mini game: `src/app/generate/[jobId]/page.tsx`
- Result viewer: `src/app/result/[jobId]/page.tsx`
- Story planner aktif: `src/features/manga/story-orchestrator.ts`
- Image orchestration: `src/features/manga/image-orchestrator.ts`
- Job sample: `storage/jobs/51a8f27f-daea-4186-8810-af0aa96d27eb/job.json`
