import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import babel from 'vite-plugin-babel';
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    babel({
      filter: /src\/.*\.(js|jsx|ts|tsx)$/,
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
        ],
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }]
        ],
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src/client'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: './src/client/app.tsx',
    },
  },
})