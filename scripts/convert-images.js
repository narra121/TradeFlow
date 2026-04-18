import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const guideDir = join(process.cwd(), 'dist', 'guide');

async function convertImages() {
  if (!existsSync(guideDir)) {
    console.log('No guide/ directory in dist — skipping image conversion.');
    return;
  }

  const pngFiles = readdirSync(guideDir).filter((f) => f.endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('No PNG files found in dist/guide/ — skipping.');
    return;
  }

  for (const file of pngFiles) {
    const inputPath = join(guideDir, file);
    const outputPath = join(guideDir, file.replace('.png', '.webp'));
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
    console.log(`  ${file} → ${file.replace('.png', '.webp')}`);
  }

  console.log(`\nConverted ${pngFiles.length} images to WebP.`);
}

convertImages().catch((err) => {
  console.error('Image conversion failed:', err);
  process.exit(1);
});
