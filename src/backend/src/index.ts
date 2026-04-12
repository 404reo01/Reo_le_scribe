import { config } from './config.js';
import { createServer } from './server.js';
import { createWorker } from './mediasoup/worker.js';

async function main() {
  const worker = await createWorker();
  const { httpServer } = await createServer(worker);

  httpServer.listen(config.port, () => {
    console.log(`Backend running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
