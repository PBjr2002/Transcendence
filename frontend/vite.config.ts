import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../app/certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../app/certs/cert.pem')),
    },
    port: 3000,
    host: true,
    middlewareMode: false,
    fs: {
      strict: false
    }
  },
  base: './'
});
