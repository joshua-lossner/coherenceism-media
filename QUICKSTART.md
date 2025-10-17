# Vercel Blob Migration — Quick Start

Complete migration in 5 steps.

## 1. Get Blob Token

1. Visit: https://vercel.com/dashboard
2. Select project: **coherenceism-media**
3. Go to: **Storage** → **Create Database** → **Blob**
4. Copy your `BLOB_READ_WRITE_TOKEN`
5. In terminal:
   ```bash
   export BLOB_READ_WRITE_TOKEN="your-token-here"
   ```

## 2. Download from Suno

```bash
cd ~/Projects/coherenceism-media
npm run download:suno
```

This downloads all MP3s and covers to `assets/` (gitignored).

## 3. Upload to Blob

```bash
npm run upload:blob
```

This uploads to Vercel Blob and updates CORA album.md files with new URLs.

## 4. Deploy

```bash
npm run build
vercel --prod
```

## 5. Verify

Visit your deployed site and test playback. URLs should point to Vercel Blob.

---

**That's it.** Full details in `MIGRATION.md`.
