const { createCanvas } = require('canvas');
const fs = require('fs');

function makeIcon(size, outputPath) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(size * 0.42)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CD', size / 2, size / 2 + size * 0.04);
  fs.writeFileSync(outputPath, c.toBuffer('image/png'));
  console.log(`done ${outputPath}`);
}

makeIcon(192, 'frontend/public/icons/icon-192x192.png');
makeIcon(512, 'frontend/public/icons/icon-512x512.png');
