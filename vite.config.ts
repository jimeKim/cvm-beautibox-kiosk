import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Electron 빌드인지 확인
  const isElectron = process.env.ELECTRON === 'true' || mode === 'production';
  
  return {
    plugins: [
      react(),
      // electron 플러그인 제거하여 중복 실행 방지
      // concurrently로 실행되는 npm run electron만 사용
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/components': resolve(__dirname, 'src/components'),
        '@/pages': resolve(__dirname, 'src/pages'),
        '@/hooks': resolve(__dirname, 'src/hooks'),
        '@/store': resolve(__dirname, 'src/store'),
        '@/types': resolve(__dirname, 'src/types'),
        '@/utils': resolve(__dirname, 'src/utils'),
        '@/assets': resolve(__dirname, 'src/assets'),
        '@/locales': resolve(__dirname, 'src/locales')
      }
    },
    // Electron에서 상대 경로 사용
    base: isElectron ? './' : '/',
    server: {
      port: 5173
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  }
}) 