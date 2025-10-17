#!/usr/bin/env node

/**
 * Upload MP3 files and cover images to Vercel Blob
 * Updates CORA album.md files with new blob URLs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { put } from '@vercel/blob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSETS_DIR = path.join(__dirname, '../assets');
const TRACKS_DIR = path.join(ASSETS_DIR, 'tracks');
const COVERS_DIR = path.join(ASSETS_DIR, 'covers');
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
  const contentType = filePath.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg';

  const blob = await put(blobPath, fileBuffer, {
    access: 'public',
    token: BLOB_TOKEN,
    contentType,
  });

  return blob.url;
}

async function processAlbum(albumDir) {
  const albumMdPath = path.join(albumDir, 'album.md');
  const content = await fs.readFile(albumMdPath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  const albumSlug = frontmatter.slug;
  console.log(`\n📀 Processing: ${frontmatter.title}`);

  let modified = false;

  // Upload cover image
  if (frontmatter.cover_image && frontmatter.cover_image.includes('suno.ai')) {
    const coverFilename = `${albumSlug}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverFilename);

    try {
      await fs.access(coverPath);
      console.log(`  ⬆️  Uploading cover: ${coverFilename}`);
      const blobUrl = await uploadFile(coverPath, `covers/${coverFilename}`);
      frontmatter.cover_image = blobUrl;
      modified = true;
      console.log(`  ✓ Cover URL: ${blobUrl}`);
    } catch (error) {
      console.log(`  ⊘ Cover file not found locally: ${coverFilename}`);
    }
  }

  // Upload tracks
  if (frontmatter.tracks) {
    for (const track of frontmatter.tracks) {
      if (!track.suno_url) {
        console.log(`  ⊘ Skipping ${track.title} (no suno_url)`);
        continue;
      }

      if (!track.suno_url.includes('suno.ai')) {
        console.log(`  ✓ ${track.title} already migrated`);
        continue;
      }

      const trackFilename = `${albumSlug}--${track.slug}.mp3`;
      const trackPath = path.join(TRACKS_DIR, trackFilename);

      try {
        await fs.access(trackPath);
        console.log(`  ⬆️  Uploading: ${track.title}`);
        const blobUrl = await uploadFile(trackPath, `tracks/${trackFilename}`);
        track.suno_url = blobUrl;
        modified = true;
        console.log(`  ✓ Track URL: ${blobUrl}`);
      } catch (error) {
        console.log(`  ⊘ Track file not found locally: ${trackFilename}`);
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
  console.log('🎵 Uploading music assets to Vercel Blob\n');

  // Check for assets directory
  try {
    await fs.access(ASSETS_DIR);
  } catch {
    console.error('❌ Error: assets/ directory not found');
    console.error('Run `npm run download:suno` first to download assets from Suno\n');
    process.exit(1);
  }

  const albumDirs = await fs.readdir(CORA_ALBUMS_DIR);

  for (const dir of albumDirs) {
    const albumPath = path.join(CORA_ALBUMS_DIR, dir);
    const stat = await fs.stat(albumPath);

    if (stat.isDirectory()) {
      try {
        await processAlbum(albumPath);
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
