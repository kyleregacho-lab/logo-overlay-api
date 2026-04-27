const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));

const LOGO_PATH = path.join(__dirname, 'logo-white.svg');
const LOGO_SIZE_RATIO = 0.25; // 25% of banner width

// Load and base64-embed fonts so SVG renders them even without system install
function loadFontBase64(filename) {
  try {
    const p = path.join(__dirname, 'fonts', filename);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p).toString('base64');
  } catch { return null; }
}

const FONTS = {
  poppinsBold: loadFontBase64('Poppins-Bold.ttf'),
  poppinsItalic: loadFontBase64('Poppins-Italic.ttf'),
  heeboBold: loadFontBase64('Heebo-Bold.ttf'),
  heeboRegular: loadFontBase64('Heebo-Regular.ttf'),
};

function fontFaceCss() {
  const faces = [];
  if (FONTS.poppinsBold) faces.push(`@font-face{font-family:'Poppins';font-weight:700;font-style:normal;src:url(data:font/ttf;base64,${FONTS.poppinsBold}) format('truetype');}`);
  if (FONTS.poppinsItalic) faces.push(`@font-face{font-family:'Poppins';font-weight:400;font-style:italic;src:url(data:font/ttf;base64,${FONTS.poppinsItalic}) format('truetype');}`);
  if (FONTS.heeboBold) faces.push(`@font-face{font-family:'Heebo';font-weight:700;font-style:normal;src:url(data:font/ttf;base64,${FONTS.heeboBold}) format('truetype');}`);
  if (FONTS.heeboRegular) faces.push(`@font-face{font-family:'Heebo';font-weight:400;font-style:normal;src:url(data:font/ttf;base64,${FONTS.heeboRegular}) format('truetype');}`);
  return faces.join('');
}

function escapeXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapText(text, maxCharsPerLine) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildTextSvg({ width, height, headline, subhead, language }) {
  const isHebrew = language === 'he';
  const fontFamily = isHebrew ? 'Heebo' : 'Poppins';
  const direction = isHebrew ? 'rtl' : 'ltr';

  const headlineSize = Math.round(width * 0.085);
  const subheadSize = Math.round(width * 0.033);

  const headlineLines = wrapText(headline, isHebrew ? 14 : 16);
  const subheadLines = wrapText(subhead, isHebrew ? 32 : 36);

  const lineHeight = Math.round(headlineSize * 1.1);
  const subLineHeight = Math.round(subheadSize * 1.4);

  // Vertical center the block
  const totalHeadlineH = headlineLines.length * lineHeight;
  const gap = Math.round(headlineSize * 0.6);
  const totalSubheadH = subheadLines.length * subLineHeight;
  const blockH = totalHeadlineH + gap + totalSubheadH;
  const startY = Math.round((height - blockH) / 2) + lineHeight;

  const cx = Math.round(width / 2);

  let headlineTspans = headlineLines.map((ln, i) =>
    `<tspan x="${cx}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(ln)}</tspan>`
  ).join('');

  let subheadTspans = subheadLines.map((ln, i) =>
    `<tspan x="${cx}" dy="${i === 0 ? 0 : subLineHeight}">${escapeXml(ln)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>${fontFaceCss()}</style></defs>
  <g>
    <text x="${cx}" y="${startY}" text-anchor="middle" direction="${direction}"
      font-family="${fontFamily}, sans-serif" font-weight="700" font-size="${headlineSize}"
      fill="#FE37A2">${headlineTspans}</text>
    <text x="${cx}" y="${startY + totalHeadlineH + gap}" text-anchor="middle" direction="${direction}"
      font-family="${fontFamily}, sans-serif" font-weight="400" font-style="italic" font-size="${subheadSize}"
      fill="#FFFFFF" opacity="0.92">${subheadTspans}</text>
  </g>
</svg>`;
}

app.get('/health', (req, res) => res.json({ ok: true, fonts: Object.fromEntries(Object.entries(FONTS).map(([k,v]) => [k, !!v])) }));

app.post('/overlay-text', async (req, res) => {
  try {
    const { image, headline, subhead, language } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image field (base64 string)' });

    const b64 = image.includes('base64,') ? image.split('base64,')[1] : image;
    const bannerBuffer = Buffer.from(b64, 'base64');

    const bannerMeta = await sharp(bannerBuffer).metadata();
    const width = bannerMeta.width || 1080;
    const height = bannerMeta.height || 1350;

    // Logo
    const logoSvg = fs.readFileSync(LOGO_PATH);
    const logoWidth = Math.round(width * LOGO_SIZE_RATIO);
    const logoBuffer = await sharp(logoSvg).resize({ width: logoWidth }).png().toBuffer();
    const logoMeta = await sharp(logoBuffer).metadata();
    const logoLeft = Math.round((width - logoMeta.width) / 2);
    const logoTop = Math.round(width * 0.03);

    // Text SVG
    const textSvg = buildTextSvg({ width, height, headline, subhead, language });
    const textBuffer = Buffer.from(textSvg);

    const outputBuffer = await sharp(bannerBuffer)
      .composite([
        { input: textBuffer, top: 0, left: 0 },
        { input: logoBuffer, top: logoTop, left: logoLeft },
      ])
      .png()
      .toBuffer();

    return res.json({
      image: outputBuffer.toString('base64'),
      mimeType: 'image/png',
      fileName: 'banner-with-text.png',
      fileSize: outputBuffer.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

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
