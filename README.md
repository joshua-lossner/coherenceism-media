# 🎵 Coherenceism Music

A beautiful, fully-featured music streaming site for Coherenceism albums. Built with vanilla JavaScript, no frameworks required.

## ✨ Features

### 🎧 Audio Player
- **Persistent Global Player** - Music keeps playing as you navigate
- **State Preservation** - Resume exactly where you left off, even after closing the browser
- **Smart Queue Management** - Reorder, remove, or jump to any track
- **Shuffle & Repeat** - Classic playback modes
- **Progress Seeking** - Click anywhere on the progress bar to jump

### 📱 Mobile Experience
- **Ultra-Responsive Design** - Optimized for all screen sizes
- **Tidal-Style Slide-Up Panel** - Swipe up for lyrics and queue
- **Compact Mobile Player** - All controls on a single line
- **Touch-Friendly Controls** - Large, easy-to-tap buttons
- **Safe Area Support** - Works perfectly with iPhone notches

### 🎼 Music Library
- **9 Albums** across multiple genres (Grunge, Jazz, Hip-Hop, Reggae, Soul, Rock)
- **81+ Tracks** with full lyrics and style information
- **Beautiful Album Art** - Hover to play entire albums
- **Track-by-Track Control** - Play individual songs or queue entire albums

### 🎨 User Interface
- **Album Cover Grid** - Spotify-style homepage
- **Dark Theme** - Easy on the eyes for long listening sessions
- **Smooth Animations** - Polished transitions and interactions
- **SPA Router** - Seamless navigation without page reloads

### 🔍 Queue Management
- **Visual Queue Display** - See what's playing next
- **Drag-Free Reordering** - Up/down buttons to rearrange tracks
- **Remove Tracks** - Delete songs from queue with one click
- **Jump to Track** - Play any queued song immediately
- **Current Track Highlighting** - Always know what's playing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/joshua-lossner/coherenceism-media.git
cd coherenceism-media

# Install dependencies
npm install

# Build the site
npm run build

# Start local server
npm run preview
```

Visit `http://localhost:8080` to see the site.

## 📁 Project Structure

```
coherenceism-media/
├── src/
│   ├── content/          # Album and song markdown files
│   │   ├── albums/       # Album metadata and track lists
│   │   └── songs/        # Individual song lyrics and style prompts
│   └── templates/        # HTML, CSS, and JS templates
│       ├── default.html  # Page template
│       ├── home.html     # Homepage template
│       ├── styles.css    # All styles
│       ├── player.js     # Audio player logic
│       └── router.js     # SPA routing
├── scripts/
│   ├── build.js          # Static site generator
│   ├── sync-content.js   # Sync from CORA repository
│   └── upload-to-blob.js # Upload audio to Vercel blob storage
├── public/               # Generated site (committed for Vercel)
└── vercel.json          # Vercel deployment config
```

## 🛠️ Development

### Build Commands

```bash
# Full rebuild
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Preview built site
npm run preview

# Sync content from CORA
npm run sync
```

### Adding New Albums

1. Add album metadata to `src/content/albums/[album-slug]/album.md`
2. Add song lyrics to `src/content/songs/[date]/[song-slug]/`
3. Upload audio files: `npm run upload`
4. Rebuild: `npm run build`

## 🎨 Design Philosophy

- **No Framework Bloat** - Pure vanilla JavaScript for maximum performance
- **Accessibility First** - Semantic HTML, ARIA labels, keyboard navigation
- **Mobile-First Responsive** - Designed for phones, enhanced for desktop
- **Progressive Enhancement** - Works without JavaScript for basic navigation
- **State Persistence** - Never lose your place in the music

## 🎵 Audio Hosting

Audio files are hosted on Vercel Blob Storage for fast, reliable streaming. The site gracefully falls back to Suno CDN for albums not yet migrated.

## 📱 Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 10+)

## 🚢 Deployment

### Vercel (Recommended)

This project is optimized for Vercel:

1. Push to GitHub
2. Import project in Vercel dashboard
3. Deploy! (Vercel auto-detects settings from `vercel.json`)

### Manual Deployment

```bash
npm run build
# Upload public/ directory to any static host
```

## 🎼 Albums

1. **We Are the Wire** - Grunge (90-105 BPM)
2. **Branches of Coherence** - Smooth Jazz (70-95 BPM)
3. **Signal of Us** - Boy Band Pop (95-128 BPM)
4. **Neon Branches** - Synth-Pop/New Wave (105-125 BPM)
5. **Warm Signal** - Country Soul (72-92 BPM)
6. **Roots and Resonance** - Roots Reggae (72-90 BPM)
7. **Nine Branches** - 90s Boom-Bap Hip-Hop (88-96 BPM)
8. **Resonance Hop** - 1950s Rock & Roll (140-165 BPM)
9. **Quiet Signals** - Cinematic Downtempo (76-96 BPM)

## 🤝 Contributing

This is a personal music project, but feel free to:
- Report bugs via GitHub Issues
- Suggest features or improvements
- Fork for your own music collection

## 📄 License

All music content © 2025 Joshua Lossner / Coherenceism

Code is available for reference and learning. Please don't republish the music without permission.

## 🙏 Credits

- **Music & Lyrics**: Joshua Lossner
- **Development**: Built with [Claude Code](https://claude.com/claude-code)
- **Design Inspiration**: Spotify, Tidal, Apple Music
- **Font**: [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) by Braille Institute

---

Built with ❤️ and a lot of patience.

**Live Site**: [coherenceism.media](https://coherenceism.media) _(coming soon!)_

🤖 Generated with [Claude Code](https://claude.com/claude-code)
