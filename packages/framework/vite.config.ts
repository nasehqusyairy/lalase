import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import babel from 'vite-plugin-babel';
import path from 'path';

export default defineConfig({
  plugins: [
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
      '@': path.resolve(__dirname, './src'),
      '@client': path.resolve(__dirname, './src/client'),
      '@server': path.resolve(__dirname, './src/server'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  }
})