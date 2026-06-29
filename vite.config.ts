import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        // port: 3000,
        // host: '0.0.0.0',
        proxy: {
          // Ollama Cloud 代理
          // http://localhost:3000/ollama-proxy/api/tags -> https://ollama.com/api/tags
          '/ollama-proxy': {
            target: 'https://ollama.com',
            changeOrigin: true,
            // Use regex to remove the prefix safely
            rewrite: (path) => path.replace(/^\/ollama-proxy/, ''),
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Raise the warning limit slightly to accommodate the React runtime, 
        // but rely on manualChunks for actual optimization.
        chunkSizeWarningLimit: 1000, 
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                // Core React
                if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                  return 'react-vendor';
                }
                // Heavy: Google GenAI SDK
                if (id.includes('@google/genai')) {
                  return 'genai-sdk';
                }
                // Heavy: Ollama SDK
                if (id.includes('ollama')) {
                  return 'ollama-sdk';
                }
                // Heavy: Syntax Highlighting (contains many language definitions)
                if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
                  return 'syntax-highlighter';
                }
                // Heavy: Markdown and Math parsing
                if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('katex') || id.includes('micromark')) {
                  return 'markdown-libs';
                }
                // UI Icons
                if (id.includes('lucide-react')) {
                  return 'ui-icons';
                }
                // General Vendor
                return 'vendor';
              }
            }
          }
        }
      }
    };
});