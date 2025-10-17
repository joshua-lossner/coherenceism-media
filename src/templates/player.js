// Global Music Player and Queue Management
class GlobalMusicPlayer {
  constructor() {
    // Check if there's already a global player instance
    if (window.coherenceismGlobalPlayer) {
      console.log('Using existing global player');
      return window.coherenceismGlobalPlayer;
    }

    console.log('Creating new global player');

    // Use a persistent audio element if it exists
    this.audio = window.coherenceismAudio || new Audio();
    window.coherenceismAudio = this.audio;

    this.currentTrack = null;
    this.queue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isShuffled = false;
    this.isRepeating = false;

    // Load previous state
    this.loadState();
    this.init();

    // Save state on page unload and navigation
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveState();
      }
    });

    // Save state periodically
    if (!window.coherenceismStateInterval) {
      window.coherenceismStateInterval = setInterval(() => this.saveState(), 2000);
    }

    // Store this as the global instance
    window.coherenceismGlobalPlayer = this;
  }

  init() {
    this.createPlayerElement();
    this.setupEventListeners();
    this.setupAudioEventListeners();
  }

  createPlayerElement() {
    // Check if player already exists
    if (document.getElementById('global-player')) {
      console.log('Player element already exists, reusing');
      this.bindPlayerElements();
      return;
    }

    console.log('Creating new player element');
    const playerHTML = `
      <div id="global-player" class="global-player">
        <div class="global-player-content">
          <div class="global-player-album-art" id="player-album-art">
            <div class="global-player-album-art-placeholder">♪</div>
          </div>
          <div class="global-player-info">
            <div class="global-player-title">No track selected</div>
            <div class="global-player-artist">Choose a song to play</div>
          </div>

          <div class="global-player-controls">
            <button class="global-player-btn" id="prev-btn" aria-label="Previous track">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button class="global-player-btn primary" id="play-pause-btn" aria-label="Play/Pause">
              <svg class="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>

            <button class="global-player-btn" id="next-btn" aria-label="Next track">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="global-progress-container">
            <span class="global-progress-time" id="current-time">0:00</span>
            <div class="global-progress-bar" id="progress-bar">
              <div class="global-progress-fill" id="progress-fill"></div>
            </div>
            <span class="global-progress-time" id="duration-time">0:00</span>
          </div>

          <div class="global-player-controls">
            <button class="global-player-btn" id="shuffle-btn" aria-label="Shuffle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>

            <button class="global-player-btn" id="repeat-btn" aria-label="Repeat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
            </button>

            <button class="global-player-btn" id="queue-btn" aria-label="Queue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </button>

            <button class="global-player-btn" id="lyrics-btn" aria-label="Show Lyrics" style="display: none;">
              <svg class="lyrics-up-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14l5-5 5 5z"/>
              </svg>
              <svg class="lyrics-down-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Slide-up Panel -->
      <div id="slide-up-panel" class="slide-up-panel">
        <div class="slide-up-panel-header">
          <button class="slide-up-panel-minimize" id="panel-minimize-btn" aria-label="Minimize">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </button>
        </div>
        <div class="slide-up-panel-content">
          <div class="slide-up-panel-left">
            <div class="slide-up-panel-cover" id="panel-cover">
              <div class="global-player-album-art-placeholder">♪</div>
            </div>
            <div class="slide-up-panel-info">
              <h2 id="panel-title">Song Title</h2>
              <h3 id="panel-album">Album Name</h3>
            </div>
            <div class="slide-up-panel-style">
              <h4>Style Prompt</h4>
              <p id="panel-style-text">No style information available</p>
            </div>
          </div>
          <div class="slide-up-panel-right">
            <div class="slide-up-panel-tabs">
              <button class="slide-up-tab active" data-tab="lyrics">Lyrics</button>
              <button class="slide-up-tab" data-tab="queue">Queue</button>
            </div>
            <div class="slide-up-panel-tab-content">
              <div id="panel-lyrics-content" class="slide-up-tab-panel active">
                <div class="slide-up-panel-lyrics" id="panel-lyrics-text">
                  <pre>No lyrics available</pre>
                </div>
              </div>
              <div id="panel-queue-content" class="slide-up-tab-panel">
                <div id="panel-queue-list" class="slide-up-panel-queue">
                  <p>No tracks in queue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue Panel -->
      <div id="queue-panel" class="queue-panel">
        <div class="queue-panel-header">
          <h3>Queue</h3>
          <button class="queue-close-btn" id="queue-close-btn">×</button>
        </div>
        <div class="queue-panel-content">
          <div id="queue-list" class="queue-list">
            <p>No tracks in queue</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', playerHTML);
    this.bindPlayerElements();
  }

  bindPlayerElements() {
    this.playerElement = document.getElementById('global-player');
    this.queuePanel = document.getElementById('queue-panel');
    this.queueList = document.getElementById('queue-list');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.progressBar = document.getElementById('progress-bar');
    this.progressFill = document.getElementById('progress-fill');
    this.currentTimeEl = document.getElementById('current-time');
    this.durationTimeEl = document.getElementById('duration-time');
    this.shuffleBtn = document.getElementById('shuffle-btn');
    this.repeatBtn = document.getElementById('repeat-btn');
    this.queueBtn = document.getElementById('queue-btn');
    this.queueCloseBtn = document.getElementById('queue-close-btn');
    this.lyricsBtn = document.getElementById('lyrics-btn');
    this.slideUpPanel = document.getElementById('slide-up-panel');
    this.panelMinimizeBtn = document.getElementById('panel-minimize-btn');
    this.titleEl = this.playerElement.querySelector('.global-player-title');
    this.artistEl = this.playerElement.querySelector('.global-player-artist');
    this.albumArtEl = document.getElementById('player-album-art');
  }

  setupEventListeners() {
    // Remove existing listeners to avoid duplicates
    if (this.playPauseBtn && !this.playPauseBtn.dataset.listenerAdded) {
      this.playPauseBtn.addEventListener('click', () => this.togglePlay());
      this.playPauseBtn.dataset.listenerAdded = 'true';
    }
    if (this.prevBtn && !this.prevBtn.dataset.listenerAdded) {
      this.prevBtn.addEventListener('click', () => this.previousTrack());
      this.prevBtn.dataset.listenerAdded = 'true';
    }
    if (this.nextBtn && !this.nextBtn.dataset.listenerAdded) {
      this.nextBtn.addEventListener('click', () => this.nextTrack());
      this.nextBtn.dataset.listenerAdded = 'true';
    }
    if (this.progressBar && !this.progressBar.dataset.listenerAdded) {
      this.progressBar.addEventListener('click', (e) => this.seek(e));
      this.progressBar.dataset.listenerAdded = 'true';
    }
    if (this.shuffleBtn && !this.shuffleBtn.dataset.listenerAdded) {
      this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
      this.shuffleBtn.dataset.listenerAdded = 'true';
    }
    if (this.repeatBtn && !this.repeatBtn.dataset.listenerAdded) {
      this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
      this.repeatBtn.dataset.listenerAdded = 'true';
    }
    if (this.queueBtn && !this.queueBtn.dataset.listenerAdded) {
      this.queueBtn.addEventListener('click', () => this.toggleQueue());
      this.queueBtn.dataset.listenerAdded = 'true';
    }
    if (this.queueCloseBtn && !this.queueCloseBtn.dataset.listenerAdded) {
      this.queueCloseBtn.addEventListener('click', () => this.hideQueue());
      this.queueCloseBtn.dataset.listenerAdded = 'true';
    }
    if (this.lyricsBtn && !this.lyricsBtn.dataset.listenerAdded) {
      this.lyricsBtn.addEventListener('click', () => this.togglePanel());
      this.lyricsBtn.dataset.listenerAdded = 'true';
    }
    if (this.panelMinimizeBtn && !this.panelMinimizeBtn.dataset.listenerAdded) {
      this.panelMinimizeBtn.addEventListener('click', () => this.hidePanel());
      this.panelMinimizeBtn.dataset.listenerAdded = 'true';
    }
    // Tab switching
    document.querySelectorAll('.slide-up-tab').forEach(tab => {
      if (!tab.dataset.listenerAdded) {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        tab.dataset.listenerAdded = 'true';
      }
    });
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.slideUpPanel && this.slideUpPanel.classList.contains('active')) {
        this.hidePanel();
      }
    });
  }

  setupAudioEventListeners() {
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
      // Save state every 10 seconds during playback
      if (this.isPlaying && this.audio.currentTime % 10 < 0.5) {
        this.saveState();
      }
    });
    this.audio.addEventListener('ended', () => this.onTrackEnded());
    this.audio.addEventListener('error', (e) => this.onError(e));
    this.audio.addEventListener('pause', () => this.saveState());
    this.audio.addEventListener('playing', () => this.saveState());
  }

  playTrack(track, album = null) {
    console.log('playTrack called with:', track, album);
    this.currentTrack = { ...track, album: album || track.album };
    this.audio.src = track.url;
    console.log('Set audio src to:', track.url);
    this.updateTrackInfo();
    this.showPlayer();
    this.play();
  }

  playAlbum(albumSlug) {
    console.log('playAlbum called with:', albumSlug);

    // Get album element
    const albumElement = document.querySelector(`[data-album-slug="${albumSlug}"]`);
    if (!albumElement) {
      console.error('Album element not found for slug:', albumSlug);
      return;
    }

    // Get album data
    const albumTitle = albumElement.dataset.albumTitle;
    const tracksData = albumElement.dataset.albumTracks;

    console.log('Album data:', { albumTitle, tracksData });

    if (tracksData) {
      // We have embedded track data (from homepage)
      try {
        const tracks = JSON.parse(tracksData);
        console.log('Parsed tracks:', tracks);

        // Clear queue and add all tracks
        this.queue = [];
        tracks.forEach(track => {
          if (track.url) {
            this.queue.push({
              url: track.url,
              title: track.title,
              album: albumTitle,
              coverUrl: track.coverUrl || '',
              stylePrompt: track.stylePrompt || '',
              lyrics: track.lyrics || ''
            });
          }
        });

        console.log('Queue after loading album:', this.queue);

        // Start playing the first track
        if (this.queue.length > 0) {
          this.currentIndex = 0;
          this.playTrack(this.queue[0]);
          this.updateQueueDisplay();
        } else {
          console.log('No playable tracks, navigating to album page');
          // No tracks available, navigate to album page
          const albumPath = `/albums/${albumSlug}.html`;
          if (window.coherenceRouter) {
            window.coherenceRouter.navigate(albumPath);
          } else {
            window.location.href = albumPath;
          }
        }
      } catch (e) {
        console.error('Failed to parse album tracks:', e);
        const albumPath = `/albums/${albumSlug}.html`;
        if (window.coherenceRouter) {
          window.coherenceRouter.navigate(albumPath);
        } else {
          window.location.href = albumPath;
        }
      }
    } else {
      // We're on an album page, get tracks from the page
      const trackButtons = document.querySelectorAll(`[data-album-slug="${albumSlug}"] .track-play-btn`);

      if (trackButtons.length > 0) {
        // Clear queue and add all tracks
        this.queue = [];
        trackButtons.forEach(btn => {
          const track = {
            url: btn.dataset.trackUrl,
            title: btn.dataset.trackTitle,
            album: btn.dataset.albumTitle,
            coverUrl: btn.dataset.coverUrl || '',
            stylePrompt: btn.dataset.stylePrompt || '',
            lyrics: btn.dataset.lyrics || ''
          };
          if (track.url) {
            this.queue.push(track);
          }
        });

        // Start playing the first track
        if (this.queue.length > 0) {
          this.currentIndex = 0;
          this.playTrack(this.queue[0]);
        }
      } else {
        // Navigate to album page
        const albumPath = `/albums/${albumSlug}.html`;
        if (window.coherenceRouter) {
          window.coherenceRouter.navigate(albumPath);
        } else {
          window.location.href = albumPath;
        }
      }
    }
  }

  addToQueue(track, album = null) {
    this.queue.push({ ...track, album: album || track.album });
    this.updateQueueDisplay();
    // Show some feedback that track was added to queue
    this.showQueueFeedback();
  }

  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;

    // If removing the currently playing track
    if (index === this.currentIndex) {
      // Play next track if available
      if (this.queue.length > 1) {
        const nextIndex = index < this.queue.length - 1 ? index : index - 1;
        this.queue.splice(index, 1);
        this.currentIndex = nextIndex;
        if (nextIndex >= 0 && nextIndex < this.queue.length) {
          this.playTrack(this.queue[this.currentIndex]);
        }
      } else {
        // Last track in queue
        this.queue.splice(index, 1);
        this.pause();
        this.hidePlayer();
      }
    } else {
      // Removing a different track
      this.queue.splice(index, 1);
      // Adjust currentIndex if needed
      if (index < this.currentIndex) {
        this.currentIndex--;
      }
    }

    this.updateQueueDisplay();
    this.updatePanelQueue();
    this.saveState();
  }

  moveQueueItem(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length) return;
    if (toIndex < 0 || toIndex >= this.queue.length) return;
    if (fromIndex === toIndex) return;

    // Remove item from old position
    const [item] = this.queue.splice(fromIndex, 1);

    // Insert at new position
    this.queue.splice(toIndex, 0, item);

    // Update currentIndex to follow the currently playing track
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }

    this.updateQueueDisplay();
    this.updatePanelQueue();
    this.saveState();
  }

  play() {
    console.log('play() called, audio src:', this.audio.src);
    this.audio.play().then(() => {
      console.log('Playback started successfully');
      this.isPlaying = true;
      this.updatePlayButton();
      this.saveState();
    }).catch(error => {
      console.error('Playback failed:', error);
    });
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayButton();
    this.saveState();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  previousTrack() {
    if (this.queue.length > 0) {
      this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.queue.length - 1;
      const track = this.queue[this.currentIndex];
      this.playTrack(track);
    }
  }

  nextTrack() {
    if (this.queue.length > 0) {
      this.currentIndex = this.currentIndex < this.queue.length - 1 ? this.currentIndex + 1 : 0;
      const track = this.queue[this.currentIndex];
      this.playTrack(track);
    }
  }

  seek(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * this.audio.duration;
    this.audio.currentTime = time;
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.shuffleBtn.classList.toggle('active', this.isShuffled);
  }

  toggleRepeat() {
    this.isRepeating = !this.isRepeating;
    this.repeatBtn.classList.toggle('active', this.isRepeating);
  }

  updatePlayButton() {
    const playIcon = this.playPauseBtn.querySelector('.play-icon');
    const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');

    if (this.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  updateTrackInfo() {
    if (this.currentTrack) {
      this.titleEl.textContent = this.currentTrack.title;
      this.artistEl.textContent = this.currentTrack.album || 'Coherenceism Music';

      // Update album art
      if (this.albumArtEl) {
        if (this.currentTrack.coverUrl) {
          this.albumArtEl.innerHTML = `<img src="${this.currentTrack.coverUrl}" alt="${this.currentTrack.album}" />`;
        } else {
          this.albumArtEl.innerHTML = '<div class="global-player-album-art-placeholder">♪</div>';
        }
      }

      // Show/hide lyrics button based on availability
      if (this.lyricsBtn) {
        if (this.currentTrack.lyrics && this.currentTrack.lyrics.trim().length > 0) {
          this.lyricsBtn.style.display = 'block';
        } else {
          this.lyricsBtn.style.display = 'none';
        }
      }
    }
  }

  updateProgress() {
    if (this.audio.duration) {
      const percent = (this.audio.currentTime / this.audio.duration) * 100;
      this.progressFill.style.width = `${percent}%`;
      this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
  }

  updateDuration() {
    this.durationTimeEl.textContent = this.formatTime(this.audio.duration);
  }

  showPlayer() {
    this.playerElement.classList.add('active');
  }

  hidePlayer() {
    this.playerElement.classList.remove('active');
  }

  showQueueFeedback() {
    // Simple feedback for adding to queue
    const feedback = document.createElement('div');
    feedback.textContent = 'Added to queue';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-color);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      z-index: 10000;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateY(-20px)';
      setTimeout(() => document.body.removeChild(feedback), 300);
    }, 2000);
  }

  onTrackEnded() {
    if (this.isRepeating) {
      this.play();
    } else if (this.queue.length > 0) {
      this.nextTrack();
    } else {
      this.pause();
    }
  }

  onError(e) {
    console.error('Audio playback error:', e);
    // Handle error - maybe skip to next track
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  toggleQueue() {
    this.queuePanel.classList.toggle('active');
    this.updateQueueDisplay();
  }

  hideQueue() {
    this.queuePanel.classList.remove('active');
  }

  togglePanel() {
    if (this.slideUpPanel && this.slideUpPanel.classList.contains('active')) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    if (!this.currentTrack) {
      console.log('No track currently playing');
      return;
    }

    // Update panel content
    const panelTitle = document.getElementById('panel-title');
    const panelAlbum = document.getElementById('panel-album');
    const panelCover = document.getElementById('panel-cover');
    const panelStyleText = document.getElementById('panel-style-text');
    const panelLyricsText = document.getElementById('panel-lyrics-text');

    if (panelTitle) panelTitle.textContent = this.currentTrack.title;
    if (panelAlbum) panelAlbum.textContent = this.currentTrack.album || 'Coherenceism Music';

    // Update cover
    if (panelCover) {
      if (this.currentTrack.coverUrl) {
        panelCover.innerHTML = `<img src="${this.currentTrack.coverUrl}" alt="${this.currentTrack.album}" />`;
      } else {
        panelCover.innerHTML = '<div class="global-player-album-art-placeholder">♪</div>';
      }
    }

    // Update style prompt
    if (panelStyleText) {
      if (this.currentTrack.stylePrompt) {
        panelStyleText.textContent = this.currentTrack.stylePrompt;
      } else {
        panelStyleText.textContent = 'No style information available';
      }
    }

    // Update lyrics
    if (panelLyricsText) {
      if (this.currentTrack.lyrics) {
        panelLyricsText.innerHTML = '<pre>' + this.currentTrack.lyrics + '</pre>';
      } else {
        panelLyricsText.innerHTML = '<pre>No lyrics available</pre>';
      }
    }

    // Update panel queue
    this.updatePanelQueue();

    // Show panel
    this.slideUpPanel.classList.add('active');

    // Update lyrics button icon to down arrow
    this.updateLyricsButtonIcon(true);
  }

  hidePanel() {
    this.slideUpPanel.classList.remove('active');

    // Update lyrics button icon to up arrow
    this.updateLyricsButtonIcon(false);
  }

  updateLyricsButtonIcon(isPanelOpen) {
    if (!this.lyricsBtn) return;

    const upIcon = this.lyricsBtn.querySelector('.lyrics-up-icon');
    const downIcon = this.lyricsBtn.querySelector('.lyrics-down-icon');

    if (isPanelOpen) {
      // Panel is open, show down arrow
      if (upIcon) upIcon.style.display = 'none';
      if (downIcon) downIcon.style.display = 'block';
      this.lyricsBtn.setAttribute('aria-label', 'Hide Lyrics');
    } else {
      // Panel is closed, show up arrow
      if (upIcon) upIcon.style.display = 'block';
      if (downIcon) downIcon.style.display = 'none';
      this.lyricsBtn.setAttribute('aria-label', 'Show Lyrics');
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.slide-up-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update tab panels
    document.querySelectorAll('.slide-up-tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    if (tabName === 'lyrics') {
      document.getElementById('panel-lyrics-content').classList.add('active');
    } else if (tabName === 'queue') {
      document.getElementById('panel-queue-content').classList.add('active');
      this.updatePanelQueue();
    }
  }

  updatePanelQueue() {
    const panelQueueList = document.getElementById('panel-queue-list');
    if (!panelQueueList) return;

    if (this.queue.length === 0) {
      panelQueueList.innerHTML = '<p>No tracks in queue</p>';
      return;
    }

    const queueHTML = this.queue.map((track, index) => `
      <div class="slide-up-queue-item ${index === this.currentIndex ? 'current' : ''}" data-index="${index}">
        <div class="slide-up-queue-info">
          <div class="slide-up-queue-title">${track.title}</div>
          <div class="slide-up-queue-album">${track.album || 'Unknown Album'}</div>
        </div>
        <div class="slide-up-queue-controls">
          ${index > 0 ? `
            <button class="slide-up-queue-move-up" data-index="${index}" title="Move up">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14l5-5 5 5z"/>
              </svg>
            </button>
          ` : '<span class="queue-spacer"></span>'}
          ${index < this.queue.length - 1 ? `
            <button class="slide-up-queue-move-down" data-index="${index}" title="Move down">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          ` : '<span class="queue-spacer"></span>'}
          <button class="slide-up-queue-play" data-index="${index}" title="Play now">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="slide-up-queue-remove" data-index="${index}" title="Remove from queue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    panelQueueList.innerHTML = queueHTML;

    // Add click listeners
    panelQueueList.querySelectorAll('.slide-up-queue-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').dataset.index);
        this.currentIndex = index;
        this.playTrack(this.queue[index]);
        this.updatePanelQueue();
      });
    });

    panelQueueList.querySelectorAll('.slide-up-queue-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').dataset.index);
        this.removeFromQueue(index);
      });
    });

    panelQueueList.querySelectorAll('.slide-up-queue-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').dataset.index);
        this.moveQueueItem(index, index - 1);
      });
    });

    panelQueueList.querySelectorAll('.slide-up-queue-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').dataset.index);
        this.moveQueueItem(index, index + 1);
      });
    });
  }

  updateQueueDisplay() {
    if (this.queue.length === 0) {
      this.queueList.innerHTML = '<p>No tracks in queue</p>';
      return;
    }

    const queueHTML = this.queue.map((track, index) => `
      <div class="queue-item ${index === this.currentIndex ? 'current' : ''}" data-index="${index}">
        <div class="queue-item-info">
          <div class="queue-item-title">${track.title}</div>
          <div class="queue-item-album">${track.album || 'Unknown Album'}</div>
        </div>
        <button class="queue-item-play" data-index="${index}">▶</button>
      </div>
    `).join('');

    this.queueList.innerHTML = queueHTML;

    // Add click listeners for queue items
    this.queueList.querySelectorAll('.queue-item-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentIndex = index;
        this.playTrack(this.queue[index]);
      });
    });
  }

  saveState() {
    if (this.currentTrack) {
      const state = {
        currentTrack: this.currentTrack,
        queue: this.queue,
        currentIndex: this.currentIndex,
        isPlaying: this.isPlaying,
        isShuffled: this.isShuffled,
        isRepeating: this.isRepeating,
        currentTime: this.audio.currentTime,
        timestamp: Date.now()
      };
      localStorage.setItem('coherenceism-player-state', JSON.stringify(state));
    }
  }

  loadState() {
    try {
      const savedState = localStorage.getItem('coherenceism-player-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('Loading saved state:', state);

        // Only restore if saved less than 1 hour ago
        // Also check if it was saved very recently (within 2 seconds) - means we just navigated
        const wasRecentNavigation = Date.now() - state.timestamp < 2000;
        if (Date.now() - state.timestamp < 3600000) {
          this.currentTrack = state.currentTrack;
          this.queue = state.queue || [];
          this.currentIndex = state.currentIndex || 0;
          this.isShuffled = state.isShuffled || false;
          this.isRepeating = state.isRepeating || false;

          // Restore the track
          if (this.currentTrack) {
            console.log('Restoring track:', this.currentTrack);

            // Set the audio source
            this.audio.src = this.currentTrack.url;

            // Show player and update UI immediately
            this.showPlayer();
            this.updateTrackInfo();
            this.updateQueueDisplay();

            // Update shuffle/repeat button states
            if (this.shuffleBtn) {
              this.shuffleBtn.classList.toggle('active', this.isShuffled);
            }
            if (this.repeatBtn) {
              this.repeatBtn.classList.toggle('active', this.isRepeating);
            }

            // Handle resuming playback
            const resumePlayback = () => {
              console.log('Setting currentTime to:', state.currentTime);
              this.audio.currentTime = state.currentTime || 0;

              if (state.isPlaying && wasRecentNavigation) {
                // This was a recent navigation, auto-resume playback
                console.log('Auto-resuming playback after navigation');
                this.isPlaying = true;
                this.audio.play().then(() => {
                  console.log('Playback resumed successfully');
                  this.updatePlayButton();
                }).catch(e => {
                  console.error('Resume play failed (autoplay blocked?):', e);
                  // If auto-play fails, show play button so user can manually resume
                  this.isPlaying = false;
                  this.updatePlayButton();
                });
              } else if (state.isPlaying) {
                // Old session - don't auto-play, just show ready state
                console.log('Previous session was playing, ready to resume');
                this.isPlaying = false;
                this.updatePlayButton();
              } else {
                this.isPlaying = false;
                this.updatePlayButton();
              }
            };

            // Try multiple approaches to ensure audio loads
            if (this.audio.readyState >= 1) {
              // Audio is already loaded enough
              resumePlayback();
            } else {
              // Wait for audio to load
              this.audio.addEventListener('loadedmetadata', resumePlayback, { once: true });
              this.audio.addEventListener('canplay', resumePlayback, { once: true });

              // Force load and add a timeout fallback
              this.audio.load();

              // Fallback timeout
              setTimeout(() => {
                if (this.audio.readyState === 0) {
                  console.log('Audio not loaded after timeout, trying direct resume');
                  resumePlayback();
                }
              }, 1000);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load player state:', e);
    }
  }

  clearState() {
    localStorage.removeItem('coherenceism-player-state');
  }
}

// Initialize global player and interactions
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing player');

  // Get or create the global player instance
  const globalPlayer = new GlobalMusicPlayer();
  window.globalPlayer = globalPlayer;

  console.log('Global player initialized:', globalPlayer);

  // Album cover play buttons
  document.addEventListener('click', (e) => {
    if (e.target.closest('.play-album-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const albumSlug = e.target.closest('.play-album-btn').dataset.albumSlug;
      globalPlayer.playAlbum(albumSlug);
    }

    // Track play buttons
    if (e.target.closest('.track-play-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const btn = e.target.closest('.track-play-btn');
      const track = {
        url: btn.dataset.trackUrl,
        title: btn.dataset.trackTitle,
        coverUrl: btn.dataset.coverUrl || '',
        stylePrompt: btn.dataset.stylePrompt || '',
        lyrics: btn.dataset.lyrics || ''
      };
      const album = btn.dataset.albumTitle;

      globalPlayer.playTrack(track, album);
    }

    // Track queue buttons
    if (e.target.closest('.track-queue-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const btn = e.target.closest('.track-queue-btn');
      const track = {
        url: btn.dataset.trackUrl,
        title: btn.dataset.trackTitle,
        coverUrl: btn.dataset.coverUrl || '',
        stylePrompt: btn.dataset.stylePrompt || '',
        lyrics: btn.dataset.lyrics || ''
      };
      const album = btn.dataset.albumTitle;

      globalPlayer.addToQueue(track, album);
    }

    // Album cover clicks (navigate to album page)
    if (e.target.closest('.album-cover-item') && !e.target.closest('.play-album-btn')) {
      e.preventDefault();
      const albumSlug = e.target.closest('.album-cover-item').dataset.albumSlug;
      const albumPath = `/albums/${albumSlug}.html`;

      // Use router if available, fallback to traditional navigation
      if (window.coherenceRouter) {
        window.coherenceRouter.navigate(albumPath);
      } else {
        window.location.href = albumPath;
      }
    }
  });

  // Intercept all navigation links to prevent audio interruption
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href.startsWith(window.location.origin)) {
      // Check if audio is playing
      if (globalPlayer.isPlaying) {
        // Save state before navigation
        globalPlayer.saveState();
      }
    }
  });

  // Save state before any navigation
  window.addEventListener('beforeunload', () => {
    globalPlayer.saveState();
  });
});