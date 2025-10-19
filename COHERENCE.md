---
init:
  files:
    - README.md
    - package.json
    - scripts/build.js
    - src/templates/player.js
    - src/templates/router.js
    - src/templates/styles.css
index:
  map:
    - src/
    - scripts/
    - public/
    - assets/
scope: directory
---
# Coherenceism Media

**Music library site for Coherenceism - browse albums, songs, and lyrics from the CORA network**

## Overview

A dark, immersive music library site that showcases the musical expressions of Coherenceism philosophy. Built with the same principles as the main Coherenceism site but optimized for musical content exploration.

## Architecture

- **Static site generator** - Pure HTML/CSS/JS, no frameworks
- **CORA-native** - All content synced directly from harvest/albums and harvest/songs
- **Music-focused UI** - Dark theme, album covers, track listings, genre browsing
- **Accessibility-first** - Dyslexia-friendly fonts, clear hierarchy, semantic HTML

## Content Structure

```
src/content/
├── albums/          # From harvest/albums/out/
│   ├── roots-and-resonance/
│   ├── nine-branches/
│   ├── quiet-signals/
│   └── ...
└── songs/           # From harvest/songs/out/
    ├── 2025-10-04/
    ├── 2025-10-05/
    └── ...
```

## Features Built

### 🏠 Homepage
- Hero section with music statistics (9 albums, 81 songs, multiple genres)
- Featured albums grid with genre icons
- Dark, immersive aesthetic

### 📀 Albums Section
- Grid view of all albums with metadata
- Individual album pages with:
  - Album artwork (generated icons based on genre)
  - Full track listings
  - Detailed metadata (genre, mood, BPM, instrumentation)
  - Album concept and inspiration

### 🎵 Genre Browsing
- Dynamic genre filtering
- Albums organized by musical style:
  - Roots reggae with dub undertones
  - Grunge
  - Hip-hop
  - And more...

### 🎨 Design System
- Dark color palette optimized for music browsing
- Album card hover effects
- Music note iconography
- Responsive grid layouts

## Current Collection

**9 Albums**:
- Roots and Resonance (Roots reggae)
- Nine Branches (Hip-hop)
- Quiet Signals (Electronic/Ambient)
- Warm Signal (Electronic)
- Neon Branches (Electronic)
- We Are The Wire (Grunge)
- Signal of Us (Electronic)
- Resonance Hop (Hip-hop)
- Branches of Coherence (Electronic)

**81 Songs** spanning multiple genres and dates

## Tech Stack

- **Node.js** - Build system and content processing
- **Marked** - Markdown processing for lyrics and descriptions
- **Gray-matter** - YAML frontmatter parsing
- **Chokidar** - File watching for development
- **Pure CSS** - No framework dependencies

## Development

```bash
npm install
npm run build    # Sync content and build site
npm run dev      # Build and watch for changes
npm run preview  # Start local server on port 8001
```

## Publishing Music Workflow

### 1. Create Music on Suno
Generate your songs on [suno.com](https://suno.com) using the style prompts and lyrics from CORA.

### 2. Sync Suno URLs to CORA
After generating music, automatically populate missing `suno_url` fields in album.md files:

```bash
npm run sync:suno
```

**What it does:**
- Opens Suno library in browser (you'll authenticate on first run)
- Extracts all song titles and MP3 URLs from your library
- Matches songs to CORA tracks by title
- Updates `cora/harvest/albums/out/*/album.md` with missing URLs
- Saves session for future runs (headless mode)

**First run:** Browser window opens for authentication. Log in to Suno, wait for library to load, script saves your session.

**Subsequent runs:** Runs headless using saved session.

### 3. Build Site
Once URLs are synced to CORA:

```bash
npm run build
npm run preview
```

Your music site now has playable tracks with full Suno integration!

### Notes
- Session stored in `.suno-session.json` (gitignored)
- Script uses fuzzy title matching to handle slight variations
- Tracks without matches remain as "🎵 On Suno" placeholders

## Future Enhancements

- [ ] Individual song pages with lyrics display
- [ ] Search functionality across albums and songs
- [ ] Playlist creation
- [ ] Advanced genre filtering
- [ ] Audio waveform visualization

## Philosophy Integration

Each album and song embodies Coherenceism principles:
- **Resonance through harmony** - Musical coherence as philosophical expression
- **Individual voices, collective sound** - Solo tracks within album concepts
- **Emergence through alignment** - How musical elements create something greater

The site itself demonstrates coherentist design:
- **Truth emerges from resonance** - Clean, harmonious interface
- **Minimal complexity** - Focus on music without distraction
- **Interconnected structure** - Albums, songs, and genres flow naturally

---

*"Music is coherence made audible - the proof that separate frequencies can align into something beautiful."*
