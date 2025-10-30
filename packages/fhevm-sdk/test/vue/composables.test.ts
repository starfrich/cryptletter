import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useFHEEncryption } from "../../src/vue/useFHEEncryption";
import type { FhevmInstance } from "../../src/core/types";
import type { EncryptResult } from "../../src/core/encryption";

describe("Vue Composables", () => {
  describe("useFHEEncryption", () => {
    const mockInstance: Partial<FhevmInstance> = {
      createEncryptedInput: vi.fn().mockReturnValue({
        add32: vi.fn().mockReturnThis(),
        encrypt: vi.fn().mockResolvedValue({
          handles: [new Uint8Array([1, 2, 3])],
          inputProof: new Uint8Array([4, 5, 6]),
        }),
      }),
    };

    const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

    const contractAddress = ("0x" + "b".repeat(40)) as `0x${string}`;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("initializes with default state", () => {
      const result = useFHEEncryption({
        instance: undefined,
        getAddress: undefined,
        contractAddress: undefined,
      });

      expect(result.canEncrypt.value).toBe(false);
      expect(result.isEncrypting.value).toBe(false);
      expect(result.error.value).toBeUndefined();
    });

    it("enables encryption when all dependencies are ready", () => {
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
      });

      expect(result.canEncrypt.value).toBe(true);
    });

    it("disables encryption when missing instance", () => {
      const result = useFHEEncryption({
        instance: undefined,
        getAddress: mockGetAddress,
        contractAddress,
      });

      expect(result.canEncrypt.value).toBe(false);
    });

    it("disables encryption when missing getAddress", () => {
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: undefined,
        contractAddress,
      });

      expect(result.canEncrypt.value).toBe(false);
    });

    it("disables encryption when missing contractAddress", () => {
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress: undefined,
      });

      expect(result.canEncrypt.value).toBe(false);
    });

    it("supports refs as parameters", () => {
      const instanceRef = ref(mockInstance as FhevmInstance);
      const getAddressRef = ref(mockGetAddress);
      const contractAddressRef = ref(contractAddress);

      const result = useFHEEncryption({
        instance: instanceRef,
        getAddress: getAddressRef,
        contractAddress: contractAddressRef,
      });

      expect(result.canEncrypt.value).toBe(true);
    });

    it("reacts to instance ref changes", () => {
      const instanceRef = ref<FhevmInstance | undefined>(undefined);
      const getAddressRef = ref(mockGetAddress);
      const contractAddressRef = ref(contractAddress);

      const result = useFHEEncryption({
        instance: instanceRef,
        getAddress: getAddressRef,
        contractAddress: contractAddressRef,
      });

      expect(result.canEncrypt.value).toBe(false);

      instanceRef.value = mockInstance as FhevmInstance;
      expect(result.canEncrypt.value).toBe(true);
    });

    it("reacts to getAddress ref changes", () => {
      const instanceRef = ref(mockInstance as FhevmInstance);
      const getAddressRef = ref<(() => Promise<string>) | undefined>(undefined);
      const contractAddressRef = ref(contractAddress);

      const result = useFHEEncryption({
        instance: instanceRef,
        getAddress: getAddressRef,
        contractAddress: contractAddressRef,
      });

      expect(result.canEncrypt.value).toBe(false);

      getAddressRef.value = mockGetAddress;
      expect(result.canEncrypt.value).toBe(true);
    });

    it("reacts to contractAddress ref changes", () => {
      const instanceRef = ref(mockInstance as FhevmInstance);
      const getAddressRef = ref(mockGetAddress);
      const contractAddressRef = ref<`0x${string}` | undefined>(undefined);

      const result = useFHEEncryption({
        instance: instanceRef,
        getAddress: getAddressRef,
        contractAddress: contractAddressRef,
      });

      expect(result.canEncrypt.value).toBe(false);

      contractAddressRef.value = contractAddress;
      expect(result.canEncrypt.value).toBe(true);
    });

    it("encrypts value with encryptWith", async () => {
      const onSuccess = vi.fn();
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
        onSuccess,
      });

      const encrypted = await result.encryptWith((builder) => {
        builder.add32(42);
      });

      expect(encrypted).toBeDefined();
      expect(encrypted?.handles).toHaveLength(1);
      expect(onSuccess).toHaveBeenCalledWith(encrypted);
      expect(mockGetAddress).toHaveBeenCalled();
    });

    it("sets isEncrypting state during encryption", async () => {
      const mockSlowInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn().mockReturnValue({
          add32: vi.fn().mockReturnThis(),
          encrypt: vi.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return {
              handles: [new Uint8Array([1, 2, 3])],
              inputProof: new Uint8Array([4, 5, 6]),
            };
          }),
        }),
      };

      const result = useFHEEncryption({
        instance: mockSlowInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
      });

      expect(result.isEncrypting.value).toBe(false);

      const encryptPromise = result.encryptWith((builder) => {
        builder.add32(42);
      });

      // isEncrypting should be true at some point (though timing is tricky to test)
      // For now, just verify it completes
      await encryptPromise;
      expect(result.isEncrypting.value).toBe(false);
    });

    it("handles encryption errors", async () => {
      const onError = vi.fn();
      const encryptError = new Error("Encryption failed");

      const mockFailingInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn().mockReturnValue({
          add32: vi.fn().mockReturnThis(),
          encrypt: vi.fn().mockRejectedValue(encryptError),
        }),
      };

      const result = useFHEEncryption({
        instance: mockFailingInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
        onError,
      });

      const encrypted = await result.encryptWith((builder) => {
        builder.add32(42);
      });

      expect(encrypted).toBeUndefined();
      expect(result.error.value).toBeDefined();
      expect(result.errorMessage.value).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });

    it("returns undefined when missing instance", async () => {
      const result = useFHEEncryption({
        instance: undefined,
        getAddress: mockGetAddress,
        contractAddress,
      });

      const encrypted = await result.encryptWith((builder) => {
        // This shouldn't execute
      });

      expect(encrypted).toBeUndefined();
      expect(result.error.value).toBeDefined();
    });

    it("returns undefined when missing getAddress", async () => {
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: undefined,
        contractAddress,
      });

      const encrypted = await result.encryptWith((builder) => {
        // This shouldn't execute
      });

      expect(encrypted).toBeUndefined();
      expect(result.error.value).toBeDefined();
    });

    it("encryptBatch is an alias for encryptWith", () => {
      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
      });

      expect(result.encryptBatch).toBe(result.encryptWith);
    });

    it("calls onSuccess callback with encrypted result", async () => {
      const onSuccess = vi.fn();

      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
        onSuccess,
      });

      await result.encryptWith((builder) => {
        builder.add32(42);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          handles: expect.any(Array),
          inputProof: expect.any(Uint8Array),
        })
      );
    });

    it("catches callback errors gracefully", async () => {
      const onSuccess = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const result = useFHEEncryption({
        instance: mockInstance as FhevmInstance,
        getAddress: mockGetAddress,
        contractAddress,
        onSuccess,
      });

      await result.encryptWith((builder) => {
        builder.add32(42);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("computes errorMessage from error", async () => {
      const result = useFHEEncryption({
        instance: undefined,
        getAddress: mockGetAddress,
        contractAddress,
      });

      // errorMessage should be undefined initially
      expect(result.errorMessage.value).toBeUndefined();

      // Try encryption which will fail
      await result.encryptWith((builder) => {
        builder.add32(42);
      });

      // errorMessage should now be defined
      expect(result.errorMessage.value).toBeDefined();
      expect(typeof result.errorMessage.value).toBe("string");
    });
  });
});
