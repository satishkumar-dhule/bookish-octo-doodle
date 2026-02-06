import express from 'express';
import healthRouter from './routes/health.js';

const app = express();

// Mount health route (unauthenticated)
app.use('/health', healthRouter);

export default app;

export const startServer = (port = process.env.PORT || 3000) => {
  return app.listen(port, () => {
    // no-op
  });
};
