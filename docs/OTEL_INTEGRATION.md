# OpenTelemetry Implementation Guide for demo-todo

## Overview

This guide implements production-pattern OpenTelemetry observability for a TypeScript/Express/React demo application. The goal is to demonstrate vendor-independent observability patterns that can flex into different monitoring solutions.

## Architecture

```
React App (port 3000)
    ↓
Express API (port 3001)
    ↓
MySQL Database (port 3306)
    ↓
    → OTLP → OpenTelemetry Collector (port 4318)
              ↓
           SigNoz Backend (port 3301 UI)
              ↓
           ClickHouse (storage)
```

**Key Principle:** Application code exports to OTLP only. The collector handles routing to backends. Swap backends by changing only collector config, never application code.

## Technology Choices

### Why SigNoz?
- Handles all three signals (traces, metrics, logs) in one UI
- Single Docker Compose setup for local development
- Purpose-built for OTLP
- Alternative to Jaeger (traces only) or full Grafana stack (complex)

### Signal Coverage
- **Traces**: ✅ Full distributed tracing from browser → API → database
- **Metrics**: ✅ Basic runtime + custom business metrics
- **Logs**: ✅ Winston bridge with automatic trace_id correlation

### What We're Demonstrating
1. Log/trace correlation (logs automatically tagged with trace_id)
2. Distributed tracing across frontend/backend/database
3. Vendor-independent OTLP pattern (app code never changes)
4. Auto-instrumentation where possible (Express, MySQL, fetch)

## Implementation Plan

### 1. Docker Compose Setup

```yaml
version: "3.8"

services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: demo_todo
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - DATABASE_URL=mysql://root:password@db:3306/demo_todo
    depends_on:
      - db
      - otel-collector

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  # OpenTelemetry Collector
  otel-collector:
    image: signoz/signoz-otel-collector:0.88.11
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318"  # OTLP HTTP (for apps)
      - "4317:4317"  # OTLP gRPC
    depends_on:
      - clickhouse

  # SigNoz Backend
  clickhouse:
    image: clickhouse/clickhouse-server:23.7-alpine
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    environment:
      - CLICKHOUSE_DB=signoz

  query-service:
    image: signoz/query-service:0.38.0
    command: ["-config=/root/config/prometheus.yml"]
    environment:
      - STORAGE=clickhouse
      - GODEBUG=netdns=go
      - CLICKHOUSE_HOST=clickhouse
    volumes:
      - ./signoz-query-service-config.yaml:/root/config/prometheus.yml
    depends_on:
      - clickhouse

  signoz-frontend:
    image: signoz/frontend:0.38.0
    ports:
      - "3301:3301"
    environment:
      - FRONTEND_API_ENDPOINT=http://query-service:8080
    depends_on:
      - query-service

volumes:
  mysql-data:
  clickhouse-data:
```

### 2. OpenTelemetry Collector Config

**File: `otel-collector-config.yaml`**

```yaml
receivers:
  otlp:
    protocols:
      http:
        cors:
          allowed_origins:
            - "http://localhost:3000"  # React app
      grpc:

processors:
  batch:
    send_batch_size: 10000
    timeout: 10s

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: signoz
    traces_table_name: signoz_traces
    logs_table_name: signoz_logs
    metrics_table_name: signoz_metrics

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
```

**File: `signoz-query-service-config.yaml`**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 3. Backend Implementation (Node/Express)

**Dependencies:**

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "winston": "^3.11.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/auto-instrumentations-node": "^0.39.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.45.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.45.0",
    "@opentelemetry/instrumentation-winston": "^0.32.0"
  }
}
```

**File: `backend/src/instrumentation.ts`**

This MUST be the first import in your entry point.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'demo-todo-api',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
    }),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Express, HTTP, MySQL2 are auto-instrumented
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

**File: `backend/src/index.ts`**

```typescript
import './instrumentation';  // MUST BE FIRST
import express from 'express';
import mysql from 'mysql2/promise';
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

const pool = mysql.createPool(process.env.DATABASE_URL!);

app.get('/api/todos', async (req, res) => {
  logger.info('Fetching todos');
  
  const [rows] = await pool.query('SELECT * FROM todos WHERE completed = ?', [false]);
  
  logger.info('Fetched todos', { count: (rows as any[]).length });
  res.json({ todos: rows });
});

app.post('/api/todos', async (req, res) => {
  logger.info('Creating todo', { title: req.body.title });
  
  const [result] = await pool.query(
    'INSERT INTO todos (title, completed) VALUES (?, ?)',
    [req.body.title, false]
  );
  
  res.json({ id: (result as any).insertId });
});

app.listen(3001, () => {
  logger.info('Server started', { port: 3001 });
});
```

**Auto-Instrumentation Coverage:**
- ✅ Express routes (automatic)
- ✅ HTTP requests (automatic)
- ✅ MySQL queries (automatic via mysql2)
- ✅ Winston logs get trace_id/span_id injected (automatic)

**Optional: Custom Metrics**

```typescript
// backend/src/metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('demo-todo-api');

export const todoCounter = meter.createCounter('todos.created', {
  description: 'Number of todos created',
});

// Use in routes:
// todoCounter.add(1, { user_id: userId });
```

### 4. Frontend Implementation (React)

**Dependencies:**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@opentelemetry/sdk-trace-web": "^1.18.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.45.0",
    "@opentelemetry/instrumentation-fetch": "^0.45.0",
    "@opentelemetry/instrumentation": "^0.45.0"
  }
}
```

**File: `frontend/src/instrumentation.ts`**

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'demo-todo-frontend',
  }),
});

provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    })
  )
);

provider.register();

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/localhost:3001/],
    }),
  ],
});
```

**File: `frontend/src/index.tsx`**

```typescript
import './instrumentation';  // First import
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

**Auto-Instrumentation Coverage:**
- ✅ fetch() calls (automatic)
- ✅ Trace context propagation to backend (automatic via traceparent header)

**Optional: Custom Frontend Spans**

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('demo-todo-frontend');

function TodoList() {
  const handleCreateTodo = async (title: string) => {
    const span = tracer.startSpan('user.create_todo');
    span.setAttribute('todo.title', title);
    
    try {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    } finally {
      span.end();
    }
  };
}
```

## What You'll See

### In SigNoz UI (http://localhost:3301)

**Traces Tab:**
Click "Add Todo" in React → See full distributed trace:
```
user.create_todo (browser) - 847ms
  └─ HTTP POST /api/todos (browser) - 823ms
      └─ POST /api/todos (express) - 815ms
          ├─ mysql.query INSERT INTO todos - 12ms
          └─ winston.log (log event) - 1ms
```

All spans share the same `trace_id`.

**Logs Tab:**
Every winston log includes:
```json
{
  "message": "Creating todo",
  "title": "Buy milk",
  "trace_id": "7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c",
  "span_id": "1a2b3c4d5e6f7a8b"
}
```

Click a log → Jump to its trace. Click a span → See all logs from that span.

**Metrics Tab:**
- `http.server.request.duration` (Express auto-instrumented)
- `todos.created` (custom counter)
- `process.runtime.nodejs.memory.heap.used` (auto)

## Known Limitations & Tradeoffs

### What's Simple (For a Demo)
- No sampling configuration (captures everything)
- No error handling/retry logic in exporters
- No authentication on collector
- In-memory storage (data lost on restart)
- CORS wide open for local dev

### What's Production-Ready Pattern
- OTLP as stable interface ✅
- Collector as swap point ✅
- Auto-instrumentation where possible ✅
- Structured logging with trace correlation ✅

### Frontend Observability Reality
- Auto-instrumentation is basic (fetch only)
- No auto-metrics (need custom implementation)
- Logs shouldn't go over network (use console + source maps)
- Manual spans required for business logic

### Log Bridging
Winston logs are exported as separate signals from traces. They connect via `trace_id` correlation in the UI, not a unified API. This is the current state of OTLP logs spec.

## Running the Demo

```bash
# Start everything
docker-compose up

# Visit app
open http://localhost:3000

# Visit SigNoz
open http://localhost:3301

# Create some todos to generate traces
```

## Swapping to Datadog (Production Example)

This section demonstrates the core value proposition: **zero application code changes** when switching observability backends.

### What Stays Identical
- ✅ All backend instrumentation code (`backend/src/instrumentation.ts`)
- ✅ All frontend instrumentation code (`frontend/src/instrumentation.ts`)
- ✅ All application logic and business code
- ✅ OTLP export format from your applications
- ✅ Log/trace correlation behavior
- ✅ Distributed tracing across services

### What Changes
Only infrastructure configuration - choose one of two approaches:

### Approach A: Direct to Datadog Agent (Recommended)

The Datadog Agent natively accepts OTLP on the same ports (4317/4318). This is the simplest production setup.

**Modified Docker Compose:**

```yaml
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:latest
    environment:
      - DD_API_KEY=${DD_API_KEY}  # Your Datadog API key
      - DD_SITE=datadoghq.com     # Or datadoghq.eu, etc.
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT=0.0.0.0:4317
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT=0.0.0.0:4318
      - DD_OTLP_CONFIG_LOGS_ENABLED=true
    ports:
      - "4318:4318"
      - "4317:4317"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro

  api:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4318
      # Application code unchanged!

  frontend:
    # No changes needed - still points to localhost:4318 in browser

  # Remove: clickhouse, otel-collector, query-service, signoz-frontend
```

**That's it.** Your application exports OTLP to `datadog-agent:4318` instead of `otel-collector:4318`. Everything else is identical.

### Approach B: OpenTelemetry Collector with Datadog Exporter

Keep the collector in the pipeline for advanced processing (sampling, filtering, multi-backend export).

**Modified Collector Config:**

```yaml
# otel-collector-config.datadog.yaml
receivers:
  otlp:
    protocols:
      http:
        cors:
          allowed_origins:
            - "http://localhost:3000"
      grpc:

processors:
  batch:
    send_batch_size: 10000
    timeout: 10s

exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com  # Or datadoghq.eu, etc.

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [datadog]  # Only this changed from SigNoz
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [datadog]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [datadog]
```

**Docker Compose:**

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.datadog.yaml:/etc/otel-collector-config.yaml
    environment:
      - DD_API_KEY=${DD_API_KEY}
    ports:
      - "4318:4318"

  api:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      # Application code still unchanged!

  # Remove: clickhouse, query-service, signoz-frontend
```

### Using the Datadog UI

After switching, your telemetry appears in Datadog's web UI:

**Traces:**
- Navigate to **APM → Traces** in Datadog
- See the same distributed traces: browser → API → database
- Click any trace to see the waterfall view

**Log/Trace Correlation:**
- Navigate to **Logs → Search**
- Every winston log has `trace_id` and `span_id` fields automatically
- Click "View Trace" on any log to jump to its trace
- Click "View Logs" on any trace span to see related logs

**Metrics:**
- Navigate to **Metrics → Explorer**
- See `http.server.request.duration`, `todos.created`, etc.
- All custom metrics from your application appear here

**Service Map:**
- Navigate to **APM → Service Map**
- Visual representation of `demo-todo-frontend` → `demo-todo-api` → `mysql`

### Datadog-Specific Limitations

**What works with OTLP:**
- ✅ Distributed tracing (APM)
- ✅ Log/trace correlation
- ✅ Metrics and custom metrics
- ✅ Service maps and dependency visualization
- ✅ Trace search and analytics

**What requires Datadog's native tracers:**
- ❌ Application Security Management (ASM)
- ❌ Continuous Profiler
- ❌ Some ingestion rules and sampling features

For typical monitoring use cases (understanding application behavior, debugging issues, performance tracking), OTLP provides full functionality.

### Environment Variable Setup

```bash
# .env file for local Datadog testing
DD_API_KEY=your_api_key_here
DD_SITE=datadoghq.com

# Run with:
docker-compose --env-file .env up
```

### Demo Script: Live Backend Swap

1. Run with SigNoz: `docker-compose up`
2. Generate some traces (click around in the app)
3. View traces in SigNoz at `localhost:3301`
4. Stop services: `docker-compose down`
5. Switch to Datadog config (use either approach above)
6. Start with Datadog: `docker-compose up`
7. Generate more traces (same app interactions)
8. View traces in Datadog web UI

**Key teaching moment:** Show the application code side-by-side - it's identical in both scenarios. Only infrastructure changed.

## Multi-Backend Export (Advanced)

You can even export to multiple backends simultaneously:

```yaml
# otel-collector-config.multi.yaml
exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
  
  otlphttp/honeycomb:
    endpoint: https://api.honeycomb.io
    headers:
      x-honeycomb-team: ${HONEYCOMB_API_KEY}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [datadog, otlphttp/honeycomb]  # Both!
```

This demonstrates OTLP's vendor independence - send the same data to multiple backends for migration, comparison, or redundancy.

## Key Teaching Points

1. **OTLP is the stable interface** - App exports to OTLP, collector handles vendors
2. **Auto-instrumentation first** - Only add manual spans for business logic
3. **Trace correlation** - Logs are more valuable when tied to traces
4. **Distributed context** - trace_id propagates automatically across services
5. **Vendor independence** - Swap backends without touching application code
