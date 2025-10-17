#!/usr/bin/env node

/**
 * Suno URL Sync Script
 *
 * Fetches your Suno library and auto-populates missing suno_url fields in CORA album.md files.
 *
 * Prerequisites:
 *   npm install puppeteer
 *
 * Usage:
 *   node scripts/sync-suno-urls.js
 *
 * Flow:
 *   1. Opens Suno in headless browser (or headed for first auth)
 *   2. Waits for you to authenticate (first run only, saves session)
 *   3. Scrapes your library for song titles + MP3 URLs
 *   4. Matches songs to CORA tracks by title (fuzzy match)
 *   5. Updates album.md files with missing suno_url fields
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const coraPath = path.join(projectRoot, 'cora');
const albumsPath = path.join(coraPath, 'harvest/albums/out');
const sessionFile = path.join(projectRoot, '.suno-session.json');

// Configuration
const SUNO_PROFILE_URL = 'https://suno.com/@coherent_anomaly';
const HEADLESS = fs.existsSync(sessionFile); // Headless if session exists

console.log('🎵 Suno URL Sync\n');

/**
 * Normalize song title for matching
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Load session cookies
 */
function loadSession() {
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
}

/**
 * Save session cookies
 */
async function saveSession(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(sessionFile, JSON.stringify(cookies, null, 2));
  console.log('✅ Session saved to .suno-session.json\n');
}

/**
 * Fetch Suno library songs
 */
async function fetchSunoLibrary() {
  console.log('🌐 Launching browser...\n');

  const browser = await puppeteer.launch({
    headless: HEADLESS ? 'new' : false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  // Load existing session
  const session = loadSession();
  if (session) {
    console.log('🔑 Loading saved session...\n');
    await page.setCookie(...session);
  }

  // Navigate to profile
  console.log('📚 Navigating to Suno profile...\n');
  await page.goto(SUNO_PROFILE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for page to load
  console.log('⏳ Waiting for songs to load...\n');
  try {
    await page.waitForSelector('audio, a[href*="/song/"], [class*="song"]', {
      timeout: 30000
    });
  } catch (error) {
    console.error('❌ Could not find songs on profile page.');
    await browser.close();
    process.exit(1);
  }

  // Scroll to load all songs
  console.log('📜 Scrolling to load all songs...\n');
  await autoScroll(page);

  // Extract song data
  console.log('🔍 Extracting song data...\n');
  const songs = await page.evaluate(() => {
    const songData = [];

    // Strategy 1: Look for audio elements with src
    document.querySelectorAll('audio').forEach(audio => {
      const src = audio.src || audio.querySelector('source')?.src;
      if (src && (src.includes('.mp3') || src.includes('cdn1.suno.ai') || src.includes('cdn2.suno.ai'))) {
        // Try to find title in parent elements - be more aggressive
        let titleEl = null;
        let parent = audio.parentElement;

        // Walk up the DOM tree looking for a title
        for (let i = 0; i < 10 && parent; i++) {
          titleEl = parent.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
          if (titleEl && titleEl.textContent?.trim()) break;
          parent = parent.parentElement;
        }

        const title = titleEl?.textContent?.trim();
        if (title && src) {
          songData.push({ title, url: src });
        }
      }
    });

    // Strategy 2: Look for song links and try to extract data from Next.js data
    document.querySelectorAll('a[href*="/song/"], a[href*="/s/"]').forEach(link => {
      const href = link.href;
      const songId = href.match(/\/(?:song|s)\/([^/?]+)/)?.[1];

      // Try multiple title extraction strategies
      let title = link.getAttribute('aria-label') || link.getAttribute('title');
      if (!title) {
        title = link.querySelector('h1, h2, h3, h4, [class*="title"]')?.textContent?.trim();
      }
      if (!title) {
        title = link.textContent?.trim();
      }

      if (title && songId) {
        // Clean up title (remove extra whitespace, icons, etc)
        title = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
        songData.push({ title, songId, linkHref: href });
      }
    });

    // Remove duplicates by title
    const seen = new Set();
    return songData.filter(song => {
      if (seen.has(song.title)) return false;
      seen.add(song.title);
      return true;
    });
  });

  console.log(`✅ Found ${songs.length} songs in library\n`);

  // For songs without direct URLs, fetch them from their individual pages
  const songsWithoutUrls = songs.filter(s => !s.url && s.linkHref);

  if (songsWithoutUrls.length > 0) {
    console.log(`🔗 Fetching MP3 URLs for ${songsWithoutUrls.length} songs...\n`);

    for (const song of songsWithoutUrls) {
      try {
        console.log(`   Loading: ${song.title}`);
        await page.goto(song.linkHref, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract MP3 URL from Next.js data or audio element
        const extractionResult = await page.evaluate(() => {
          const debug = {
            audioElementFound: false,
            scriptsChecked: 0,
            nextDataFound: false,
            mp3Url: null
          };

          // Strategy 1: Look for audio element
          const audio = document.querySelector('audio');
          if (audio) {
            debug.audioElementFound = true;
            const src = audio.src || audio.querySelector('source')?.src;
            if (src && (src.includes('.mp3') || src.includes('cdn'))) {
              debug.mp3Url = src;
              return debug;
            }
          }

          // Strategy 2: Parse Next.js RSC payload for audio URLs
          const scripts = document.querySelectorAll('script');
          debug.scriptsChecked = scripts.length;
          for (const script of scripts) {
            const content = script.textContent || '';
            // Try multiple patterns for Suno CDN URLs
            const patterns = [
              /"audio_url":"(https?:\/\/cdn[^"]+\.mp3)"/,
              /"audio_url\\":\\"(https?:\/\/cdn[^"]+\.mp3)\\"/,
              /https?:\/\/cdn1\.suno\.ai\/[a-f0-9-]+\.mp3/,
              /https?:\/\/cdn2\.suno\.ai\/[a-f0-9-]+\.mp3/
            ];

            for (const pattern of patterns) {
              const match = content.match(pattern);
              if (match) {
                debug.mp3Url = match[1] || match[0];
                return debug;
              }
            }
          }

          // Strategy 3: Look in __NEXT_DATA__
          if (window.__NEXT_DATA__?.props?.pageProps) {
            debug.nextDataFound = true;
            const pageProps = JSON.stringify(window.__NEXT_DATA__.props.pageProps);
            const match = pageProps.match(/"audio_url":"(https?:\/\/[^"]+\.mp3)"/);
            if (match) {
              debug.mp3Url = match[1];
              return debug;
            }
          }

          return debug;
        });

        const mp3Url = extractionResult.mp3Url;

        if (!mp3Url) {
          console.log(`   🔍 Debug: audio=${extractionResult.audioElementFound}, scripts=${extractionResult.scriptsChecked}, nextData=${extractionResult.nextDataFound}`);
        }

        if (mp3Url && (mp3Url.includes('.mp3') || mp3Url.includes('cdn1.suno.ai') || mp3Url.includes('cdn2.suno.ai'))) {
          song.url = mp3Url;
          console.log(`   ✅ Found URL`);
        } else {
          console.log(`   ⚠️  No URL found`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log();
  }

  await browser.close();
  return songs.filter(s => s.url); // Only return songs with URLs
}

/**
 * Auto-scroll to bottom of page
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      let scrollAttempts = 0;
      const maxScrolls = 100; // Prevent infinite scroll

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollAttempts++;

        if (totalHeight >= scrollHeight || scrollAttempts >= maxScrolls) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });

  // Wait a bit for final lazy-loaded content
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Match Suno songs to CORA tracks
 */
function matchSongsToTracks(sunoSongs, coraAlbums) {
  const matches = [];

  for (const album of coraAlbums) {
    for (const track of album.tracks) {
      if (track.suno_url) continue; // Skip tracks that already have URLs

      const normalizedTrackTitle = normalizeTitle(track.title);

      // Find matching Suno song
      const match = sunoSongs.find(song => {
        const normalizedSongTitle = normalizeTitle(song.title);
        return normalizedSongTitle === normalizedTrackTitle ||
               normalizedSongTitle.includes(normalizedTrackTitle) ||
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

/**
 * Update album.md files with new URLs
 */
function updateAlbumFiles(matches) {
  const albumUpdates = new Map();

  // Group matches by album
  for (const match of matches) {
    if (!albumUpdates.has(match.albumPath)) {
      albumUpdates.set(match.albumPath, []);
    }
    albumUpdates.get(match.albumPath).push(match);
  }

  // Update each album file
  for (const [albumPath, trackMatches] of albumUpdates) {
    const content = fs.readFileSync(albumPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    let updated = false;

    // Update tracks in frontmatter
    if (frontmatter.tracks) {
      for (const match of trackMatches) {
        const track = frontmatter.tracks.find(t => normalizeTitle(t.title) === normalizeTitle(match.track));
        if (track && !track.suno_url) {
          track.suno_url = match.url;
          updated = true;
          console.log(`   ✅ ${match.track} → ${match.url.substring(0, 50)}...`);
        }
      }
    }

    if (updated) {
      // Rebuild the file
      const updatedContent = matter.stringify(body, frontmatter);
      fs.writeFileSync(albumPath, updatedContent);
      console.log(`\n📝 Updated: ${path.relative(coraPath, albumPath)}`);
    }
  }
}

/**
 * Load all CORA albums
 */
function loadCoraAlbums() {
  const albums = [];

  if (!fs.existsSync(albumsPath)) {
    console.error(`❌ Albums path not found: ${albumsPath}`);
    return albums;
  }

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

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Load CORA albums
    console.log('📀 Loading CORA albums...\n');
    const coraAlbums = loadCoraAlbums();
    console.log(`   Found ${coraAlbums.length} albums\n`);

    // Count tracks missing URLs
    let missingCount = 0;
    for (const album of coraAlbums) {
      for (const track of album.tracks) {
        if (!track.suno_url) missingCount++;
      }
    }
    console.log(`   ${missingCount} tracks missing suno_url\n`);

    if (missingCount === 0) {
      console.log('✅ All tracks already have URLs. Nothing to sync!\n');
      return;
    }

    // Step 2: Fetch Suno library
    const sunoSongs = await fetchSunoLibrary();

    if (sunoSongs.length === 0) {
      console.log('⚠️  No songs found in Suno library. Check authentication and try again.\n');
      return;
    }

    // Step 3: Match and update
    console.log('🔗 Matching songs to CORA tracks...\n');
    const matches = matchSongsToTracks(sunoSongs, coraAlbums);
    console.log(`   Found ${matches.length} matches\n`);

    if (matches.length === 0) {
      console.log('⚠️  No matches found. Track titles may not match between Suno and CORA.\n');
      return;
    }

    console.log('📝 Updating album files...\n');
    updateAlbumFiles(matches);

    console.log('\n✅ Sync complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   - ${matches.length} URLs added`);
    console.log(`   - ${missingCount - matches.length} tracks still missing URLs\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
