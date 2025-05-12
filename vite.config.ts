import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlifyPlugin from './netlify'

export default defineConfig({
  plugins: [
    react(),
    process.env.NODE_ENV === 'production' && netlifyPlugin()
  ],
  // Ensure assets are properly handled
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})