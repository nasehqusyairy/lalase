import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'oerem',
        globals: false,
        include: ['tests/**/*.test.ts'],
        exclude: ['tests/helpers/**'],
    },
});
