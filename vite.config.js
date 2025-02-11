import { defineConfig } from 'vite';

export default defineConfig({
  root: './src', // Set Vite's root to the `src` folder
  server: {
    port: 3000,  // Ensure it matches Tauri's `devUrl`
    cors: true,  // Enable CORS for Tauri
  },
});
