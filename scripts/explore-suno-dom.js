#!/usr/bin/env node

/**
 * Suno DOM Explorer
 *
 * Opens Suno and helps us understand the actual DOM structure
 * so we can write better selectors for the sync script.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const sessionFile = path.join(projectRoot, '.suno-session.json');

console.log('🔍 Suno DOM Explorer\n');

function loadSession() {
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
}

async function explore() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Load session
  const session = loadSession();
  if (session) {
    console.log('🔑 Loading saved session...\n');
    await page.setCookie(...session);
  }

  console.log('🌐 Opening app.suno.ai/create...\n');
  await page.goto('https://app.suno.ai/create', { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait a bit for dynamic content and potential redirects
  await page.waitForTimeout(5000);

  console.log('📍 Current URL:', page.url());

  console.log('📊 Analyzing page structure...\n');

  // Take a screenshot
  await page.screenshot({ path: path.join(projectRoot, 'suno-screenshot.png'), fullPage: true });
  console.log('📸 Screenshot saved to suno-screenshot.png\n');

  // Explore the DOM
  const analysis = await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      audioElements: [],
      links: [],
      buttons: [],
      possibleSongContainers: []
    };

    // Find audio elements
    document.querySelectorAll('audio').forEach((audio, i) => {
      data.audioElements.push({
        index: i,
        src: audio.src || audio.querySelector('source')?.src,
        parentClasses: audio.parentElement?.className,
        parentId: audio.parentElement?.id
      });
    });

    // Find links that might be songs
    document.querySelectorAll('a[href*="song"]').forEach((link, i) => {
      if (i < 10) { // Limit to first 10
        data.links.push({
          href: link.href,
          text: link.textContent?.trim()?.substring(0, 50),
          ariaLabel: link.getAttribute('aria-label')
        });
      }
    });

    // Find buttons that might play songs
    document.querySelectorAll('button').forEach((btn, i) => {
      const text = btn.textContent?.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      if (text?.toLowerCase().includes('play') || ariaLabel?.toLowerCase().includes('play')) {
        if (data.buttons.length < 10) {
          data.buttons.push({
            text,
            ariaLabel,
            classes: btn.className
          });
        }
      }
    });

    // Look for potential song container patterns
    const containers = [
      ...document.querySelectorAll('[class*="song"]'),
      ...document.querySelectorAll('[class*="track"]'),
      ...document.querySelectorAll('[class*="clip"]'),
      ...document.querySelectorAll('[data-testid]')
    ];

    containers.forEach((el, i) => {
      if (i < 20) {
        const text = el.textContent?.trim()?.substring(0, 100);
        if (text && text.length > 5 && text.length < 200) {
          data.possibleSongContainers.push({
            tag: el.tagName.toLowerCase(),
            classes: el.className,
            testId: el.getAttribute('data-testid'),
            text: text
          });
        }
      }
    });

    return data;
  });

  console.log('📋 DOM Analysis Results:\n');
  console.log('Title:', analysis.title);
  console.log('URL:', analysis.url);
  console.log('\n🎵 Audio Elements:', analysis.audioElements.length);
  if (analysis.audioElements.length > 0) {
    console.log(JSON.stringify(analysis.audioElements, null, 2));
  }

  console.log('\n🔗 Song Links:', analysis.links.length);
  if (analysis.links.length > 0) {
    console.log(JSON.stringify(analysis.links.slice(0, 5), null, 2));
  }

  console.log('\n▶️  Play Buttons:', analysis.buttons.length);
  if (analysis.buttons.length > 0) {
    console.log(JSON.stringify(analysis.buttons.slice(0, 5), null, 2));
  }

  console.log('\n📦 Possible Song Containers:', analysis.possibleSongContainers.length);
  if (analysis.possibleSongContainers.length > 0) {
    console.log(JSON.stringify(analysis.possibleSongContainers.slice(0, 10), null, 2));
  }

  // Save full analysis
  fs.writeFileSync(
    path.join(projectRoot, 'suno-dom-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  console.log('\n💾 Full analysis saved to suno-dom-analysis.json');

  console.log('\n✨ Browser will stay open for 2 minutes so you can inspect manually.');
  console.log('   Open DevTools and explore the structure yourself!');
  console.log('   Script will close automatically...\n');

  await page.waitForTimeout(120000); // 2 minutes
  await browser.close();
}

explore().catch(console.error);
