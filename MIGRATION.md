# Migration to Vercel Blob Storage

This document outlines the process for migrating from Suno CDN URLs to self-hosted Vercel Blob storage.

## Why Migrate?

- **Durability** — Own your assets; no dependency on Suno CDN availability
- **Control** — Manage your own URLs and file lifecycle
- **Performance** — Vercel's edge network delivers globally
- **Simplicity** — No Puppeteer scraping or session management

## Prerequisites

1. **Vercel account** with project linked (`vercel link` already completed)
2. **Blob storage** enabled on your Vercel project
3. **BLOB_READ_WRITE_TOKEN** from Vercel dashboard

## Setup Vercel Blob

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `coherenceism-media`
3. Navigate to: **Storage** → **Create Database** → **Blob**
4. Copy your `BLOB_READ_WRITE_TOKEN`
5. Save to environment:
   ```bash
   export BLOB_READ_WRITE_TOKEN="your-token-here"
   ```

## Migration Steps

### Step 1: Download Assets from Suno

Download all MP3 files and cover images from Suno CDN to local storage:

```bash
npm run download:suno
```

This will create:
- `assets/tracks/` — MP3 files (named `{album-slug}--{track-slug}.mp3`)
- `assets/covers/` — Album cover images (named `{album-slug}.jpg`)

**Note**: The `assets/` directory is gitignored.

### Step 2: Upload to Vercel Blob

Upload all local assets to Vercel Blob and update CORA album.md files:

```bash
npm run upload:blob
```

This script:
1. Uploads each MP3 to Vercel Blob (`tracks/{filename}`)
2. Uploads each cover image to Vercel Blob (`covers/{filename}`)
3. Updates `suno_url` fields in CORA album.md files with new blob URLs
4. Updates `cover_image` fields with blob URLs

**Important**: Ensure `BLOB_READ_WRITE_TOKEN` is set before running this.

### Step 3: Rebuild Site

Sync updated album.md files and rebuild the static site:

```bash
npm run build
```

### Step 4: Deploy to Vercel

Deploy the updated site to production:

```bash
vercel --prod
```

Or push to your git repository if you have automatic deployments configured.

## Verification

After deployment:

1. Visit your site: `https://coherenceism-media.vercel.app` (or your custom domain)
2. Test album playback — URLs should now point to Vercel Blob
3. Check browser network tab to confirm blob URLs (format: `https://[hash].public.blob.vercel-storage.com/...`)

## Cleanup (Optional)

Once migration is verified, you can remove Suno-related scripts:

- `scripts/sync-suno-urls.js` — No longer needed
- `scripts/explore-suno-dom.js` — Development script
- `.suno-session.json` — Puppeteer session file
- Remove `puppeteer` from package.json dependencies

```bash
npm uninstall puppeteer
```

## Rollback

If you need to revert:

1. The original Suno URLs are preserved in git history
2. Assets remain in `assets/` directory locally
3. Blob files persist in Vercel (no automatic deletion)

## Cost Considerations

Vercel Blob pricing (as of 2024):

- **Storage**: ~$0.15/GB/month
- **Bandwidth**: First 100GB free, then $0.20/GB

**Estimated costs** for this project:
- ~81 songs × ~4MB avg = ~324MB storage = **$0.05/month**
- Bandwidth depends on traffic (free tier likely sufficient)

## Troubleshooting

### "BLOB_READ_WRITE_TOKEN not set"

Make sure you've exported the token in your shell session:
```bash
export BLOB_READ_WRITE_TOKEN="your-token-from-vercel"
```

### "assets/ directory not found"

Run `npm run download:suno` first to download files from Suno CDN.

### Upload fails with 401/403

- Check that your token is valid and not expired
- Ensure your Vercel project has Blob storage enabled
- Verify you're using the correct token (not API token, but BLOB token specifically)

### File not found during download

Some tracks may not have `suno_url` populated yet. The script will skip these gracefully.

## Support

For Vercel Blob documentation:
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Blob API Reference](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)
