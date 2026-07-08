#!/bin/sh
# Pre-commit hook: bloquea commits que incluyan credenciales reales en .env.example
node scripts/check-env-examples.js
