import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Fix: Import process from node:process to resolve 'cwd' property typing error
import process from 'node:process';
// Fix: Import URL utilities to recreate __dirname in ESM
import { fileURLToPath } from 'url';

// Fix: Define __dirname manually as it is not available in ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ''),
      // Ensure process.env exists for compatibility
      'process.env': JSON.stringify(env),
    },
    server: {
      proxy: {
        '/ollama-proxy': {
          target: 'https://ollama.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama-proxy/, ''),
        },
      },
    },
  };
});