import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,  // To make expect, test, etc., available globally
    setupFiles: './setupTests.ts'  // Ensure setup file is loaded
  },
});
