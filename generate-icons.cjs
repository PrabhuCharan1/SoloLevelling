const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp futuristic vector SVG icon for QuestLife
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a1936" />
      <stop offset="60%" stop-color="#050711" />
      <stop offset="100%" stop-color="#030408" />
    </radialGradient>
    
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#7928ca" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="60%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#6b21a8" />
    </linearGradient>

    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1830" />
      <stop offset="100%" stop-color="#04060d" />
    </linearGradient>

    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="108" fill="url(#bgGlow)" />
  <rect width="512" height="512" rx="108" fill="none" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.15" />
  
  <!-- Subtle circular energy field -->
  <circle cx="256" cy="256" r="190" fill="url(#coreGlow)" />
  <circle cx="256" cy="256" r="180" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.12" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="#a855f7" stroke-width="1" stroke-opacity="0.15" />

  <!-- Outer Cybernetic Framing Hexagon -->
  <polygon points="256,64 416,156 416,356 256,448 96,356 96,156" 
           fill="url(#shieldGrad)" stroke="#1e293b" stroke-width="3" />
  <polygon points="256,76 404,162 404,350 256,436 108,350 108,162" 
           fill="none" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.3" />

  <!-- Outer Accent Tech Marks -->
  <path d="M 256,76 L 256,104" stroke="#00f0ff" stroke-width="4" stroke-linecap="round" filter="url(#subtleGlow)" />
  <path d="M 256,408 L 256,436" stroke="#a855f7" stroke-width="4" stroke-linecap="round" filter="url(#subtleGlow)" />
  <path d="M 120,168 L 140,180" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" />
  <path d="M 392,168 L 372,180" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" />
  <path d="M 120,344 L 140,332" stroke="#a855f7" stroke-width="3" stroke-linecap="round" />
  <path d="M 392,344 L 372,332" stroke="#a855f7" stroke-width="3" stroke-linecap="round" />

  <!-- Central Hunter Crest Monolith: Futuristic Geometric 'Q' & Ascension Diamond -->
  <!-- Upper Ascension Chevrons -->
  <g filter="url(#neonGlow)">
    <!-- Top Crown Spear / Ascension Vector -->
    <polygon points="256,120 286,168 256,158 226,168" fill="url(#cyanGrad)" />
    
    <!-- Primary Left Wing Blade -->
    <path d="M 240,172 L 176,268 L 206,274 L 252,206 Z" fill="url(#cyanGrad)" />
    <!-- Primary Right Wing Blade -->
    <path d="M 272,172 L 336,268 L 306,274 L 260,206 Z" fill="url(#cyanGrad)" />
  </g>

  <!-- Lower Energy Root & Q Slash -->
  <g filter="url(#subtleGlow)">
    <path d="M 204,290 L 176,334 L 216,340 L 236,308 Z" fill="url(#purpleGrad)" />
    <path d="M 308,290 L 336,334 L 296,340 L 276,308 Z" fill="url(#purpleGrad)" />
    
    <!-- Cybernetic Q-Spur Blade breaking through bottom right -->
    <polygon points="268,318 348,398 332,408 258,340" fill="url(#cyanGrad)" filter="url(#neonGlow)" />
  </g>

  <!-- Central Floating Power Diamond (System Core) -->
  <g filter="url(#neonGlow)">
    <!-- Outer Diamond -->
    <polygon points="256,212 300,256 256,300 212,256" fill="#040914" stroke="#00f0ff" stroke-width="3" />
    <!-- Inner Radiant Core -->
    <polygon points="256,226 286,256 256,286 226,256" fill="url(#cyanGrad)" />
    <circle cx="256" cy="256" r="7" fill="#ffffff" />
  </g>
</svg>`;

// Maskable icon with 15% safe padding
const svgMaskableIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="maskBg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0a1936" />
      <stop offset="50%" stop-color="#050711" />
      <stop offset="100%" stop-color="#020306" />
    </radialGradient>
    <radialGradient id="coreGlowM" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#7928ca" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="cyanGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="purpleGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="60%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#6b21a8" />
    </linearGradient>
    <linearGradient id="shieldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1830" />
      <stop offset="100%" stop-color="#04060d" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for maskable circle/squircle clipping -->
  <rect width="512" height="512" fill="url(#maskBg)" />

  <!-- Centered Scaled Content in safe zone (scale 0.76 centered) -->
  <g transform="translate(61.44, 61.44) scale(0.76)">
    <circle cx="256" cy="256" r="190" fill="url(#coreGlowM)" />
    <circle cx="256" cy="256" r="180" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.2" stroke-dasharray="8 8" />
    <circle cx="256" cy="256" r="140" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.25" />

    <polygon points="256,64 416,156 416,356 256,448 96,356 96,156" 
             fill="url(#shieldGradM)" stroke="#1e293b" stroke-width="4" />
    <polygon points="256,76 404,162 404,350 256,436 108,350 108,162" 
             fill="none" stroke="#00f0ff" stroke-width="2.5" stroke-opacity="0.4" />

    <!-- Tech Marks -->
    <path d="M 256,76 L 256,104" stroke="#00f0ff" stroke-width="5" stroke-linecap="round" />
    <path d="M 256,408 L 256,436" stroke="#a855f7" stroke-width="5" stroke-linecap="round" />
    <path d="M 120,168 L 140,180" stroke="#00f0ff" stroke-width="4" stroke-linecap="round" />
    <path d="M 392,168 L 372,180" stroke="#00f0ff" stroke-width="4" stroke-linecap="round" />
    <path d="M 120,344 L 140,332" stroke="#a855f7" stroke-width="4" stroke-linecap="round" />
    <path d="M 392,344 L 372,332" stroke="#a855f7" stroke-width="4" stroke-linecap="round" />

    <!-- Hunter Crest -->
    <polygon points="256,120 286,168 256,158 226,168" fill="url(#cyanGradM)" />
    <path d="M 240,172 L 176,268 L 206,274 L 252,206 Z" fill="url(#cyanGradM)" />
    <path d="M 272,172 L 336,268 L 306,274 L 260,206 Z" fill="url(#cyanGradM)" />
    <path d="M 204,290 L 176,334 L 216,340 L 236,308 Z" fill="url(#purpleGradM)" />
    <path d="M 308,290 L 336,334 L 296,340 L 276,308 Z" fill="url(#purpleGradM)" />
    <polygon points="268,318 348,398 332,408 258,340" fill="url(#cyanGradM)" />

    <!-- Core Diamond -->
    <polygon points="256,212 300,256 256,300 212,256" fill="#040914" stroke="#00f0ff" stroke-width="4" />
    <polygon points="256,226 286,256 256,286 226,256" fill="url(#cyanGradM)" />
    <circle cx="256" cy="256" r="8" fill="#ffffff" />
  </g>
</svg>`;

async function generateAssets() {
  console.log('Writing public/icon.svg...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), svgMaskableIcon);

  console.log('Generating PNG icons with sharp...');
  const iconBuffer = Buffer.from(svgIcon);
  const maskableBuffer = Buffer.from(svgMaskableIcon);

  // 192x192 PNG
  await sharp(iconBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 512x512 PNG
  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // 512x512 maskable PNG
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // Apple Touch Icon 180x180 PNG
  await sharp(iconBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Favicon 64x64 PNG & 32x32
  await sharp(iconBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  console.log('All PWA icon assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Error generating icon assets:', err);
  process.exit(1);
});
