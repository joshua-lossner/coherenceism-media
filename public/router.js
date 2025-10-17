// Minimal SPA Router - Keeps music playing during navigation

class CoherenceRouter {
  constructor() {
    this.contentContainer = null;
    this.navContainer = null;
    this.init();
  }

  init() {
    console.log('Router init called, readyState:', document.readyState);
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      console.log('Waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      console.log('DOM already loaded, setting up immediately');
      this.setup();
    }
  }

  setup() {
    console.log('Router setup starting');

    // Identify content area and nav (we'll swap content, keep nav)
    this.contentContainer = document.querySelector('main');
    this.navContainer = document.querySelector('nav');

    // If no main tag, look for .container or .album-grid-container
    if (!this.contentContainer) {
      this.contentContainer = document.querySelector('.album-grid-container') || document.body;
    }

    console.log('Content container:', this.contentContainer);
    console.log('Nav container:', this.navContainer);

    // Intercept all link clicks with event delegation on document
    document.addEventListener('click', (e) => {
      console.log('Click detected on:', e.target);
      this.handleClick(e);
    }, true); // Use capture phase to ensure we catch it

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => this.handlePopState(e));

    // Store initial state
    history.replaceState({ path: window.location.pathname }, '', window.location.pathname);

    console.log('Router setup complete');
  }

  handleClick(e) {
    const link = e.target.closest('a[href]');

    if (!link) return;

    // Check if it's an internal link
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) {
      return; // Let browser handle external/anchor links
    }

    console.log('Router intercepting click to:', href);

    // Prevent default navigation
    e.preventDefault();
    e.stopPropagation();

    // Navigate via SPA
    this.navigate(href);
  }

  handlePopState(e) {
    if (e.state && e.state.path) {
      this.loadPage(e.state.path, false);
    }
  }

  navigate(path) {
    // Update browser history
    history.pushState({ path }, '', path);

    // Load new content
    this.loadPage(path, true);
  }

  async loadPage(path, updateHistory = true) {
    try {
      console.log('Loading page:', path);

      // Show loading state (optional)
      this.contentContainer.style.opacity = '0.5';

      // Fetch the new page
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);

      const html = await response.text();
      console.log('Fetched HTML, length:', html.length);

      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract the main content and nav
      let newContent = doc.querySelector('main');

      // If no main tag (homepage), grab the content directly
      if (!newContent) {
        newContent = doc.querySelector('.album-grid-container');
        if (newContent) {
          // Wrap it in a temporary container
          const wrapper = document.createElement('div');
          wrapper.appendChild(newContent.cloneNode(true));
          newContent = wrapper;
        }
      }

      if (!newContent) {
        newContent = doc.body;
      }

      const newNav = doc.querySelector('nav');
      const newTitle = doc.querySelector('title')?.textContent || 'Coherenceism Music';

      console.log('Parsed content, updating DOM');

      // Update page title
      document.title = newTitle;

      // Update nav if changed
      if (newNav && this.navContainer) {
        this.navContainer.innerHTML = newNav.innerHTML;
      }

      // Update main content
      this.contentContainer.innerHTML = newContent.innerHTML;

      // Restore opacity
      this.contentContainer.style.opacity = '1';

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Re-initialize any interactive elements (album play buttons, etc.)
      this.reinitializeInteractions();

      console.log('Page loaded successfully');

    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to traditional navigation
      window.location.href = path;
    }
  }

  reinitializeInteractions() {
    // The global player listeners are event-delegated, so they work automatically
    // But we need to tell the player to check for new elements if needed
    if (window.globalPlayer) {
      console.log('Page content updated, player still active');
    }
  }
}

// Initialize router
console.log('Creating CoherenceRouter instance');
const coherenceRouter = new CoherenceRouter();
window.coherenceRouter = coherenceRouter;
console.log('Router created and exposed on window:', coherenceRouter);
