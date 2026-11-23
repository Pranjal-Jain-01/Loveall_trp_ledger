import { afterAll } from '@jest/globals';
import { closePool } from '../src/config/db.js';

afterAll(async () => {
  await closePool();
});