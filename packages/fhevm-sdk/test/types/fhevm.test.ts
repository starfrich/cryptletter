import { describe, it, expect } from "vitest";
import type {
  FhevmInstance,
  FhevmInstanceConfig,
  HandleContractPair,
  DecryptedResults,
  CreateFhevmInstanceParams,
  FhevmRelayerStatus,
  FhevmInitSDKOptions,
  FhevmRelayerSDKType,
  FhevmWindowType,
  FhevmInstanceConfigPublicKey,
  FhevmInstanceConfigPublicParams,
  FhevmStoredPublicKey,
  FhevmStoredPublicParams,
  EIP712Type,
  FhevmDecryptionSignatureType,
  FhevmType,
  FhevmCreateInstanceType,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  IsFhevmSupportedType,
} from "../../src/types/fhevm";

describe("types/fhevm", () => {
  describe("FhevmRelayerStatus", () => {
    it("accepts all valid status values", () => {
      const statuses: FhevmRelayerStatus[] = [
        "sdk-loading",
        "sdk-loaded",
        "sdk-initializing",
        "sdk-initialized",
        "creating",
      ];

      statuses.forEach((status) => {
        const testStatus: FhevmRelayerStatus = status;
        expect(testStatus).toBe(status);
      });
    });

    it("can be used in status tracking", () => {
      let currentStatus: FhevmRelayerStatus = "sdk-loading";
      expect(currentStatus).toBe("sdk-loading");

      currentStatus = "sdk-loaded";
      expect(currentStatus).toBe("sdk-loaded");

      currentStatus = "sdk-initializing";
      expect(currentStatus).toBe("sdk-initializing");

      currentStatus = "sdk-initialized";
      expect(currentStatus).toBe("sdk-initialized");

      currentStatus = "creating";
      expect(currentStatus).toBe("creating");
    });
  });

  describe("FhevmType", () => {
    it("accepts all valid FHEVM encrypted types", () => {
      const types: FhevmType[] = [
        "ebool",
        "euint4",
        "euint8",
        "euint16",
        "euint32",
        "euint64",
        "euint128",
        "euint256",
        "eaddress",
        "ebytes64",
        "ebytes128",
        "ebytes256",
      ];

      types.forEach((type) => {
        const testType: FhevmType = type;
        expect(testType).toBe(type);
      });
    });

    it("can be used for type validation", () => {
      const validType: FhevmType = "euint32";
      expect(validType).toBe("euint32");

      const boolType: FhevmType = "ebool";
      expect(boolType).toBe("ebool");

      const addressType: FhevmType = "eaddress";
      expect(addressType).toBe("eaddress");

      const bytesType: FhevmType = "ebytes256";
      expect(bytesType).toBe("ebytes256");
    });
  });

  describe("CreateFhevmInstanceParams", () => {
    it("accepts valid configuration with EIP-1193 provider", () => {
      const mockProvider = {
        request: async () => ({}),
      };

      const params: CreateFhevmInstanceParams = {
        provider: mockProvider as any,
        signal: new AbortController().signal,
      };

      expect(params.provider).toBe(mockProvider);
      expect(params.signal).toBeInstanceOf(AbortSignal);
      expect(params.mockChains).toBeUndefined();
      expect(params.onStatusChange).toBeUndefined();
    });

    it("accepts valid configuration with RPC URL string", () => {
      const params: CreateFhevmInstanceParams = {
        provider: "https://sepolia-us.starfrich.me",
        signal: new AbortController().signal,
      };

      expect(params.provider).toBe("https://sepolia-us.starfrich.me");
      expect(params.signal).toBeInstanceOf(AbortSignal);
    });

    it("accepts configuration with mock chains", () => {
      const params: CreateFhevmInstanceParams = {
        provider: "http://localhost:8545",
        mockChains: {
          31337: "local",
          1337: "test",
        },
        signal: new AbortController().signal,
      };

      expect(params.mockChains).toEqual({
        31337: "local",
        1337: "test",
      });
    });

    it("accepts configuration with status change callback", () => {
      const statusChanges: FhevmRelayerStatus[] = [];
      const onStatusChange = (status: FhevmRelayerStatus) => {
        statusChanges.push(status);
      };

      const params: CreateFhevmInstanceParams = {
        provider: "http://localhost:8545",
        signal: new AbortController().signal,
        onStatusChange,
      };

      expect(params.onStatusChange).toBe(onStatusChange);

      // Test callback execution
      params.onStatusChange!("sdk-loading");
      params.onStatusChange!("sdk-loaded");

      expect(statusChanges).toEqual(["sdk-loading", "sdk-loaded"]);
    });
  });

  describe("FhevmInitSDKOptions", () => {
    it("accepts empty options", () => {
      const options: FhevmInitSDKOptions = {};
      expect(options).toEqual({});
    });

    it("accepts options with tfheParams", () => {
      const options: FhevmInitSDKOptions = {
        tfheParams: { level: 2048 },
      };

      expect(options.tfheParams).toEqual({ level: 2048 });
    });

    it("accepts options with kmsParams", () => {
      const options: FhevmInitSDKOptions = {
        kmsParams: { endpoint: "https://kms.example.com" },
      };

      expect(options.kmsParams).toEqual({ endpoint: "https://kms.example.com" });
    });

    it("accepts options with thread count", () => {
      const options: FhevmInitSDKOptions = {
        thread: 4,
      };

      expect(options.thread).toBe(4);
    });

    it("accepts all options together", () => {
      const options: FhevmInitSDKOptions = {
        tfheParams: { level: 2048 },
        kmsParams: { endpoint: "https://kms.example.com" },
        thread: 8,
      };

      expect(options.tfheParams).toEqual({ level: 2048 });
      expect(options.kmsParams).toEqual({ endpoint: "https://kms.example.com" });
      expect(options.thread).toBe(8);
    });
  });

  describe("FhevmRelayerSDKType", () => {
    it("has correct structure for RelayerSDK interface", () => {
      const mockSDK: FhevmRelayerSDKType = {
        initSDK: async () => true,
        createInstance: async () => ({} as any),
        SepoliaConfig: {} as any,
      };

      expect(mockSDK.initSDK).toBeDefined();
      expect(mockSDK.createInstance).toBeDefined();
      expect(mockSDK.SepoliaConfig).toBeDefined();
      expect(mockSDK.__initialized__).toBeUndefined();
    });

    it("can track initialization state", () => {
      const mockSDK: FhevmRelayerSDKType = {
        initSDK: async () => {
          mockSDK.__initialized__ = true;
          return true;
        },
        createInstance: async () => ({} as any),
        SepoliaConfig: {} as any,
      };

      expect(mockSDK.__initialized__).toBeUndefined();

      mockSDK.initSDK();

      expect(mockSDK.__initialized__).toBe(true);
    });
  });

  describe("FhevmWindowType", () => {
    it("extends window with relayerSDK", () => {
      const mockWindow: FhevmWindowType = {
        relayerSDK: {
          initSDK: async () => true,
          createInstance: async () => ({} as any),
          SepoliaConfig: {} as any,
        },
      };

      expect(mockWindow.relayerSDK).toBeDefined();
      expect(mockWindow.relayerSDK.initSDK).toBeDefined();
    });
  });

  describe("FhevmInstanceConfigPublicKey", () => {
    it("accepts public key configuration with data", () => {
      const publicKey: FhevmInstanceConfigPublicKey = {
        data: new Uint8Array([1, 2, 3, 4, 5]),
        id: "test-public-key-id",
      };

      expect(publicKey.data).toBeInstanceOf(Uint8Array);
      expect(publicKey.data).toHaveLength(5);
      expect(publicKey.id).toBe("test-public-key-id");
    });

    it("accepts public key configuration with null data", () => {
      const publicKey: FhevmInstanceConfigPublicKey = {
        data: null,
        id: null,
      };

      expect(publicKey.data).toBeNull();
      expect(publicKey.id).toBeNull();
    });

    it("can represent uninitialized state", () => {
      const publicKey: FhevmInstanceConfigPublicKey = {
        data: null,
        id: null,
      };

      const isInitialized = publicKey.data !== null && publicKey.id !== null;
      expect(isInitialized).toBe(false);
    });
  });

  describe("FhevmInstanceConfigPublicParams", () => {
    it("accepts public params configuration", () => {
      const publicParams: FhevmInstanceConfigPublicParams = {
        "2048": {
          publicParamsId: "params-id-2048",
          publicParams: new Uint8Array([10, 20, 30, 40]),
        },
      };

      expect(publicParams["2048"].publicParamsId).toBe("params-id-2048");
      expect(publicParams["2048"].publicParams).toBeInstanceOf(Uint8Array);
      expect(publicParams["2048"].publicParams).toHaveLength(4);
    });

    it("stores 2048-bit security level parameters", () => {
      const paramsData = new Uint8Array(256); // Simulated params
      for (let i = 0; i < 256; i++) {
        paramsData[i] = i % 256;
      }

      const publicParams: FhevmInstanceConfigPublicParams = {
        "2048": {
          publicParamsId: "zama-params-2048-v1",
          publicParams: paramsData,
        },
      };

      expect(publicParams["2048"].publicParams).toHaveLength(256);
      expect(publicParams["2048"].publicParamsId).toBe("zama-params-2048-v1");
    });
  });

  describe("FhevmStoredPublicKey", () => {
    it("represents stored public key structure", () => {
      const storedKey: FhevmStoredPublicKey = {
        publicKeyId: "stored-key-id",
        publicKey: new Uint8Array([5, 10, 15, 20, 25]),
      };

      expect(storedKey.publicKeyId).toBe("stored-key-id");
      expect(storedKey.publicKey).toBeInstanceOf(Uint8Array);
      expect(storedKey.publicKey).toHaveLength(5);
    });

    it("can be serialized for storage", () => {
      const storedKey: FhevmStoredPublicKey = {
        publicKeyId: "key-123",
        publicKey: new Uint8Array([1, 2, 3]),
      };

      // Simulate JSON serialization (would need custom serialization for Uint8Array)
      const serializable = {
        publicKeyId: storedKey.publicKeyId,
        publicKey: Array.from(storedKey.publicKey),
      };

      expect(serializable.publicKeyId).toBe("key-123");
      expect(serializable.publicKey).toEqual([1, 2, 3]);
    });
  });

  describe("FhevmStoredPublicParams", () => {
    it("represents stored public params structure", () => {
      const storedParams: FhevmStoredPublicParams = {
        publicParamsId: "params-456",
        publicParams: new Uint8Array([100, 101, 102]),
      };

      expect(storedParams.publicParamsId).toBe("params-456");
      expect(storedParams.publicParams).toBeInstanceOf(Uint8Array);
      expect(storedParams.publicParams).toHaveLength(3);
    });
  });

  describe("EIP712Type", () => {
    it("represents complete EIP-712 typed data structure", () => {
      const eip712: EIP712Type = {
        domain: {
          chainId: 11155111,
          name: "FHEVM",
          verifyingContract: "0xA25a9Cbae6a9ea52F25259c1D850C30a9FbA4A3A",
          version: "1",
        },
        message: {
          publicKey: "0x1234",
          contracts: ["0xabcd"],
        },
        primaryType: "Reencrypt",
        types: {
          Reencrypt: [
            { name: "publicKey", type: "bytes32" },
            { name: "contracts", type: "address[]" },
          ],
        },
      };

      expect(eip712.domain.chainId).toBe(11155111);
      expect(eip712.domain.name).toBe("FHEVM");
      expect(eip712.primaryType).toBe("Reencrypt");
      expect(eip712.types.Reencrypt).toHaveLength(2);
      expect(eip712.message.publicKey).toBe("0x1234");
    });

    it("can be used for decryption authorization", () => {
      const eip712: EIP712Type = {
        domain: {
          chainId: 1,
          name: "DecryptionGateway",
          verifyingContract: "0x1234567890123456789012345678901234567890",
          version: "1.0",
        },
        message: {
          userAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          timestamp: 1234567890,
        },
        primaryType: "DecryptRequest",
        types: {
          DecryptRequest: [
            { name: "userAddress", type: "address" },
            { name: "timestamp", type: "uint256" },
          ],
        },
      };

      expect(eip712.domain.verifyingContract).toBe("0x1234567890123456789012345678901234567890");
      expect(eip712.message.userAddress).toBe("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
      expect(eip712.primaryType).toBe("DecryptRequest");
    });
  });

  describe("FhevmDecryptionSignatureType", () => {
    it("represents complete decryption signature data", () => {
      const signature: FhevmDecryptionSignatureType = {
        publicKey: "0xpubkey1234",
        privateKey: "0xprivkey5678",
        signature: "0xsignature9abc",
        startTimestamp: 1700000000,
        durationDays: 30,
        userAddress: "0x1234567890123456789012345678901234567890",
        contractAddresses: [
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          "0x1111111111111111111111111111111111111111",
        ],
        eip712: {
          domain: {
            chainId: 1,
            name: "FHEVM",
            verifyingContract: "0x2222222222222222222222222222222222222222",
            version: "1",
          },
          message: {},
          primaryType: "Reencrypt",
          types: {},
        },
      };

      expect(signature.publicKey).toBe("0xpubkey1234");
      expect(signature.privateKey).toBe("0xprivkey5678");
      expect(signature.signature).toBe("0xsignature9abc");
      expect(signature.startTimestamp).toBe(1700000000);
      expect(signature.durationDays).toBe(30);
      expect(signature.userAddress).toBe("0x1234567890123456789012345678901234567890");
      expect(signature.contractAddresses).toHaveLength(2);
      expect(signature.eip712.domain.chainId).toBe(1);
    });

    it("can be used to check signature validity", () => {
      const now = Math.floor(Date.now() / 1000);
      const signature: FhevmDecryptionSignatureType = {
        publicKey: "0xkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        startTimestamp: now - 86400, // 1 day ago
        durationDays: 7,
        userAddress: "0x1234567890123456789012345678901234567890",
        contractAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
        eip712: {} as EIP712Type,
      };

      const expiryTimestamp = signature.startTimestamp + signature.durationDays * 86400;
      const isValid = now >= signature.startTimestamp && now < expiryTimestamp;

      expect(isValid).toBe(true);
    });

    it("supports multiple contract addresses for authorization", () => {
      const signature: FhevmDecryptionSignatureType = {
        publicKey: "0xkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        startTimestamp: 1700000000,
        durationDays: 30,
        userAddress: "0x1234567890123456789012345678901234567890",
        contractAddresses: [
          "0xcontract1111111111111111111111111111111111",
          "0xcontract2222222222222222222222222222222222",
          "0xcontract3333333333333333333333333333333333",
        ],
        eip712: {} as EIP712Type,
      };

      expect(signature.contractAddresses).toHaveLength(3);

      const isAuthorized = (contract: string) =>
        signature.contractAddresses.includes(contract as `0x${string}`);

      expect(isAuthorized("0xcontract1111111111111111111111111111111111")).toBe(true);
      expect(isAuthorized("0xcontract2222222222222222222222222222222222")).toBe(true);
      expect(isAuthorized("0xcontract9999999999999999999999999999999999")).toBe(false);
    });
  });

  describe("HandleContractPair", () => {
    it("type alias works for decryption handle pairs", () => {
      // This is a type re-export test - just verify it can be used
      const pair = {
        handle: "0xhandle",
        contractAddress: "0xcontract",
      };

      // TypeScript will validate this at compile time
      const typedPair: HandleContractPair = pair as any;
      expect(typedPair).toBeDefined();
    });
  });

  describe("Legacy Type Aliases", () => {
    it("FhevmCreateInstanceType is callable", () => {
      const createInstance: FhevmCreateInstanceType = async () => {
        return {} as any;
      };

      expect(typeof createInstance).toBe("function");
    });

    it("FhevmInitSDKType is callable with options", () => {
      const initSDK: FhevmInitSDKType = async (options) => {
        expect(options).toBeDefined();
        return true;
      };

      expect(typeof initSDK).toBe("function");
      initSDK({ thread: 4 });
    });

    it("FhevmLoadSDKType is callable", () => {
      const loadSDK: FhevmLoadSDKType = async () => {
        // Mock SDK load
      };

      expect(typeof loadSDK).toBe("function");
    });

    it("IsFhevmSupportedType checks chain support", () => {
      const isSupported: IsFhevmSupportedType = (chainId) => {
        return chainId === 11155111 || chainId === 8009;
      };

      expect(isSupported(11155111)).toBe(true);
      expect(isSupported(8009)).toBe(true);
      expect(isSupported(1)).toBe(false);
    });
  });

  describe("Type Integration", () => {
    it("combines public key and params types for instance config", () => {
      const publicKey: FhevmInstanceConfigPublicKey = {
        data: new Uint8Array([1, 2, 3]),
        id: "key-id",
      };

      const publicParams: FhevmInstanceConfigPublicParams = {
        "2048": {
          publicParamsId: "params-id",
          publicParams: new Uint8Array([4, 5, 6]),
        },
      };

      expect(publicKey.data).toBeDefined();
      expect(publicParams["2048"].publicParams).toBeDefined();
    });

    it("decryption signature includes all necessary data for authorization", () => {
      const signature: FhevmDecryptionSignatureType = {
        publicKey: "0xpub",
        privateKey: "0xpriv",
        signature: "0xsig",
        startTimestamp: 1700000000,
        durationDays: 30,
        userAddress: "0x1234567890123456789012345678901234567890",
        contractAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
        eip712: {
          domain: {
            chainId: 1,
            name: "Test",
            verifyingContract: "0x1111111111111111111111111111111111111111",
            version: "1",
          },
          message: {},
          primaryType: "Test",
          types: {},
        },
      };

      // All fields are required for complete decryption authorization
      expect(signature.publicKey).toBeDefined();
      expect(signature.privateKey).toBeDefined();
      expect(signature.signature).toBeDefined();
      expect(signature.startTimestamp).toBeDefined();
      expect(signature.durationDays).toBeDefined();
      expect(signature.userAddress).toBeDefined();
      expect(signature.contractAddresses).toBeDefined();
      expect(signature.eip712).toBeDefined();
    });
  });
});
