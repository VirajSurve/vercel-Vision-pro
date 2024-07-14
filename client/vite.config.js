import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: 'src/index.jsx' // Ensure the entry point is correct
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Adjust as per your backend server address
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
