import { createApp, startServer } from '@server/bootstrap/app';
/**
 * Main entry point for the Express server
 * Refactored to use modular middleware architecture
 */

// Global rejection handler to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function main() {
    const app = createApp();
    await startServer(app);
}

main();
