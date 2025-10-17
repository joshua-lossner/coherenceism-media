# Manual Asset Upload Guide

Since Suno CDN blocks automated downloads (403 errors), here's the manual workflow.

## Step 1: Download from Suno

Visit your Suno library: https://suno.com/@coherent_anomaly

For each album:
1. Click on each song
2. Click the download button (⬇️) to get the MP3
3. Save cover images (right-click → Save Image)

## Step 2: Organize Files

Create this structure in `assets/`:

```
assets/
├── branches-of-coherence/
│   ├── cover.jpg
│   ├── resonance-forms.mp3
│   ├── listening-pattern.mp3
│   └── ... (other tracks)
├── roots-and-resonance/
│   ├── cover.jpg
│   ├── one-field-one-heartbeat.mp3
│   └── ... (other tracks)
└── ... (other albums)
```

**Important naming**:
- Folder name = album slug (from album.md `slug:` field)
- Cover can be: `cover.jpg`, `cover.png`, or `cover.jpeg`
- Track filenames should include the track slug for matching

## Step 3: Get Blob Token

1. Go to https://vercel.com/dashboard
2. Select: **coherenceism-media**
3. Navigate: **Storage** → **Create Database** → **Blob**
4. Copy `BLOB_READ_WRITE_TOKEN`
5. Export in terminal:
   ```bash
   export BLOB_READ_WRITE_TOKEN="your-token-here"
   ```

## Step 4: Upload to Blob

```bash
npm run upload:manual
```

This script:
- Scans `assets/` for album folders
- Uploads covers and tracks to Vercel Blob
- Matches tracks by slug (fuzzy matching)
- Updates CORA `album.md` files with blob URLs

## Step 5: Build & Deploy

```bash
npm run build
vercel --prod
```

## Quick Reference: Album Slugs

Use these folder names in `assets/`:
- `branches-of-coherence`
- `neon-branches`
- `nine-branches`
- `quiet-signals`
- `resonance-hop`
- `roots-and-resonance`
- `signal-of-us`
- `warm-signal`
- `we-are-the-wire`

## Verification

After upload, check that album.md files updated:
```bash
grep "blob.vercel-storage.com" cora/harvest/albums/out/*/album.md
```

You should see blob URLs instead of Suno CDN URLs.

## Troubleshooting

**"No file found for: Track Name"**
- Check that the MP3 filename contains the track slug
- Track slug is in album.md under `tracks:` → `slug:`
- Example: For `slug: one-field-one-heartbeat`, filename could be:
  - `one-field-one-heartbeat.mp3`
  - `One Field One Heartbeat.mp3`
  - `roots-and-resonance--one-field-one-heartbeat.mp3`

**"No assets found in assets/album-slug/"**
- Verify folder name matches album slug exactly
- Check that files are inside the album folder, not root

## Partial Upload

You can upload albums incrementally:
1. Download/organize one album at a time
2. Run `npm run upload:manual` after each
3. Script only uploads what exists, skips missing albums

This way you don't need to download everything at once.
