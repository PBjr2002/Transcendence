import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

const isDocker = process.env.DOCKER_BUILD === 'true';

function loadCerts() {
  try {
    const backendCertDir = path.resolve(__dirname, '../backend/certs');
    const keyPath = path.join(backendCertDir, 'key.pem');
    const certPath = path.join(backendCertDir, 'cert.pem');
    if (!isDocker && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  } catch (err) {
    // fall through to false below
  }
  return false;
}

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    https: loadCerts(),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
