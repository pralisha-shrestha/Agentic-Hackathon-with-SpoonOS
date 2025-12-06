import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // This tells Vite to automatically proxy any request starting with /api 
    // to your Python/SpoonOS backend running on port 8000.
    proxy: {
      '/generate-contract': {
        target: 'http://localhost:8000', 
        changeOrigin: true, // Necessary for cross-origin requests
        rewrite: (path) => path.replace(/^\/generate-contract/, '/generate-contract'),
      },
    },
  },
});