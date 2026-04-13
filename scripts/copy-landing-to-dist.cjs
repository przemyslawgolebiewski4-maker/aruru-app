/**
 * Expo web export does not copy repo-root public/*.html into dist.
 * Vercel routes / to /landing.html; /privacy, /terms, /impressum, /help use their own HTML in dist.
 * Expo export copies public/*.html into dist; this copies fresh public/landing.html after export.
 */
const crypto = require('crypto');
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

// Cache-bust og-image in dist only (source public/landing.html stays unversioned)
let html = fs.readFileSync(dest, 'utf8');
const svgPath = path.join(root, 'public', 'og-image.svg');
let version = 'v1';
if (fs.existsSync(svgPath)) {
  // Normalize newlines so MD5 matches Linux CI and Windows (git autocrlf) checkouts
  const svgText = fs.readFileSync(svgPath, 'utf8');
  const svgNormalized = svgText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const hash = crypto
    .createHash('md5')
    .update(svgNormalized, 'utf8')
    .digest('hex')
    .slice(0, 8);
  version = hash;
}
html = html.replace(
  /og-image\.jpg(\?v=[a-z0-9]+)?/g,
  `og-image.jpg?v=${version}`
);
fs.writeFileSync(dest, html);
console.log(`copy-landing-to-dist: og-image cache-busted with v=${version}`);

// Open Graph asset (canonical name: og-image.jpg — not aruru_og_image.jpg / .png)
const ogSrc = path.join(root, 'public', 'og-image.jpg');
const ogDest = path.join(root, 'dist', 'og-image.jpg');
if (fs.existsSync(ogSrc)) {
  fs.copyFileSync(ogSrc, ogDest);
  console.log('copy-landing-to-dist: public/og-image.jpg → dist/og-image.jpg');
}

const ogSvgSrc = path.join(root, 'public', 'og-image.svg');
const ogSvgDest = path.join(root, 'dist', 'og-image.svg');
if (fs.existsSync(ogSvgSrc)) {
  fs.copyFileSync(ogSvgSrc, ogSvgDest);
  console.log('copy-landing-to-dist: public/og-image.svg → dist/og-image.svg');
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
