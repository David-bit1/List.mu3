#!/usr/bin/env node
'use strict';

// Verifica que ningún archivo `.env.example` contenga credenciales reales.
// Los `.env.example` son plantillas y deben usar únicamente placeholders.
// NO escanea los `.env` reales (que sí contienen secretos y están en .gitignore).

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

// Valores esperados (placeholders) en las plantillas.
const PLACEHOLDERS = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_SERVICE_KEY: 'TU_SERVICE_ROLE_KEY',
  SUPABASE_ANON_KEY: 'TU_ANON_KEY',
  TMDB_API_KEY: 'TU_TMDB_API_KEY',
  ADMIN_PASSWORD: 'cambia-esta-clave',
  JWT_SECRET: 'cambia-este-secreto-jwt',
};

const JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const TMDB_HEX_RE = /^[0-9a-f]{32}$/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === '.env.example') out.push(full);
  }
  return out;
}

function checkFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const issues = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value === '') continue;

    if (JWT_RE.test(value)) {
      issues.push(`${key} parece contener una clave JWT real`);
      continue;
    }
    if (key === 'TMDB_API_KEY' && TMDB_HEX_RE.test(value)) {
      issues.push(`${key} parece una API key de TMDb real (32 hex)`);
      continue;
    }
    if (key === 'SUPABASE_URL' && value.includes('supabase.co')) {
      const sub = value.replace(/^https?:\/\//, '').split('.supabase.co')[0];
      if (sub && sub !== 'TU-PROYECTO') {
        issues.push(`${key} apunta a un proyecto Supabase real (${sub})`);
        continue;
      }
    }
    if (PLACEHOLDERS[key] && value !== PLACEHOLDERS[key]) {
      issues.push(`${key} debería ser el placeholder "${PLACEHOLDERS[key]}" en .env.example`);
    }
  }
  return issues;
}

const files = walk(ROOT);
let total = 0;
for (const file of files) {
  const issues = checkFile(file);
  if (issues.length) {
    total += issues.length;
    const rel = path.relative(ROOT, file);
    console.error(`\n✖ ${rel}`);
    for (const i of issues) console.error(`  - ${i}`);
  }
}

if (total) {
  console.error(`\nSe encontraron ${total} posible(s) secreto(s) real en .env.example.`);
  console.error('Los .env.example son plantillas: usa placeholders, no claves reales.');
  console.error('Pon tus valores reales en .env (gitignore) o en el panel de Render/Vercel.\n');
  process.exit(1);
}

console.log(`✔ Sin secretos reales en ${files.length} archivo(s) .env.example`);
