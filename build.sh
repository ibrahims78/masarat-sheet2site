#!/bin/bash
set -e

echo "Building frontend..."
npx vite build

echo "Building server..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --packages=external \
  --outfile=dist/index.js

echo "Build complete!"
