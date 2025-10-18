#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Paths
const coraPath = path.join(projectRoot, 'cora');
const requireCora = process.env.CORA_REQUIRED === 'true';
const contentPath = path.join(projectRoot, 'src', 'content');

console.log('🎵 Syncing music content from CORA...\n');

// Ensure content directory exists
if (!fs.existsSync(contentPath)) {
  fs.mkdirSync(contentPath, { recursive: true });
}

// Content sources from CORA
const contentSources = {
  albums: {
    source: 'harvest/albums/out/',
    dest: 'albums/'
  },
  songs: {
    source: 'harvest/songs/out/',
    dest: 'songs/'
  }
};

// Sync function
function syncDirectory(sourcePath, destPath) {
  const fullSourcePath = path.join(coraPath, sourcePath);
  const fullDestPath = path.join(contentPath, destPath);

  if (!fs.existsSync(fullSourcePath)) {
    const msg = `⚠️  Source path not found: ${fullSourcePath}`;
    if (requireCora) {
      console.error(msg);
      console.error('❌ CORA_REQUIRED is true — failing build to avoid stale deploys.');
      process.exit(1);
    } else {
      console.log(msg);
      console.log('   Using committed src/content as-is (no sync).');
      return;
    }
  }

  // Remove existing content
  if (fs.existsSync(fullDestPath)) {
    fs.rmSync(fullDestPath, { recursive: true });
  }

  // Create destination directory
  fs.mkdirSync(fullDestPath, { recursive: true });

  // Copy content
  copyRecursive(fullSourcePath, fullDestPath);
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith('.md')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Synced: ${path.relative(coraPath, srcPath)}`);
    }
  }
}

// Sync all content sources
for (const [name, config] of Object.entries(contentSources)) {
  console.log(`🎼 Syncing ${name}...`);
  syncDirectory(config.source, config.dest);
}

console.log('\n✅ Music content sync complete!');
