import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const templatePath = join(process.cwd(), 'scripts', 'og-template.html');

async function generateOgImage() {
  const template = readFileSync(templatePath, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(template, { waitUntil: 'load' });

  await page.screenshot({
    path: join(distDir, 'og-image.png'),
    type: 'png',
  });

  await browser.close();
  console.log('Generated og-image.png (1200x630)');
}

generateOgImage().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
