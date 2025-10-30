import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";

// Mock the dependencies
vi.mock("ethers", () => ({
  JsonRpcProvider: vi.fn().mockImplementation(() => ({
    _network: { chainId: 31337 },
  })),
}));

vi.mock("@fhevm/mock-utils", () => ({
  MockFhevmInstance: {
    create: vi.fn().mockResolvedValue({
      encrypt_bool: vi.fn(),
      encrypt_uint8: vi.fn(),
      encrypt_uint16: vi.fn(),
      encrypt_uint32: vi.fn(),
      encrypt_uint64: vi.fn(),
      encrypt_uint128: vi.fn(),
      encrypt_uint256: vi.fn(),
    }),
  },
}));

describe("fhevmMock", () => {
  let fhevmMockCreateInstance: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic import to avoid bundling mock library
    const module = await import(
      "../../src/internal/mock/fhevmMock"
    );
    fhevmMockCreateInstance = module.fhevmMockCreateInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fhevmMockCreateInstance", () => {
    it("should create a mock FHEVM instance with provided parameters", async () => {
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const instance = await fhevmMockCreateInstance(params);

      expect(instance).toBeDefined();
      expect(instance).toHaveProperty("encrypt_bool");
      expect(instance).toHaveProperty("encrypt_uint8");
      expect(instance).toHaveProperty("encrypt_uint16");
      expect(instance).toHaveProperty("encrypt_uint32");
      expect(instance).toHaveProperty("encrypt_uint64");
    });

    it("should use provided ACL address", async () => {
      const customACL = "0x1234567890123456789012345678901234567890" as `0x${string}`;
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: customACL,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      // Check that create was called once
      expect(createSpy).toHaveBeenCalledTimes(1);

      // Verify ACL address in the config (3rd argument)
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        aclContractAddress: customACL,
      });

      createSpy.mockRestore();
    });

    it("should use provided Input Verifier address", async () => {
      const customInputVerifier = "0x9999999999999999999999999999999999999999" as `0x${string}`;
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: customInputVerifier,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        inputVerifierContractAddress: customInputVerifier,
      });

      createSpy.mockRestore();
    });

    it("should use provided KMS Verifier address", async () => {
      const customKMS = "0x8888888888888888888888888888888888888888" as `0x${string}`;
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: customKMS,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        kmsContractAddress: customKMS,
      });

      createSpy.mockRestore();
    });

    it("should use provided chain ID", async () => {
      const customChainId = 12345;
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: customChainId,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        chainId: customChainId,
      });

      createSpy.mockRestore();
    });

    it("should create instance with correct gateway chain ID", async () => {
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        gatewayChainId: 55815,
      });

      createSpy.mockRestore();
    });

    it("should create instance with fixed verifying contract addresses", async () => {
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const createSpy = vi.spyOn(MockFhevmInstance, "create");

      await fhevmMockCreateInstance(params);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        verifyingContractAddressDecryption:
          "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
        verifyingContractAddressInputVerification:
          "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
      });

      createSpy.mockRestore();
    });

    it("should create JsonRpcProvider with provided RPC URL", async () => {
      const customRpcUrl = "https://custom-rpc.example.com";
      const params = {
        rpcUrl: customRpcUrl,
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const instance = await fhevmMockCreateInstance(params);

      expect(instance).toBeDefined();
    });

    it("should handle errors when creating mock instance fails", async () => {
      // Make the mock throw an error for this test
      const mockError = new Error("Failed to create instance");
      vi.mocked(MockFhevmInstance.create).mockRejectedValueOnce(mockError);

      const params = {
        rpcUrl: "invalid-url",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      await expect(fhevmMockCreateInstance(params)).rejects.toThrow("Failed to create instance");
    });

    it("should return an instance with encryption methods", async () => {
      const params = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        metadata: {
          ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D" as `0x${string}`,
          InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030" as `0x${string}`,
          KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC" as `0x${string}`,
        },
      };

      const instance = await fhevmMockCreateInstance(params);

      // Check that instance has standard FHEVM methods
      expect(typeof instance.encrypt_bool).toBe("function");
      expect(typeof instance.encrypt_uint8).toBe("function");
      expect(typeof instance.encrypt_uint16).toBe("function");
      expect(typeof instance.encrypt_uint32).toBe("function");
      expect(typeof instance.encrypt_uint64).toBe("function");
    });
  });
});
