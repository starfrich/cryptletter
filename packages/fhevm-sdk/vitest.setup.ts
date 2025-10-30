import "fake-indexeddb/auto";
import { JSDOM } from "jsdom";

// Setup DOM for React tests
if (!globalThis.document) {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  globalThis.document = dom.document as any;
  globalThis.window = dom.window as any;
}

