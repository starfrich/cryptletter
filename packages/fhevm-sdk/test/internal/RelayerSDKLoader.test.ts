/**
 * Tests for internal/RelayerSDKLoader.ts
 *
 * These tests cover the dynamic loading of the RelayerSDK script in browser environments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RelayerSDKLoader,
  isFhevmWindowType,
} from "../../src/internal/RelayerSDKLoader";
import { SDK_CDN_URL } from "../../src/internal/constants";

describe("RelayerSDKLoader", () => {
  describe("RelayerSDKLoader class", () => {
    describe("constructor", () => {
      it("should create instance without trace option", () => {
        const loader = new RelayerSDKLoader({});
        expect(loader).toBeInstanceOf(RelayerSDKLoader);
      });

      it("should create instance with trace option", () => {
        const trace = vi.fn();
        const loader = new RelayerSDKLoader({ trace });
        expect(loader).toBeInstanceOf(RelayerSDKLoader);
      });
    });

    describe("isLoaded", () => {
      it("should throw error when window is undefined (Node.js environment)", () => {
        const loader = new RelayerSDKLoader({});
        const originalWindow = global.window;
        // @ts-expect-error - Testing runtime behavior
        delete global.window;

        expect(() => loader.isLoaded()).toThrow(
          "RelayerSDKLoader: can only be used in the browser."
        );

        global.window = originalWindow;
      });

      it("should return false when relayerSDK is not loaded", () => {
        const loader = new RelayerSDKLoader({});
        const mockWindow = {} as any;
        global.window = mockWindow;

        expect(loader.isLoaded()).toBe(false);
      });

      it("should return true when relayerSDK is loaded and valid", () => {
        const loader = new RelayerSDKLoader({});
        const mockWindow = {
          relayerSDK: {
            initSDK: vi.fn(),
            createInstance: vi.fn(),
            SepoliaConfig: {},
          },
        } as any;
        global.window = mockWindow;

        expect(loader.isLoaded()).toBe(true);
      });

      it("should use trace function when checking if loaded", () => {
        const trace = vi.fn();
        const loader = new RelayerSDKLoader({ trace });
        const mockWindow = {} as any;
        global.window = mockWindow;

        loader.isLoaded();

        expect(trace).toHaveBeenCalled();
      });
    });

    describe("load", () => {
      let originalWindow: typeof global.window;
      let mockDocument: any;

      beforeEach(() => {
        originalWindow = global.window;
        mockDocument = {
          querySelector: vi.fn(),
          createElement: vi.fn(),
          head: {
            appendChild: vi.fn(),
          },
        };

        global.window = {
          document: mockDocument,
        } as any;
        global.document = mockDocument;
      });

      afterEach(() => {
        global.window = originalWindow;
        vi.clearAllMocks();
      });

      it("should reject when window is undefined", async () => {
        const loader = new RelayerSDKLoader({});
        // @ts-expect-error - Testing runtime behavior
        delete global.window;

        await expect(loader.load()).rejects.toThrow(
          "RelayerSDKLoader: can only be used in the browser."
        );

        global.window = originalWindow;
      });

      it("should resolve immediately if relayerSDK already exists and is valid", async () => {
        const loader = new RelayerSDKLoader({});
        global.window = {
          relayerSDK: {
            initSDK: vi.fn(),
            createInstance: vi.fn(),
            SepoliaConfig: {},
          },
          document: mockDocument,
        } as any;

        await expect(loader.load()).resolves.toBeUndefined();
        expect(mockDocument.createElement).not.toHaveBeenCalled();
      });

      it("should throw error if relayerSDK exists but is invalid", () => {
        const loader = new RelayerSDKLoader({});
        global.window = {
          relayerSDK: { invalid: true },
          document: mockDocument,
        } as any;

        expect(() => loader.load()).toThrow(
          "RelayerSDKLoader: Unable to load FHEVM Relayer SDK"
        );
      });

      it("should resolve if script already exists in DOM and window has valid relayerSDK", async () => {
        const loader = new RelayerSDKLoader({});

        // Window does NOT have relayerSDK property initially (so it will check for script in DOM)
        const win = {
          document: mockDocument,
          // relayerSDK already loaded by existing script
          relayerSDK: {
            initSDK: vi.fn(),
            createInstance: vi.fn(),
            SepoliaConfig: {},
          },
        } as any;
        global.window = win;

        // Mock querySelector to return existing script
        const mockScript = { src: SDK_CDN_URL };
        mockDocument.querySelector.mockReturnValue(mockScript);

        // Since relayerSDK exists in window, load() will return early without checking for script
        await expect(loader.load()).resolves.toBeUndefined();
        // querySelector should NOT be called because window already has valid relayerSDK
        expect(mockDocument.querySelector).not.toHaveBeenCalled();
        expect(mockDocument.createElement).not.toHaveBeenCalled();
      });

      it("should reject if script exists in DOM but window.relayerSDK is invalid", async () => {
        const loader = new RelayerSDKLoader({});

        // Window does NOT have relayerSDK property initially
        const win = { document: mockDocument } as any;
        global.window = win;

        // Mock querySelector to return existing script
        const mockScript = { src: SDK_CDN_URL };
        mockDocument.querySelector.mockReturnValue(mockScript);

        // relayerSDK stays undefined/invalid
        await expect(loader.load()).rejects.toThrow(
          "RelayerSDKLoader: window object does not contain a valid relayerSDK object."
        );
        expect(mockDocument.querySelector).toHaveBeenCalledWith(
          `script[src="${SDK_CDN_URL}"]`
        );
      });

      it("should create and append script when no script exists", async () => {
        const loader = new RelayerSDKLoader({});
        mockDocument.querySelector.mockReturnValue(null);

        const mockScript = {
          src: "",
          type: "",
          async: false,
          onload: null as any,
          onerror: null as any,
        };
        mockDocument.createElement.mockReturnValue(mockScript);

        const loadPromise = loader.load();

        // Simulate successful script load
        global.window = {
          relayerSDK: {
            initSDK: vi.fn(),
            createInstance: vi.fn(),
            SepoliaConfig: {},
          },
          document: mockDocument,
        } as any;

        // Trigger onload
        if (mockScript.onload) {
          mockScript.onload({} as Event);
        }

        await expect(loadPromise).resolves.toBeUndefined();
        expect(mockDocument.createElement).toHaveBeenCalledWith("script");
        expect(mockScript.src).toBe(SDK_CDN_URL);
        expect(mockScript.type).toBe("text/javascript");
        expect(mockScript.async).toBe(true);
        expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockScript);
      });

      it("should reject when script loads but window.relayerSDK is invalid", async () => {
        const loader = new RelayerSDKLoader({});
        mockDocument.querySelector.mockReturnValue(null);

        const mockScript = {
          src: "",
          type: "",
          async: false,
          onload: null as any,
          onerror: null as any,
        };
        mockDocument.createElement.mockReturnValue(mockScript);

        const loadPromise = loader.load();

        // Window relayerSDK is invalid
        global.window = {
          relayerSDK: undefined,
          document: mockDocument,
        } as any;

        // Trigger onload
        if (mockScript.onload) {
          mockScript.onload({} as Event);
        }

        await expect(loadPromise).rejects.toThrow(
          `RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${SDK_CDN_URL}, however, the window.relayerSDK object is invalid.`
        );
      });

      it("should reject when script fails to load", async () => {
        const loader = new RelayerSDKLoader({});
        mockDocument.querySelector.mockReturnValue(null);

        const mockScript = {
          src: "",
          type: "",
          async: false,
          onload: null as any,
          onerror: null as any,
        };
        mockDocument.createElement.mockReturnValue(mockScript);

        const loadPromise = loader.load();

        // Trigger onerror
        if (mockScript.onerror) {
          mockScript.onerror({} as Event);
        }

        await expect(loadPromise).rejects.toThrow(
          `RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`
        );
      });
    });
  });

  describe("isFhevmWindowType", () => {
    it("should return false for undefined window", () => {
      expect(isFhevmWindowType(undefined)).toBe(false);
    });

    it("should return false for null window", () => {
      expect(isFhevmWindowType(null)).toBe(false);
    });

    it("should return false for non-object window", () => {
      expect(isFhevmWindowType("string")).toBe(false);
      expect(isFhevmWindowType(123)).toBe(false);
      expect(isFhevmWindowType(true)).toBe(false);
    });

    it("should return false when relayerSDK is missing", () => {
      const mockWindow = {};
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK is undefined", () => {
      const mockWindow = { relayerSDK: undefined };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK is null", () => {
      const mockWindow = { relayerSDK: null };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK is not an object", () => {
      const mockWindow = { relayerSDK: "invalid" };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK.initSDK is missing", () => {
      const mockWindow = {
        relayerSDK: {
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK.createInstance is missing", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when relayerSDK.SepoliaConfig is missing", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return true when all required properties exist", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should return true when __initialized__ is true", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          __initialized__: true,
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should return true when __initialized__ is false", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          __initialized__: false,
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should return false when __initialized__ is invalid", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          __initialized__: "invalid",
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should call trace function when provided", () => {
      const trace = vi.fn();
      const mockWindow = {};

      isFhevmWindowType(mockWindow, trace);

      expect(trace).toHaveBeenCalled();
    });

    it("should return false when initSDK is not a function", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: "not-a-function",
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when createInstance is not a function", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: "not-a-function",
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should return false when SepoliaConfig is not an object", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: "not-an-object",
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should handle empty SepoliaConfig object", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle SepoliaConfig with additional properties", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {
            aclContractAddress: "0x123",
            gatewayChainId: 123,
            relayerUrl: "https://relayer.example.com",
          },
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should work with complete valid window object", () => {
      const completeWindow = {
        relayerSDK: {
          initSDK: async () => true,
          createInstance: async (config: any) => ({}),
          SepoliaConfig: {
            aclContractAddress: "0x1234567890123456789012345678901234567890",
            gatewayChainId: 11155111,
            relayerUrl: "https://relayer.testnet.zama.cloud",
          },
          __initialized__: false,
        },
      };

      expect(isFhevmWindowType(completeWindow)).toBe(true);
    });

    it("should validate initSDK is a function type", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: null,
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should validate createInstance is a function type", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: null,
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should validate SepoliaConfig is an object type", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: null,
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should handle array as relayerSDK (not valid object)", () => {
      const mockWindow = {
        relayerSDK: [],
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should handle nested object structures", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {
            nested: {
              property: "value",
            },
          },
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle functions with properties attached", () => {
      const initSDK = vi.fn();
      (initSDK as any).extraProp = "test";

      const mockWindow = {
        relayerSDK: {
          initSDK,
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should validate __initialized__ must be boolean if present", () => {
      const mockWindow1 = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          __initialized__: 1,
        },
      };
      expect(isFhevmWindowType(mockWindow1)).toBe(false);

      const mockWindow2 = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          __initialized__: null,
        },
      };
      expect(isFhevmWindowType(mockWindow2)).toBe(false);
    });
  });

  describe("trace callback functionality", () => {
    it("should call trace for window validation - undefined", () => {
      const trace = vi.fn();

      isFhevmWindowType(undefined, trace);

      expect(trace).toHaveBeenCalledWith(
        "RelayerSDKLoader: window object is undefined"
      );
    });

    it("should call trace for window validation - null", () => {
      const trace = vi.fn();

      isFhevmWindowType(null, trace);

      expect(trace).toHaveBeenCalledWith(
        "RelayerSDKLoader: window object is null"
      );
    });

    it("should call trace for window validation - not an object", () => {
      const trace = vi.fn();

      isFhevmWindowType("not-an-object", trace);

      expect(trace).toHaveBeenCalledWith(
        "RelayerSDKLoader: window is not an object"
      );
    });

    it("should call trace when window does not contain relayerSDK", () => {
      const trace = vi.fn();

      isFhevmWindowType({}, trace);

      expect(trace).toHaveBeenCalledWith(
        "RelayerSDKLoader: window does not contain 'relayerSDK' property"
      );
    });

    it("should not call trace when relayerSDK is valid", () => {
      const trace = vi.fn();
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };

      isFhevmWindowType(mockWindow, trace);

      expect(trace).not.toHaveBeenCalled();
    });

    it("should work without trace parameter", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };

      // Should not throw when trace is undefined
      expect(() => isFhevmWindowType(mockWindow)).not.toThrow();
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle trace in RelayerSDKLoader.isLoaded()", () => {
      const trace = vi.fn();
      const loader = new RelayerSDKLoader({ trace });
      const mockWindow = {} as any;
      global.window = mockWindow;

      loader.isLoaded();

      expect(trace).toHaveBeenCalled();
    });
  });

  describe("objHasProperty edge cases (tested through isFhevmWindowType)", () => {
    it("should handle properties with null values", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: null,
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should handle properties with undefined values", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: undefined,
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should validate exact type match for functions", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: "not-a-function",
          createInstance: vi.fn(),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should validate exact type match for objects", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: "not-an-object",
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(false);
    });

    it("should accept arrow functions as valid functions", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: () => {},
          createInstance: async () => ({}),
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should accept async functions as valid functions", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: async function () {},
          createInstance: async function () {},
          SepoliaConfig: {},
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle objects with prototype chains", () => {
      class CustomConfig {
        someProperty = "value";
      }

      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: new CustomConfig(),
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle frozen objects", () => {
      const frozenConfig = Object.freeze({
        aclContractAddress: "0x123",
      });

      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: frozenConfig,
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });

    it("should handle objects with getters", () => {
      const mockWindow = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          get SepoliaConfig() {
            return { computed: true };
          },
        },
      };
      expect(isFhevmWindowType(mockWindow)).toBe(true);
    });
  });

  describe("Integration tests", () => {
    it("should work with complete real-world window mock", () => {
      const realWorldWindow = {
        relayerSDK: {
          initSDK: async function (config: any) {
            return true;
          },
          createInstance: async function (config: any) {
            return {
              encrypt: () => {},
              decrypt: () => {},
            };
          },
          SepoliaConfig: {
            aclContractAddress: "0x1234567890123456789012345678901234567890",
            gatewayChainId: 11155111,
            relayerUrl: "https://relayer.testnet.zama.cloud",
          },
          __initialized__: false,
        },
      };

      expect(isFhevmWindowType(realWorldWindow)).toBe(true);
    });

    it("should handle window object with extra properties", () => {
      const windowWithExtras = {
        relayerSDK: {
          initSDK: vi.fn(),
          createInstance: vi.fn(),
          SepoliaConfig: {},
          extraProperty: "allowed",
          anotherExtra: 123,
        },
        someOtherGlobal: {},
      };

      expect(isFhevmWindowType(windowWithExtras)).toBe(true);
    });
  });
});
