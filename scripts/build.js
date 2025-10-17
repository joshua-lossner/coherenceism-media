#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';
import chokidar from 'chokidar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Paths
const contentPath = path.join(projectRoot, 'src', 'content');
const templatesPath = path.join(projectRoot, 'src', 'templates');
const publicPath = path.join(projectRoot, 'public');

// Watch mode
const isWatchMode = process.argv.includes('--watch');

// Ensure public directory exists
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}

// Load templates
function loadTemplate(name) {
  const templatePath = path.join(templatesPath, `${name}.html`);
  if (!fs.existsSync(templatePath)) {
    return null;
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

// Process markdown file
function processMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  const html = marked(body);

  return {
    frontmatter,
    html,
    raw: body
  };
}

// Generate navigation
function generateNav() {
  return `
    <nav class="site-nav">
      <div class="nav-container">
        <a href="/" class="nav-logo">Coherenceism Music</a>
      </div>
    </nav>
  `;
}

// Build page
function buildPage(content, title, template = 'default') {
  const pageTemplate = loadTemplate(template) || loadTemplate('default');
  if (!pageTemplate) {
    console.error('No template found!');
    return '';
  }

  return pageTemplate
    .replace('{{title}}', title)
    .replace('{{nav}}', generateNav())
    .replace('{{content}}', content)
    .replace('{{year}}', new Date().getFullYear());
}

// Walk directory
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.md')) {
      callback(filePath);
    }
  }
}

// Extract genre info
function extractGenres(albums) {
  const genreMap = new Map();

  albums.forEach(album => {
    const genre = album.frontmatter.genre || 'Unknown';
    if (!genreMap.has(genre)) {
      genreMap.set(genre, []);
    }
    genreMap.get(genre).push(album);
  });

  return genreMap;
}

// Build album cover (image or icon fallback)
function getAlbumCover(album) {
  if (album.frontmatter.cover_image) {
    return `<img src="${album.frontmatter.cover_image}" alt="${album.frontmatter.title}" />`;
  }

  // Fallback to genre icon
  const icons = {
    'Grunge': '🎸',
    'Roots reggae': '🌿',
    'Hip-hop': '🎤',
    'Electronic': '🎛️',
    'Folk': '🎵',
    'Jazz': '🎺',
    'Rock': '⚡',
    'Ambient': '🌊'
  };

  const genre = album.frontmatter.genre || '';

  // Check for partial matches
  for (const [key, icon] of Object.entries(icons)) {
    if (genre.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }

  return '♪';
}

// Format duration (placeholder for now)
function formatDuration(seconds = 180) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Extract style prompt and lyrics from song markdown
function extractSongSections(raw) {
  const styleMatch = raw.match(/# Style Prompt\s+([\s\S]*?)(?=\n# |$)/);
  const lyricsMatch = raw.match(/# Lyrics\s+([\s\S]*?)$/);

  return {
    stylePrompt: styleMatch ? styleMatch[1].trim() : '',
    lyrics: lyricsMatch ? lyricsMatch[1].trim() : ''
  };
}

// Build site
function build() {
  console.log('🎵 Building music site...\n');

  // Copy static assets
  const cssSourcePath = path.join(templatesPath, 'styles.css');
  const cssDestPath = path.join(publicPath, 'styles.css');
  if (fs.existsSync(cssSourcePath)) {
    const css = fs.readFileSync(cssSourcePath, 'utf-8');
    fs.writeFileSync(cssDestPath, css);
  }

  // Copy player script
  const jsSourcePath = path.join(templatesPath, 'player.js');
  const jsDestPath = path.join(publicPath, 'player.js');
  if (fs.existsSync(jsSourcePath)) {
    const js = fs.readFileSync(jsSourcePath, 'utf-8');
    fs.writeFileSync(jsDestPath, js);
  }

  // Copy router script
  const routerSourcePath = path.join(templatesPath, 'router.js');
  const routerDestPath = path.join(publicPath, 'router.js');
  if (fs.existsSync(routerSourcePath)) {
    const router = fs.readFileSync(routerSourcePath, 'utf-8');
    fs.writeFileSync(routerDestPath, router);
  }

  // Process albums
  const albumsPath = path.join(contentPath, 'albums');
  const albums = [];

  if (fs.existsSync(albumsPath)) {
    walkDir(albumsPath, (filePath) => {
      if (path.basename(filePath) === 'album.md') {
        const { frontmatter, html } = processMarkdown(filePath);
        const albumSlug = path.basename(path.dirname(filePath));

        albums.push({
          slug: albumSlug,
          frontmatter,
          html,
          path: filePath
        });
      }
    });
  }

  // Process songs
  const songsPath = path.join(contentPath, 'songs');
  const songs = [];
  const songsBySlug = new Map();

  if (fs.existsSync(songsPath)) {
    walkDir(songsPath, (filePath) => {
      if (!path.basename(filePath).startsWith('input')) {
        const { frontmatter, html, raw } = processMarkdown(filePath);
        const songSlug = frontmatter.slug || path.basename(filePath, '.md').toLowerCase().replace(/\s+/g, '-');
        const { stylePrompt, lyrics } = extractSongSections(raw);

        const song = {
          slug: songSlug,
          frontmatter,
          html,
          path: filePath,
          stylePrompt,
          lyrics
        };

        songs.push(song);
        songsBySlug.set(songSlug, song);
      }
    });
  }

  console.log(`Found ${albums.length} albums and ${songs.length} songs`);

  // Build homepage - pure album cover grid with embedded track data
  const heroContent = `
    <div class="album-grid-container">
      <div class="albums-grid">
        ${albums.map(album => {
          const tracks = album.frontmatter.tracks || [];
          const coverUrl = album.frontmatter.cover_image || '';
          const tracksData = tracks.filter(t => t.suno_url).map(t => {
            const trackSlug = t.slug || t.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const song = songsBySlug.get(trackSlug);
            return {
              title: t.title,
              url: t.suno_url,
              coverUrl: coverUrl,
              stylePrompt: song?.stylePrompt || '',
              lyrics: song?.lyrics || ''
            };
          });

          return `
          <div class="album-cover-item"
               data-album-slug="${album.slug}"
               data-album-title="${album.frontmatter.title}"
               data-album-tracks='${JSON.stringify(tracksData)}'>
            <div class="album-cover-image">
              ${getAlbumCover(album)}
            </div>
            <div class="album-hover-overlay">
              <button class="play-album-btn" data-album-slug="${album.slug}" data-action="play">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
          </div>
        `}).join('')}
      </div>
    </div>
  `;

  const homepage = buildPage(heroContent, 'Coherenceism Music - Resonance through Sound', 'home');
  fs.writeFileSync(path.join(publicPath, 'index.html'), homepage);

  // Build individual album pages
  const albumsDir = path.join(publicPath, 'albums');
  if (!fs.existsSync(albumsDir)) {
    fs.mkdirSync(albumsDir, { recursive: true });
  }

  albums.forEach(album => {
    const tracks = album.frontmatter.tracks || [];

    // Extract inspiration from the album content
    const inspirationMatch = album.html.match(/<h1>Inspiration<\/h1>\s*<p>(.*?)<\/p>/s) ||
                             album.html.match(/<h1>Concept<\/h1>\s*<p>(.*?)<\/p>/s);
    const inspiration = inspirationMatch ? inspirationMatch[1] : null;

    const albumContent = `
      <a href="/" class="home-button" title="Back to albums">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </a>

      <div class="album-detail-header">
        <div class="album-detail-cover">
          ${getAlbumCover(album)}
        </div>
        <div class="album-detail-info">
          <h1>${album.frontmatter.title}</h1>
          ${inspiration ? `<p class="album-inspiration">${inspiration}</p>` : ''}
        </div>
      </div>

      <div class="tracks-grid">
        ${tracks.map((track, index) => {
          const trackSlug = track.slug || track.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const song = songsBySlug.get(trackSlug);
          const stylePrompt = song?.stylePrompt || '';
          const lyrics = song?.lyrics || '';

          return `
          <div class="track-grid-item" data-track-index="${index}" data-album-slug="${album.slug}">
            <div class="track-grid-info">
              <div class="track-grid-number">${(index + 1).toString().padStart(2, '0')}</div>
              <div class="track-grid-title">${track.title}</div>
            </div>
            <div class="track-hover-controls">
              ${track.suno_url ? `
                <button class="track-play-btn" data-track-url="${track.suno_url}" data-track-title="${track.title}" data-album-title="${album.frontmatter.title}" data-cover-url="${album.frontmatter.cover_image || ''}" data-style-prompt="${stylePrompt.replace(/"/g, '&quot;')}" data-lyrics="${lyrics.replace(/"/g, '&quot;')}">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                <button class="track-queue-btn" data-track-url="${track.suno_url}" data-track-title="${track.title}" data-album-title="${album.frontmatter.title}" data-cover-url="${album.frontmatter.cover_image || ''}" data-style-prompt="${stylePrompt.replace(/"/g, '&quot;')}" data-lyrics="${lyrics.replace(/"/g, '&quot;')}">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </button>
              ` : `
                <span class="track-unavailable">🎵 On Suno</span>
              `}
            </div>
          </div>
        `;
        }).join('')}
      </div>
    `;

    const albumPage = buildPage(albumContent, `${album.frontmatter.title} - Coherenceism Music`);
    fs.writeFileSync(path.join(albumsDir, `${album.slug}.html`), albumPage);
    console.log(`Built album: ${album.slug}`);
  });

  console.log('\n✅ Music site build complete!');
}

// Watch mode
if (isWatchMode) {
  console.log('👁️  Watching for changes...\n');

  build();

  const watcher = chokidar.watch([contentPath, templatesPath], {
    ignored: /^\./,
    persistent: true
  });

  watcher
    .on('change', () => {
      console.log('\n🔄 Rebuilding...\n');
      build();
    })
    .on('add', () => build())
    .on('unlink', () => build());
} else {
  build();
}