
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.dirname(__filename);

const disableHmr = process.env.DISABLE_HMR === 'true';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),

      // Preserve copying src/assets into dist.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',

        closeBundle() {
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');

          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
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
      // Preserve AI Studio HMR configuration.
      hmr: disableHmr ? false : undefined,

      // Disable file watching when requested.
      watch: disableHmr ? null : undefined,
    },
  };
});
