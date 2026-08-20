// scripts/gerar-icones.js
// Executar: node scripts/gerar-icones.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Gerando ícones para PWA...\n');

// Verificar se sharp está instalado
try {
  require.resolve('sharp');
} catch (e) {
  console.log('📦 Instalando sharp...');
  execSync('npm install sharp --save-dev', { stdio: 'inherit' });
}

const sharp = require('sharp');

// Cores do See&Agende
const PRIMARY = '#667eea';
const SECONDARY = '#764ba2';
const BG = '#0f0f1a';
const TEXT = '#ffffff';

// Tamanhos dos ícones
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Criar pasta de ícones
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`📁 Pasta criada: ${iconsDir}`);
}

// Função para gerar um ícone
async function generateIcon(size) {
  const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  
  // SVG base com gradiente e texto "SA"
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${PRIMARY.replace('#', '')};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${SECONDARY.replace('#', '')};stop-opacity:1" />
        </linearGradient>
        <clipPath id="clip">
          <rect width="${size}" height="${size}" rx="${size * 0.22}" />
        </clipPath>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)" />
      <text x="50%" y="58%" text-anchor="middle" font-family="Arial, sans-serif" 
            font-weight="800" font-size="${size * 0.45}" fill="white" 
            letter-spacing="${size * 0.02}" dominant-baseline="central">
        SA
      </text>
    </svg>
  `;

  // Converter SVG para PNG
  await sharp(Buffer.from(svg))
    .png({ quality: 100 })
    .toFile(outputPath);
  
  console.log(`✅ Ícone gerado: ${size}x${size}`);
  
  return outputPath;
}

// Gerar todos os ícones
async function generateAllIcons() {
  console.log('\n🔄 Gerando ícones...\n');
  
  for (const size of sizes) {
    await generateIcon(size);
  }
  
  console.log('\n✅ Todos os ícones gerados com sucesso!');
  console.log(`📁 Localização: ${iconsDir}`);
}

generateAllIcons().catch(console.error);