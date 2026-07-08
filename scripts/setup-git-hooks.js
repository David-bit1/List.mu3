'use strict';

// Instala el hook de pre-commit (no rastreado por git) copiando la plantilla.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, 'scripts', 'pre-commit-hook.sh');
const destDir = path.join(root, '.git', 'hooks');
const dest = path.join(destDir, 'pre-commit');

if (!fs.existsSync(path.join(root, '.git'))) {
  console.error('No se encontró .git; ejecuta dentro del repo.');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
fs.chmodSync(dest, 0o755);
console.log('✔ Hook de pre-commit instalado en .git/hooks/pre-commit');
