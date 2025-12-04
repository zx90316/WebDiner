import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // 建置輸出到 dist 資料夾 (發布時會被複製到 wwwroot)
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true, // 確保使用指定的端口
    proxy: {
      '/api': {
        target: 'http://localhost:8201', // .NET Core API 端口
        changeOrigin: true,
      },
    },
  },
})
