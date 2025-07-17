import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',    // listen on all network interfaces
    port: 3000,
    proxy: {
      // REST + WebSocket
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
      },
      // API routes
      '/health':      'http://localhost:8000',
      '/secret':      'http://localhost:8000',
      '/recommend':   'http://localhost:8000',
    }
  }
})