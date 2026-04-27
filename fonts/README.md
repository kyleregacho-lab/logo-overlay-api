# Fonts

Drop these TTF files into this folder:

## Poppins (English)
Download from: https://fonts.google.com/specimen/Poppins
- `Poppins-Bold.ttf`
- `Poppins-Italic.ttf`

## Heebo (Hebrew)
Download from: https://fonts.google.com/specimen/Heebo
- `Heebo-Bold.ttf`
- `Heebo-Regular.ttf`

## Quick install (PowerShell)

```powershell
# Poppins
Invoke-WebRequest -Uri "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" -OutFile "Poppins-Bold.ttf"
Invoke-WebRequest -Uri "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Italic.ttf" -OutFile "Poppins-Italic.ttf"

# Heebo
Invoke-WebRequest -Uri "https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf" -OutFile "Heebo-Variable.ttf"
```

Note: Heebo on Google Fonts is now a variable font. If variable TTF doesn't work with Sharp SVG rendering, use static versions from https://fonts.google.com/specimen/Heebo → "Download family".

Verify fonts loaded: `GET /health` will return `fonts: { poppinsBold: true, ... }`.
