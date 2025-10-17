#!/usr/bin/env node

/**
 * Upload manually downloaded MP3 files and cover images to Vercel Blob
 * Expects files in assets/ organized by album
 * Updates CORA album.md files with new blob URLs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { put } from '@vercel/blob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSETS_DIR = path.join(__dirname, '../assets');
const CORA_ALBUMS_DIR = path.join(__dirname, '../cora/harvest/albums/out');

// You'll need to set this environment variable:
// BLOB_READ_WRITE_TOKEN from your Vercel dashboard
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable not set');
  console.error('\nTo get your token:');
  console.error('1. Go to https://vercel.com/dashboard');
  console.error('2. Select your project (coherenceism-media)');
  console.error('3. Go to Storage → Create Database → Blob');
  console.error('4. Copy the BLOB_READ_WRITE_TOKEN');
  console.error('5. Run: export BLOB_READ_WRITE_TOKEN="your-token-here"\n');
  process.exit(1);
}

async function uploadFile(filePath, blobPath) {
  const fileBuffer = await fs.readFile(filePath);
  const contentType = filePath.endsWith('.mp3') ? 'audio/mpeg' :
                     filePath.endsWith('.jpg') ? 'image/jpeg' :
                     filePath.endsWith('.jpeg') ? 'image/jpeg' :
                     filePath.endsWith('.png') ? 'image/png' : 'application/octet-stream';

  const blob = await put(blobPath, fileBuffer, {
    access: 'public',
    token: BLOB_TOKEN,
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
}

async function scanAssets() {
  const albumDirs = await fs.readdir(ASSETS_DIR);
  const assetMap = new Map();

  for (const dir of albumDirs) {
    const albumPath = path.join(ASSETS_DIR, dir);
    const stat = await fs.stat(albumPath);

    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(albumPath);
    const albumSlug = dir;

    assetMap.set(albumSlug, {
      cover: null,
      tracks: []
    });

    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png)$/i)) {
        assetMap.get(albumSlug).cover = path.join(albumPath, file);
      } else if (file.endsWith('.mp3')) {
        assetMap.get(albumSlug).tracks.push({
          filename: file,
          path: path.join(albumPath, file)
        });
      }
    }
  }

  return assetMap;
}

async function processAlbum(albumDir, assetMap) {
  const albumMdPath = path.join(albumDir, 'album.md');
  const content = await fs.readFile(albumMdPath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  const albumSlug = frontmatter.slug;
  console.log(`\n📀 Processing: ${frontmatter.title}`);

  const assets = assetMap.get(albumSlug);
  if (!assets) {
    console.log(`  ⊘ No assets found in assets/${albumSlug}/`);
    return;
  }

  let modified = false;

  // Upload cover image
  if (assets.cover) {
    // Check if already using blob URL
    if (frontmatter.cover_image && frontmatter.cover_image.includes('blob.vercel-storage.com')) {
      console.log(`  ✓ Cover already uploaded`);
    } else {
      console.log(`  ⬆️  Uploading cover...`);
      const ext = path.extname(assets.cover);
      const blobUrl = await uploadFile(assets.cover, `covers/${albumSlug}${ext}`);
      frontmatter.cover_image = blobUrl;
      modified = true;
      console.log(`  ✓ Cover URL: ${blobUrl}`);
    }
  }

  // Upload tracks
  if (frontmatter.tracks && assets.tracks.length > 0) {
    for (const track of frontmatter.tracks) {
      // Normalize strings for matching: remove hyphens, spaces, and lowercase
      const normalizeForMatch = (str) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSlug = normalizeForMatch(track.slug);
      const normalizedTitle = normalizeForMatch(track.title);

      // Try to match by slug or title
      const matchingFile = assets.tracks.find(f => {
        const normalizedFilename = normalizeForMatch(f.filename);
        return normalizedFilename.includes(normalizedSlug) ||
               normalizedFilename.includes(normalizedTitle);
      });

      if (matchingFile) {
        // Check if already using blob URL
        if (track.suno_url && track.suno_url.includes('blob.vercel-storage.com')) {
          console.log(`  ✓ ${track.title} already uploaded`);
        } else {
          console.log(`  ⬆️  Uploading: ${track.title}`);
          const blobUrl = await uploadFile(
            matchingFile.path,
            `tracks/${albumSlug}--${track.slug}.mp3`
          );
          track.suno_url = blobUrl;
          modified = true;
          console.log(`  ✓ Track URL: ${blobUrl}`);
        }
      } else {
        console.log(`  ⊘ No file found for: ${track.title} (expected: ${track.slug})`);
      }
    }
  }

  // Write updated album.md if modified
  if (modified) {
    const updatedContent = matter.stringify(body, frontmatter);
    await fs.writeFile(albumMdPath, updatedContent, 'utf-8');
    console.log(`  💾 Updated: album.md`);
  }
}

async function main() {
  console.log('🎵 Uploading manually organized assets to Vercel Blob\n');

  // Check for assets directory
  try {
    await fs.access(ASSETS_DIR);
  } catch {
    console.error('❌ Error: assets/ directory not found');
    console.error('\nExpected structure:');
    console.error('assets/');
    console.error('  ├── album-slug-1/');
    console.error('  │   ├── cover.jpg');
    console.error('  │   ├── track-1.mp3');
    console.error('  │   └── track-2.mp3');
    console.error('  └── album-slug-2/');
    console.error('      ├── cover.png');
    console.error('      └── ...\n');
    process.exit(1);
  }

  console.log('📂 Scanning assets directory...');
  const assetMap = await scanAssets();
  console.log(`Found assets for ${assetMap.size} albums`);

  const albumDirs = await fs.readdir(CORA_ALBUMS_DIR);

  for (const dir of albumDirs) {
    const albumPath = path.join(CORA_ALBUMS_DIR, dir);
    const stat = await fs.stat(albumPath);

    if (stat.isDirectory()) {
      try {
        await processAlbum(albumPath, assetMap);
      } catch (error) {
        console.error(`  ✗ Error processing ${dir}:`, error.message);
      }
    }
  }

  console.log('\n✅ Upload complete!');
  console.log('\nNext steps:');
  console.log('1. Run `npm run build` to rebuild the site with new URLs');
  console.log('2. Run `vercel --prod` to deploy\n');
}

main().catch(console.error);
