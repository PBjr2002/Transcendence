import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

const isDocker = process.env.DOCKER_BUILD === 'true';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    https: !isDocker ? {
      key: fs.readFileSync(path.resolve(__dirname, '../app/certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../app/certs/cert.pem')),
    } : false,
    port: 3000,
    host: true,
  }
});
