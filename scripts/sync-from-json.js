#!/usr/bin/env node

/**
 * Sync Suno URLs from JSON
 *
 * Simple approach: You copy-paste JSON from Suno's library page,
 * this script updates CORA album files.
 *
 * Usage:
 *   1. Open app.suno.ai and go to your library
 *   2. Open DevTools Console (Cmd+Option+J)
 *   3. Run: copy(JSON.stringify(Array.from(document.querySelectorAll('audio')).map(a => ({title: a.closest('[class*="song"]')?.textContent?.trim(), url: a.src}))))
 *   4. Paste below when prompted
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const coraPath = path.join(projectRoot, 'cora');
const albumsPath = path.join(coraPath, 'harvest/albums/out');

console.log('🎵 Suno URL Sync (Manual JSON Input)\n');

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCoraAlbums() {
  const albums = [];
  if (!fs.existsSync(albumsPath)) return albums;

  const albumDirs = fs.readdirSync(albumsPath);
  for (const dir of albumDirs) {
    const albumFile = path.join(albumsPath, dir, 'album.md');
    if (fs.existsSync(albumFile)) {
      const content = fs.readFileSync(albumFile, 'utf-8');
      const { data: frontmatter } = matter(content);
      albums.push({
        slug: frontmatter.slug || dir,
        title: frontmatter.title,
        tracks: frontmatter.tracks || [],
        path: albumFile
      });
    }
  }
  return albums;
}

function matchAndUpdate(sunoSongs, coraAlbums) {
  const matches = [];

  for (const album of coraAlbums) {
    for (const track of album.tracks) {
      if (track.suno_url) continue;

      const normalizedTrackTitle = normalizeTitle(track.title);
      const match = sunoSongs.find(song => {
        if (!song.title || !song.url) return false;
        const normalizedSongTitle = normalizeTitle(song.title);
        return normalizedSongTitle.includes(normalizedTrackTitle) ||
               normalizedTrackTitle.includes(normalizedSongTitle);
      });

      if (match) {
        matches.push({
          album: album.slug,
          track: track.title,
          url: match.url,
          albumPath: album.path
        });
      }
    }
  }

  return matches;
}

function updateAlbumFiles(matches) {
  const albumUpdates = new Map();

  for (const match of matches) {
    if (!albumUpdates.has(match.albumPath)) {
      albumUpdates.set(match.albumPath, []);
    }
    albumUpdates.get(match.albumPath).push(match);
  }

  for (const [albumPath, trackMatches] of albumUpdates) {
    const content = fs.readFileSync(albumPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    let updated = false;

    if (frontmatter.tracks) {
      for (const match of trackMatches) {
        const track = frontmatter.tracks.find(t => normalizeTitle(t.title) === normalizeTitle(match.track));
        if (track && !track.suno_url) {
          track.suno_url = match.url;
          updated = true;
          console.log(`   ✅ ${match.track}`);
        }
      }
    }

    if (updated) {
      const updatedContent = matter.stringify(body, frontmatter);
      fs.writeFileSync(albumPath, updatedContent);
      console.log(`\n📝 Updated: ${path.relative(coraPath, albumPath)}\n`);
    }
  }
}

async function promptForJSON() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('📋 Instructions:');
  console.log('   1. Open https://app.suno.ai in your browser');
  console.log('   2. Navigate to your library/songs page');
  console.log('   3. Open DevTools Console (Cmd+Option+J on Mac)');
  console.log('   4. Paste this command:\n');
  console.log('      copy(JSON.stringify(window.__NEXT_DATA__?.props?.pageProps?.clips || []))');
  console.log('\n   5. Come back here and paste the JSON (then press Enter twice):\n');

  return new Promise((resolve) => {
    let input = '';
    rl.on('line', (line) => {
      if (line.trim() === '' && input.length > 0) {
        rl.close();
        resolve(input);
      } else {
        input += line + '\n';
      }
    });
  });
}

async function main() {
  // Load albums
  console.log('📀 Loading CORA albums...\n');
  const coraAlbums = loadCoraAlbums();
  console.log(`   Found ${coraAlbums.length} albums\n`);

  let missingCount = 0;
  for (const album of coraAlbums) {
    for (const track of album.tracks) {
      if (!track.suno_url) missingCount++;
    }
  }
  console.log(`   ${missingCount} tracks missing suno_url\n`);

  if (missingCount === 0) {
    console.log('✅ All tracks already have URLs!\n');
    return;
  }

  // Get JSON input
  const jsonInput = await promptForJSON();

  let sunoSongs;
  try {
    sunoSongs = JSON.parse(jsonInput);
    if (!Array.isArray(sunoSongs)) {
      sunoSongs = [sunoSongs];
    }
  } catch (error) {
    console.error('❌ Invalid JSON. Please try again.\n');
    process.exit(1);
  }

  console.log(`\n✅ Parsed ${sunoSongs.length} songs from JSON\n`);

  // Match and update
  console.log('🔗 Matching songs to CORA tracks...\n');
  const matches = matchAndUpdate(sunoSongs, coraAlbums);
  console.log(`   Found ${matches.length} matches\n`);

  if (matches.length === 0) {
    console.log('⚠️  No matches found.\n');
    return;
  }

  console.log('📝 Updating album files...\n');
  updateAlbumFiles(matches);

  console.log('\n✅ Sync complete!\n');
  console.log(`📊 Summary: ${matches.length} URLs added\n`);
}

main().catch(console.error);
