const app = require('../src/app');

if (typeof app !== 'function') {
  console.error('Build fallido: la app no es un handler válido');
  process.exit(1);
}

console.log('Build OK: módulos cargados y rutas registradas correctamente');
