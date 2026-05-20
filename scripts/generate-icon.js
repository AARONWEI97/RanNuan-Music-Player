const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
// Android adaptive icon safe zone is 72% of the canvas (center 738x738)
const SAFE_ZONE_RATIO = 0.72;
const SAFE_ZONE_SIZE = Math.round(SIZE * SAFE_ZONE_RATIO); // ~738
const SAFE_ZONE_OFFSET = Math.round((SIZE - SAFE_ZONE_SIZE) / 2); // ~143

async function generateIcon() {
  const logoPath = path.resolve(__dirname, '..', 'top-logo.png');
  const iconOutput = path.resolve(__dirname, '..', 'assets', 'icon.png');
  const adaptiveIconOutput = path.resolve(__dirname, '..', 'assets', 'adaptive-icon.png');
  const faviconOutput = path.resolve(__dirname, '..', 'assets', 'favicon.png');
  const splashOutput = path.resolve(__dirname, '..', 'assets', 'splash-icon.png');

  const logoBuffer = await sharp(logoPath).toBuffer();

  // =====================================================
  // 1. icon.png (iOS) - 1024x1024 white square with logo
  //    iOS applies squircle mask automatically, so no rounded corners needed
  //    Add a subtle inner border for visual style
  // =====================================================
  const iosLogoSize = 680; // logo size within the 1024 square
  const iosLogoOffset = Math.round((SIZE - iosLogoSize) / 2);

  const iosResizedLogo = await sharp(logoBuffer)
    .resize(iosLogoSize, iosLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // SVG for subtle inner border on white background
  const iosBorderSvg = `
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="white"/>
      <rect x="32" y="32" width="${SIZE - 64}" height="${SIZE - 64}" rx="64" ry="64" 
            fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="3"/>
    </svg>
  `;

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([
      { input: Buffer.from(iosBorderSvg), top: 0, left: 0 },
      { input: iosResizedLogo, top: iosLogoOffset, left: iosLogoOffset }
    ])
    .png()
    .toFile(iconOutput);
  console.log(`✅ Generated: ${iconOutput} (iOS icon - white square with logo)`);

  // =====================================================
  // 2. adaptive-icon.png (Android) - 1024x1024 transparent with logo in safe zone
  //    Android handles background color and shape mask
  //    Foreground should ONLY be the logo on transparent background
  // =====================================================
  const androidLogoSize = SAFE_ZONE_SIZE - 60; // logo within safe zone with some padding
  const androidLogoOffset = Math.round((SIZE - androidLogoSize) / 2);

  const androidResizedLogo = await sharp(logoBuffer)
    .resize(androidLogoSize, androidLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: androidResizedLogo, top: androidLogoOffset, left: androidLogoOffset }
    ])
    .png()
    .toFile(adaptiveIconOutput);
  console.log(`✅ Generated: ${adaptiveIconOutput} (Android foreground - logo on transparent)`);

  // =====================================================
  // 3. favicon.png (Web) - 48x48
  // =====================================================
  await sharp({
    create: { width: 48, height: 48, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([
      { input: await sharp(logoBuffer).resize(40, 40, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer(), top: 4, left: 4 }
    ])
    .png()
    .toFile(faviconOutput);
  console.log(`✅ Generated: ${faviconOutput} (Web favicon)`);

  // =====================================================
  // 4. splash-icon.png - 1024x1024 white with centered logo
  // =====================================================
  const splashLogo = await sharp(logoBuffer)
    .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: splashLogo, top: (SIZE - 600) / 2, left: (SIZE - 600) / 2 }])
    .png()
    .toFile(splashOutput);
  console.log(`✅ Generated: ${splashOutput} (Splash screen icon)`);

  console.log('\n🎉 All icons generated!');
  console.log('\n⚠️  Next steps:');
  console.log('   1. Run: npx expo prebuild --clean');
  console.log('   2. Run: npx expo run:android');
}

generateIcon().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
