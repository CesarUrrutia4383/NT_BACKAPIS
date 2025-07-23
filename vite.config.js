import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/usuarios': 'http://localhost:4000',
      '/routes': 'http://localhost:4000',
      '/controllers': 'http://localhost:4000'
    }
  }
});