import "fake-indexeddb/auto";
import { JSDOM } from "jsdom";
import { webcrypto } from "node:crypto";

// Setup Web Crypto API for encryption tests (must be done first)
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

if (!(global as any).crypto) {
  (global as any).crypto = webcrypto;
}

// Setup DOM for React tests
if (!globalThis.document) {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  globalThis.document = dom.document as any;
  globalThis.window = dom.window as any;
}

