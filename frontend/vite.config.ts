import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Only the photos the app uses, committed; the full library in media/ is not in git.
      '@media': path.resolve(__dirname, './src/assets/photos'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
