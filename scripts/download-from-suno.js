#!/usr/bin/env node

/**
 * Download MP3 files and cover images from Suno CDN URLs
 * Reads album.md files from CORA, downloads assets to local storage
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CORA_ALBUMS_DIR = path.join(__dirname, '../cora/harvest/albums/out');
const ASSETS_DIR = path.join(__dirname, '../assets');
const TRACKS_DIR = path.join(ASSETS_DIR, 'tracks');
const COVERS_DIR = path.join(ASSETS_DIR, 'covers');

async function ensureDirectories() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.mkdir(TRACKS_DIR, { recursive: true });
  await fs.mkdir(COVERS_DIR, { recursive: true });
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return https.get(response.headers.location, (redirectResponse) => {
          const file = fsSync.createWriteStream(destPath);
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${url} (status: ${response.statusCode})`));
        return;
      }

      const file = fsSync.createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function processAlbum(albumDir) {
  const albumMdPath = path.join(albumDir, 'album.md');
  const content = await fs.readFile(albumMdPath, 'utf-8');
  const { data: frontmatter } = matter(content);

  const albumSlug = frontmatter.slug;
  console.log(`\n📀 Processing: ${frontmatter.title}`);

  // Download cover image
  if (frontmatter.cover_image) {
    const coverFilename = `${albumSlug}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverFilename);

    try {
      await fs.access(coverPath);
      console.log(`  ✓ Cover already exists: ${coverFilename}`);
    } catch {
      console.log(`  ⬇️  Downloading cover: ${frontmatter.cover_image}`);
      await downloadFile(frontmatter.cover_image, coverPath);
      console.log(`  ✓ Saved: ${coverFilename}`);
    }
  }

  // Download tracks
  if (!frontmatter.tracks) return;

  for (const track of frontmatter.tracks) {
    if (!track.suno_url) {
      console.log(`  ⊘ Skipping ${track.title} (no URL)`);
      continue;
    }

    const trackFilename = `${albumSlug}--${track.slug}.mp3`;
    const trackPath = path.join(TRACKS_DIR, trackFilename);

    try {
      await fs.access(trackPath);
      console.log(`  ✓ Track already exists: ${track.title}`);
    } catch {
      console.log(`  ⬇️  Downloading: ${track.title}`);
      await downloadFile(track.suno_url, trackPath);
      console.log(`  ✓ Saved: ${trackFilename}`);
    }
  }
}

async function main() {
  console.log('🎵 Downloading music assets from Suno CDN\n');

  await ensureDirectories();

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

  console.log('\n✅ Download complete!');
  console.log(`\nAssets saved to:`);
  console.log(`  - Covers: ${COVERS_DIR}`);
  console.log(`  - Tracks: ${TRACKS_DIR}`);
}

main().catch(console.error);
