
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.dirname(__filename);

const disableHmr = process.env.DISABLE_HMR === 'true';

export default defineConfig(() => ({
  // GitHub Pages repository URL: /busbite/
  base: '/busbite/',

  plugins: [
    react(),
    tailwindcss(),

    {
      name: 'copy-unbundled-src-assets',
      apply: 'build',

      closeBundle() {
        const distDir = path.resolve(rootDir, 'dist');
        const srcAssets = path.resolve(rootDir, 'src/assets');
        const distAssets = path.resolve(distDir, 'src/assets');

        if (fs.existsSync(srcAssets)) {
          fs.cpSync(srcAssets, distAssets, {
            recursive: true,
            force: true,
          });
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': rootDir,
    },
  },

  server: {
    hmr: disableHmr ? false : undefined,
    watch: disableHmr ? null : undefined,
  },
}));
