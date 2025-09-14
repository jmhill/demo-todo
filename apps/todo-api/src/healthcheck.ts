import type { Request, Response } from 'express';

const SERVICE_NAME = process.env.SERVICE_NAME || 'todo-api';
const VERSION = process.env.GIT_SHA || 'development';

const startTime = Date.now();

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  node: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export const healthCheckHandler = (req: Request, res: Response): void => {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;

  const healthCheck: HealthCheckResponse = {
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    node: process.version,
    memory: {
      used: Math.round(usedMem / 1024 / 1024),
      total: Math.round(totalMem / 1024 / 1024),
      percentage: Math.round((usedMem / totalMem) * 100),
    },
  };

  res.status(200).json(healthCheck);
};
