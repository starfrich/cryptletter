import express from 'express';
import { loadConfig, printConfig } from './config.js';
import { initializeFhevm, cleanup as cleanupFhevm } from './utils/fhevm-setup.js';
import { createEncryptRoutes } from './routes/encrypt.js';
import { createDecryptRoutes } from './routes/decrypt.js';
import { clearSignatureCache } from './utils/signature-helper.js';

/**
 * FHEVM Backend API
 *
 * Demonstrates FHEVM SDK integration in an Express.js backend.
 * Shows how to use @fhevm-sdk/core for server-side encryption/decryption.
 */
async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    printConfig(config);

    // Initialize FHEVM
    console.log('🚀 Initializing FHEVM instance...');
    const fhevmInstance = await initializeFhevm(config);
    console.log('✅ FHEVM instance ready\n');

    // Create Express app
    const app = express();
    app.use(express.json());

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // API Routes
    app.use('/api/encrypt', createEncryptRoutes(config, fhevmInstance));
    app.use('/api/decrypt', createDecryptRoutes(config, fhevmInstance));

    // Error handling
    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        // Log full error with stack trace for debugging
        console.error('❌ Unhandled error:', {
          message: err.message,
          stack: err.stack,
          path: req.path,
          method: req.method,
        });

        res.status(500).json({
          error: 'Internal server error',
          message:
            config.nodeEnv === 'development' ? err.message : 'An error occurred',
        });
      }
    );

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
      });
    });

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════╗
║    FHEVM Backend API Started! 🎉        ║
╚════════════════════════════════════════╝

📡 API Endpoints:
   GET    http://localhost:${config.port}/api/health
   POST   http://localhost:${config.port}/api/encrypt
   POST   http://localhost:${config.port}/api/decrypt

📚 Examples:
   # Encrypt value 42
   curl -X POST http://localhost:${config.port}/api/encrypt \\
     -H "Content-Type: application/json" \\
     -d '{"value": 42}'

   # Decrypt current counter (auto-fetches from contract)
   curl -X POST http://localhost:${config.port}/api/decrypt \\
     -H "Content-Type: application/json" \\
     -d '{}'

   # Or decrypt specific handle
   # curl -X POST http://localhost:${config.port}/api/decrypt \\
   #   -H "Content-Type: application/json" \\
   #   -d '{"handle": "0x..."}'

🔗 Learn more: https://docs.zama.ai/protocol/
`);
    });

    // Graceful shutdown handler
    const shutdown = (signal: string) => {
      console.log(`\n⚠️  ${signal} received, starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');

        // Cleanup resources
        cleanupFhevm();
        clearSignatureCache();
        console.log('✅ Resources cleaned up');

        console.log('👋 Goodbye!\n');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', {
      message: error.message,
      stack: error.stack,
    });
    console.log(
      '\n💡 Tip: Copy .env.example to .env and configure it:\n   cp .env.example .env\n'
    );
    process.exit(1);
  }
}

main();
