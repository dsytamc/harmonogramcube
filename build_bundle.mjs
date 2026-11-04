import fs from 'fs';

function cleanExportsAndImports(content) {
  return content
    // Usuń importy ES: import ... from '...';
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    // Usuń eksporty listowe: export { ... };
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')
    // Usuń słowo export przed: const, let, var, function, async function, class itp.
    .replace(/^export\s+(default\s+)?/gm, '');
}

const files = [
  'src/constants.js',
  'src/logos.js',
  'src/tileFormatter.js',
  'src/store.js',
  'src/artboardRenderer.js',
  'src/efitnessImporter.js',
  'src/embeddedFonts.js',
  'src/exporter.js',
  'src/app.js'
];

const htmlToImageCode = fs.existsSync('assets/js/html-to-image.js')
  ? fs.readFileSync('assets/js/html-to-image.js', 'utf-8')
  : '';

let bundleContent = `/* Generator Grafiku Fitness Cube - Standalone Bundle (działa bezpośrednio przez file://) */
${htmlToImageCode}

(function() {
'use strict';

`;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf-8');
  bundleContent += `\n/* ===== START FILE: ${f} ===== */\n`;
  bundleContent += cleanExportsAndImports(code);
  bundleContent += `\n/* ===== END FILE: ${f} ===== */\n`;
}

bundleContent += `\n})();\n`;

fs.writeFileSync('app.bundle.js', bundleContent, 'utf-8');
console.log('Successfully rebuilt app.bundle.js, size:', bundleContent.length);

// Sprawdź czy zostało jakiekolwiek słowo export
const matches = bundleContent.match(/\bexport\b/g);
if (matches) {
  console.error('WARNING: Found remaining export keywords:', matches.length);
} else {
  console.log('Verified: 0 export keywords remaining.');
}
