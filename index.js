const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));

const LOGO_PATH = path.join(__dirname, 'logo-white.svg');
const LOGO_SIZE_RATIO = 0.18; // 18% of banner width

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/overlay', async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image field (base64 string)' });
    }

    // Decode banner
    const b64 = image.includes('base64,') ? image.split('base64,')[1] : image;
    const bannerBuffer = Buffer.from(b64, 'base64');

    // Load logo SVG
    const logoSvg = fs.readFileSync(LOGO_PATH);

    // Get banner dimensions
    const bannerMeta = await sharp(bannerBuffer).metadata();
    const bannerWidth = bannerMeta.width || 1080;

    // Render logo at LOGO_SIZE_RATIO of banner width
    const logoWidth = Math.round(bannerWidth * LOGO_SIZE_RATIO);
    const logoBuffer = await sharp(logoSvg)
      .resize({ width: logoWidth })
      .png()
      .toBuffer();

    const logoMeta = await sharp(logoBuffer).metadata();
    const left = Math.round((bannerWidth - logoMeta.width) / 2);
    const top = Math.round(bannerWidth * 0.03);

    // Composite
    const outputBuffer = await sharp(bannerBuffer)
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toBuffer();

    return res.json({
      image: outputBuffer.toString('base64'),
      mimeType: 'image/png',
      fileName: 'banner-with-logo.png',
      fileSize: outputBuffer.length
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Logo overlay API running on port ${PORT}`));
