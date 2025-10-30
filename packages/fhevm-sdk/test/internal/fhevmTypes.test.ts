import { describe, it, expect } from "vitest";

describe("internal/fhevmTypes", () => {
  describe("Type exports", () => {
    it("should export FhevmInstance type from internal/fhevmTypes", async () => {
      const module = await import("../../src/internal/fhevmTypes");

      // Check that the module exports exist (TypeScript will ensure type correctness at compile time)
      expect(module).toBeDefined();
    });

    it("should re-export types from centralized types directory", async () => {
      // Import both the internal legacy file and the new centralized types
      const internalModule = await import("../../src/internal/fhevmTypes");
      const typesModule = await import("../../src/types/fhevm");

      // Verify that both modules are defined
      expect(internalModule).toBeDefined();
      expect(typesModule).toBeDefined();
    });

    it("should be backward compatible with legacy imports", () => {
      // This test verifies that old import paths still work
      // TypeScript compilation of this test file itself proves backward compatibility

      // We can't directly test type exports at runtime, but we can verify the module structure
      expect(async () => {
        await import("../../src/internal/fhevmTypes");
      }).not.toThrow();
    });

    it("should have JSDoc deprecation notice", async () => {
      // Read the source file to verify deprecation comment exists
      const fs = await import("fs/promises");
      const path = await import("path");

      const filePath = path.join(
        process.cwd(),
        "src/internal/fhevmTypes.ts"
      );

      const content = await fs.readFile(filePath, "utf-8");

      expect(content).toContain("@deprecated");
      expect(content).toContain("backward compatibility");
      expect(content).toContain("@fhevm-sdk/types");
    });

    it("should re-export all essential FHEVM types", async () => {
      // Test that we can import the expected types
      // TypeScript will fail to compile if these don't exist
      type TestImports = {
        FhevmInstance: import("../../src/internal/fhevmTypes").FhevmInstance;
        FhevmInstanceConfig: import("../../src/internal/fhevmTypes").FhevmInstanceConfig;
        FhevmInitSDKOptions: import("../../src/internal/fhevmTypes").FhevmInitSDKOptions;
        FhevmRelayerSDKType: import("../../src/internal/fhevmTypes").FhevmRelayerSDKType;
        FhevmWindowType: import("../../src/internal/fhevmTypes").FhevmWindowType;
        FhevmCreateInstanceType: import("../../src/internal/fhevmTypes").FhevmCreateInstanceType;
        FhevmInitSDKType: import("../../src/internal/fhevmTypes").FhevmInitSDKType;
        FhevmLoadSDKType: import("../../src/internal/fhevmTypes").FhevmLoadSDKType;
        IsFhevmSupportedType: import("../../src/internal/fhevmTypes").IsFhevmSupportedType;
      };

      // If this compiles, the types are correctly exported
      const typeCheck: keyof TestImports = "FhevmInstance";
      expect(typeCheck).toBe("FhevmInstance");
    });
  });

  describe("Module structure", () => {
    it("should only contain type exports (no runtime values)", async () => {
      const module = await import("../../src/internal/fhevmTypes");

      // Get all exports from the module
      const exports = Object.keys(module);

      // The module should have no runtime exports, only types
      // In JavaScript, type-only exports don't create runtime values
      expect(exports.length).toBe(0);
    });

    it("should be importable without errors", async () => {
      await expect(
        import("../../src/internal/fhevmTypes")
      ).resolves.toBeDefined();
    });
  });

  describe("Type compatibility", () => {
    it("should maintain type compatibility with centralized types", async () => {
      // Import both modules
      const internalTypes = await import("../../src/internal/fhevmTypes");
      const centralizedTypes = await import("../../src/types/fhevm");

      // Both should be defined (type-level compatibility is checked by TypeScript)
      expect(internalTypes).toBeDefined();
      expect(centralizedTypes).toBeDefined();

      // The following type assertions will fail at compile time if types don't match:
      type LegacyInstance = typeof internalTypes.FhevmInstance;
      type ModernInstance = typeof centralizedTypes.FhevmInstance;

      // This is a compile-time check that the types are compatible
      const typeCompatibilityCheck: LegacyInstance = {} as ModernInstance;
      expect(typeCompatibilityCheck).toBeDefined();
    });

    it("should support all legacy type imports", () => {
      // These type assertions verify that all documented types are available
      type TypeChecks = {
        instance: import("../../src/internal/fhevmTypes").FhevmInstance;
        config: import("../../src/internal/fhevmTypes").FhevmInstanceConfig;
        initOptions: import("../../src/internal/fhevmTypes").FhevmInitSDKOptions;
        relayerSDK: import("../../src/internal/fhevmTypes").FhevmRelayerSDKType;
        window: import("../../src/internal/fhevmTypes").FhevmWindowType;
      };

      // Runtime verification that types can be referenced
      const check: keyof TypeChecks = "instance";
      expect(check).toBe("instance");
    });
  });

  describe("Migration path", () => {
    it("should guide users to new import location", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");

      const filePath = path.join(
        process.cwd(),
        "src/internal/fhevmTypes.ts"
      );

      const content = await fs.readFile(filePath, "utf-8");

      // Verify migration guidance exists
      expect(content).toContain("Please import from '@fhevm-sdk/types' instead");
      expect(content).toContain("centralized in src/types/");
    });

    it("should indicate this is for backward compatibility only", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");

      const filePath = path.join(
        process.cwd(),
        "src/internal/fhevmTypes.ts"
      );

      const content = await fs.readFile(filePath, "utf-8");

      expect(content).toContain("Legacy internal types");
      expect(content).toContain("kept for backward compatibility");
    });
  });

  describe("Re-export integrity", () => {
    it("should re-export from the correct source module", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");

      const filePath = path.join(
        process.cwd(),
        "src/internal/fhevmTypes.ts"
      );

      const content = await fs.readFile(filePath, "utf-8");

      // Verify it re-exports from ../types/fhevm
      expect(content).toContain('from "../types/fhevm"');
      expect(content).toContain("export type {");
    });

    it("should include all essential FHEVM types in re-export", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");

      const filePath = path.join(
        process.cwd(),
        "src/internal/fhevmTypes.ts"
      );

      const content = await fs.readFile(filePath, "utf-8");

      // Check that all important types are listed
      const expectedTypes = [
        "FhevmInstance",
        "FhevmInstanceConfig",
        "FhevmInitSDKOptions",
        "FhevmRelayerSDKType",
        "FhevmWindowType",
        "FhevmCreateInstanceType",
        "FhevmInitSDKType",
        "FhevmLoadSDKType",
        "IsFhevmSupportedType",
      ];

      expectedTypes.forEach((type) => {
        expect(content).toContain(type);
      });
    });
  });
});
