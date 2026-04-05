/**
 * Expo web export does not copy repo-root public/*.html into dist.
 * Vercel routes / and /privacy|/terms to /landing.html — file must exist in dist.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'landing.html');
const dest = path.join(root, 'dist', 'landing.html');

if (!fs.existsSync(src)) {
  console.warn('copy-landing-to-dist: public/landing.html not found, skip');
  process.exit(0);
}

if (!fs.existsSync(path.join(root, 'dist'))) {
  console.error('copy-landing-to-dist: dist/ missing — run expo export first');
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('copy-landing-to-dist: public/landing.html → dist/landing.html');
