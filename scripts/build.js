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
function buildPage(content, title, template = 'default', options = {}) {
  const pageTemplate = loadTemplate(template) || loadTemplate('default');
  if (!pageTemplate) {
    console.error('No template found!');
    return '';
  }

  const { bodyClass = '', containerClass = '' } = options;
  const bodyAttr = bodyClass ? ` class="${bodyClass}"` : '';
  const containerAttr = ` class="container${containerClass ? ' ' + containerClass : ''}"`;

  return pageTemplate
    .replace('{{title}}', title)
    .replace('{{nav}}', generateNav())
    .replace('{{body_attr}}', bodyAttr)
    .replace('{{container_attr}}', containerAttr)
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

  // Filter to published albums only (default to published if unset)
  const publishedAlbums = albums
    .filter(a => (a.frontmatter.status || 'published').toLowerCase() === 'published')
    .sort((a, b) => {
      // Pin "Coherenceism" album to the top
      if (a.frontmatter.title.startsWith('Coherenceism')) return -1;
      if (b.frontmatter.title.startsWith('Coherenceism')) return 1;
      // Sort the rest alphabetically
      return a.frontmatter.title.localeCompare(b.frontmatter.title);
    });

  console.log(`Found ${albums.length} albums (${publishedAlbums.length} published) and ${songs.length} songs`);

  // Build homepage - pure album cover grid with embedded track data
  const heroContent = `
    <div class="album-grid-container">
      <div class="albums-grid">
        ${publishedAlbums.map(album => {
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

          // HTML-encode the JSON to prevent attribute breakage
          const encodedTracks = JSON.stringify(tracksData)
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          return `
          <div class="album-cover-item"
               data-album-slug="${album.slug}"
               data-album-title="${album.frontmatter.title}"
               data-album-tracks='${encodedTracks}'>
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

  // Album detail pages removed - all playback happens from homepage
  // All album data (tracks, lyrics, style prompts) is embedded in homepage

  console.log('\n✅ Music site build complete!');
}

// Watch mode
if (isWatchMode) {
  console.log('👁️  Watching for changes...\n');

  build();

  const watcher = chokidar.watch([contentPath, templatesPath], {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true
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
