import { createServer } from 'node:http';
import { router } from './routes/index.mjs';

const PORT = process.env.PORT || 3500;

const server = createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Trankill running on http://localhost:${PORT}`);
});

export { server };
