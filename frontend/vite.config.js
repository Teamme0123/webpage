import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // You can specify the port for the dev server
    proxy: {
      // Proxy API requests to the Django backend during development
      // Adjust the target if your Django backend runs on a different port
      '/api': {
        target: 'http://localhost:8000', // Assuming Django backend is on port 8000
        changeOrigin: true,
        // secure: false, // Uncomment if your backend uses self-signed SSL certs
        // rewrite: (path) => path.replace(/^\/api/, '/api') // Keep /api prefix for Django
      }
    }
  }
})
