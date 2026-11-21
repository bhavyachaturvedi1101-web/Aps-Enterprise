import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('lucide-react')) {
              return 'vendor-charts-icons';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('jspdf') || id.includes('dompurify')) {
              return 'vendor-pdf-export';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
