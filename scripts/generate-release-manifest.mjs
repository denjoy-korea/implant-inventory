#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const releaseFilePath = path.join(repoRoot, 'public', 'release.json');
const buildId = (
  process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || process.env.BUILD_ID
  || 'dev-local'
).trim();

let previous = {};
if (fs.existsSync(releaseFilePath)) {
  try {
    previous = JSON.parse(fs.readFileSync(releaseFilePath, 'utf8'));
  } catch {
    previous = {};
  }
}

const previousBuildId = typeof previous.build_id === 'string' ? previous.build_id.trim() : '';
const previousReleasedAt = typeof previous.released_at === 'string' ? previous.released_at : '';

const next = {
  build_id: buildId,
  force_update: Boolean(previous.force_update),
  message: typeof previous.message === 'string' ? previous.message : '',
  released_at: previousBuildId === buildId && previousReleasedAt
    ? previousReleasedAt
    : new Date().toISOString(),
};

const nextContent = `${JSON.stringify(next, null, 2)}\n`;
const currentContent = fs.existsSync(releaseFilePath)
  ? fs.readFileSync(releaseFilePath, 'utf8')
  : '';

if (currentContent !== nextContent) {
  fs.writeFileSync(releaseFilePath, nextContent, 'utf8');
  console.log(`[release-manifest] updated: ${releaseFilePath}`);
} else {
  console.log('[release-manifest] unchanged');
}

