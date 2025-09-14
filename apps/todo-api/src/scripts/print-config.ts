#!/usr/bin/env tsx

import { printEffectiveConfig } from '../config/display.js';

try {
  const output = printEffectiveConfig();
  console.log(output);
} catch (error) {
  console.error(
    'Error loading configuration:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
