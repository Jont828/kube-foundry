import app from './hono-app';
import logger from './lib/logger';

const PORT = process.env.PORT || 3001;

// Start the server using Bun's native server
const server = Bun.serve({
  port: Number(PORT),
  fetch: app.fetch,
});

logger.info({ port: server.port }, `🚀 KubeFoundry backend running on http://localhost:${server.port}`);
