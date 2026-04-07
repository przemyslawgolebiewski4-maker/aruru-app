/**
 * Expo web export does not copy repo-root public/*.html into dist.
 * Vercel routes / to /landing.html; /privacy and /terms use their own HTML in dist.
 * Expo export copies public/*.html into dist; this copies fresh public/landing.html after export.
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

// Open Graph asset (canonical name: og-image.jpg — not aruru_og_image.jpg / .png)
const ogSrc = path.join(root, 'public', 'og-image.jpg');
const ogDest = path.join(root, 'dist', 'og-image.jpg');
if (fs.existsSync(ogSrc)) {
  fs.copyFileSync(ogSrc, ogDest);
  console.log('copy-landing-to-dist: public/og-image.jpg → dist/og-image.jpg');
}

const sitemapSrc = path.join(root, 'public', 'sitemap.xml');
const sitemapDest = path.join(root, 'dist', 'sitemap.xml');
if (fs.existsSync(sitemapSrc)) {
  fs.copyFileSync(sitemapSrc, sitemapDest);
  console.log('copy-landing-to-dist: public/sitemap.xml → dist/sitemap.xml');
}

const sitemapXslSrc = path.join(root, 'public', 'sitemap.xsl');
const sitemapXslDest = path.join(root, 'dist', 'sitemap.xsl');
if (fs.existsSync(sitemapXslSrc)) {
  fs.copyFileSync(sitemapXslSrc, sitemapXslDest);
  console.log('copy-landing-to-dist: public/sitemap.xsl → dist/sitemap.xsl');
}

const robotsSrc = path.join(root, 'public', 'robots.txt');
const robotsDest = path.join(root, 'dist', 'robots.txt');
if (fs.existsSync(robotsSrc)) {
  fs.copyFileSync(robotsSrc, robotsDest);
  console.log('copy-landing-to-dist: public/robots.txt → dist/robots.txt');
}
