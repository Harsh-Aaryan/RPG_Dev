import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@netlify/vite-plugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), netlify({ edgeFunctions: { enabled: false } })],
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'netlify/tests/**/*.test.ts'] },
} as never);
