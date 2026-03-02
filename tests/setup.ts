/**
 * Test Setup
 * 
 * Global setup for all tests.
 * This file is loaded before each test file.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:../db/custom.db';
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log in tests (optional)
  // console.log = () => {};
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

afterEach(() => {
  // Clear any mocks after each test
});

// Global test utilities
declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<void>;
    randomId: () => string;
  };
}

globalThis.testUtils = {
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  randomId: () => Math.random().toString(36).substring(7),
};
