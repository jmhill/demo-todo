import express from 'express';
import { healthCheckHandler } from './healthcheck.js';

const app = express();
const port = 3000;

app.get('/health', healthCheckHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
});
