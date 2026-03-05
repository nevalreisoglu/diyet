const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, '../public/icons/icon-192x192.svg'), 'utf8');

async function generateIcon(page, size, outputPath) {
  const scaledSvg = svgContent
    .replace('viewBox="0 0 192 192"', `viewBox="0 0 192 192" width="${size}" height="${size}"`)
    .replace('<svg ', `<svg width="${size}" height="${size}" `);

  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body { width: ${size}px; height: ${size}px; overflow: hidden; }
        svg { display: block; }
      </style>
    </head>
    <body>${scaledSvg}</body>
    </html>
  `);

  await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function generateSplash(page, width, height, outputPath) {
  await page.setViewportSize({ width, height });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body {
          width: ${width}px;
          height: ${height}px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }
        .icon-wrap {
          width: 120px;
          height: 120px;
          border-radius: 26px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .title {
          color: white;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .subtitle {
          color: rgba(255,255,255,0.8);
          font-size: 15px;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="none" width="80" height="80">
          <g transform="translate(48, 48)">
            <path d="M72 24c0 6.6-5.4 12-12 12H36c-6.6 0-12-5.4-12-12s5.4-12 12-12h24c6.6 0 12 5.4 12 12z" fill="#fff" opacity="0.9"/>
            <path d="M84 48c0 6.6-5.4 12-12 12H24c-6.6 0-12-5.4-12-12s5.4-12 12-12h48c6.6 0 12 5.4 12 12z" fill="#fff"/>
            <path d="M72 72c0 6.6-5.4 12-12 12H36c-6.6 0-12-5.4-12-12s5.4-12 12-12h24c6.6 0 12 5.4 12 12z" fill="#fff" opacity="0.9"/>
          </g>
        </svg>
      </div>
      <div class="title">Beslenme Günlüğü</div>
      <div class="subtitle">Sağlıklı Yaşam Takibi</div>
    </body>
    </html>
  `);

  await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width, height } });
  console.log(`Generated splash: ${outputPath} (${width}x${height})`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const iconsDir = path.join(__dirname, '../public/icons');
  const splashDir = path.join(__dirname, '../public/splash');
  if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

  // App icons
  await generateIcon(page, 180, path.join(iconsDir, 'apple-touch-icon.png'));
  await generateIcon(page, 192, path.join(iconsDir, 'icon-192x192.png'));
  await generateIcon(page, 512, path.join(iconsDir, 'icon-512x512.png'));

  // iOS Splash screens (portrait: width x height)
  // iPhone SE (2nd gen), 8
  await generateSplash(page, 750, 1334, path.join(splashDir, 'apple-splash-750-1334.png'));
  // iPhone 12 mini, 13 mini
  await generateSplash(page, 1080, 2340, path.join(splashDir, 'apple-splash-1080-2340.png'));
  // iPhone 12, 13, 14
  await generateSplash(page, 1170, 2532, path.join(splashDir, 'apple-splash-1170-2532.png'));
  // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
  await generateSplash(page, 1284, 2778, path.join(splashDir, 'apple-splash-1284-2778.png'));
  // iPhone 14 Pro
  await generateSplash(page, 1179, 2556, path.join(splashDir, 'apple-splash-1179-2556.png'));
  // iPhone 14 Pro Max
  await generateSplash(page, 1290, 2796, path.join(splashDir, 'apple-splash-1290-2796.png'));
  // iPhone 15, 15 Pro
  await generateSplash(page, 1179, 2556, path.join(splashDir, 'apple-splash-1179-2556-p.png'));
  // iPhone 15 Plus, 15 Pro Max
  await generateSplash(page, 1290, 2796, path.join(splashDir, 'apple-splash-1290-2796-p.png'));
  // iPhone 16, 16 Pro
  await generateSplash(page, 1206, 2622, path.join(splashDir, 'apple-splash-1206-2622.png'));
  // iPhone 16 Plus, 16 Pro Max
  await generateSplash(page, 1320, 2868, path.join(splashDir, 'apple-splash-1320-2868.png'));

  await browser.close();
  console.log('All assets generated!');
})();
