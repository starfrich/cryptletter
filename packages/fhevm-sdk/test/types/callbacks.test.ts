import { describe, it, expect, vi } from "vitest";
import {
  createEthersCallbacks,
  createViemCallbacks,
  createMetaMaskCallbacks,
  type WalletCallbacks,
  type SignTypedDataCallback,
  type GetAddressCallback,
  type SendTransactionCallback,
  type EIP712Domain,
  type EIP712Types,
  type EIP712Message,
  type EIP712TypeProperty,
  type TransactionRequest,
} from "../../src/types/callbacks";

describe("types/callbacks", () => {
  describe("Type Definitions", () => {
    it("allows valid EIP712Domain structure", () => {
      const domain: EIP712Domain = {
        name: "TestContract",
        version: "1",
        chainId: 1,
        verifyingContract: "0x1234567890123456789012345678901234567890",
        salt: "0x1234",
      };

      expect(domain.name).toBe("TestContract");
      expect(domain.version).toBe("1");
      expect(domain.chainId).toBe(1);
      expect(domain.verifyingContract).toBe("0x1234567890123456789012345678901234567890");
      expect(domain.salt).toBe("0x1234");
    });

    it("allows partial EIP712Domain structure", () => {
      const domain: EIP712Domain = {
        name: "TestContract",
        chainId: 1,
      };

      expect(domain.name).toBe("TestContract");
      expect(domain.chainId).toBe(1);
      expect(domain.version).toBeUndefined();
      expect(domain.verifyingContract).toBeUndefined();
      expect(domain.salt).toBeUndefined();
    });

    it("allows valid EIP712TypeProperty structure", () => {
      const typeProperty: EIP712TypeProperty = {
        name: "value",
        type: "uint256",
      };

      expect(typeProperty.name).toBe("value");
      expect(typeProperty.type).toBe("uint256");
    });

    it("allows valid EIP712Types structure", () => {
      const types: EIP712Types = {
        TestType: [
          { name: "value", type: "uint256" },
          { name: "recipient", type: "address" },
        ],
      };

      expect(types.TestType).toHaveLength(2);
      expect(types.TestType[0].name).toBe("value");
      expect(types.TestType[1].type).toBe("address");
    });

    it("allows valid EIP712Message structure", () => {
      const message: EIP712Message = {
        value: 42,
        recipient: "0x1234567890123456789012345678901234567890",
        data: "test",
      };

      expect(message.value).toBe(42);
      expect(message.recipient).toBe("0x1234567890123456789012345678901234567890");
      expect(message.data).toBe("test");
    });

    it("allows valid TransactionRequest structure with all fields", () => {
      const tx: TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        from: "0x0987654321098765432109876543210987654321",
        data: "0xabcdef",
        value: BigInt(1000),
        gasLimit: BigInt(21000),
        gasPrice: BigInt(20000000000),
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
        nonce: 1,
        chainId: 1,
      };

      expect(tx.to).toBe("0x1234567890123456789012345678901234567890");
      expect(tx.from).toBe("0x0987654321098765432109876543210987654321");
      expect(tx.data).toBe("0xabcdef");
      expect(tx.value).toBe(BigInt(1000));
      expect(tx.gasLimit).toBe(BigInt(21000));
      expect(tx.gasPrice).toBe(BigInt(20000000000));
      expect(tx.maxFeePerGas).toBe(BigInt(30000000000));
      expect(tx.maxPriorityFeePerGas).toBe(BigInt(1000000000));
      expect(tx.nonce).toBe(1);
      expect(tx.chainId).toBe(1);
    });

    it("allows partial TransactionRequest structure", () => {
      const tx: TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        data: "0xabcdef",
      };

      expect(tx.to).toBe("0x1234567890123456789012345678901234567890");
      expect(tx.data).toBe("0xabcdef");
      expect(tx.value).toBeUndefined();
      expect(tx.gasLimit).toBeUndefined();
    });

    it("allows string values for bigint fields in TransactionRequest", () => {
      const tx: TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        value: "1000",
        gasLimit: "21000",
        gasPrice: "20000000000",
      };

      expect(tx.value).toBe("1000");
      expect(tx.gasLimit).toBe("21000");
      expect(tx.gasPrice).toBe("20000000000");
    });
  });

  describe("Callback Types", () => {
    it("SignTypedDataCallback accepts valid parameters and returns signature", async () => {
      const mockSignTypedData: SignTypedDataCallback = async (domain, types, message) => {
        expect(domain).toBeDefined();
        expect(types).toBeDefined();
        expect(message).toBeDefined();
        return "0x1234567890abcdef";
      };

      const domain: EIP712Domain = { name: "Test", chainId: 1 };
      const types: EIP712Types = { TestType: [{ name: "value", type: "uint256" }] };
      const message: EIP712Message = { value: 42 };

      const signature = await mockSignTypedData(domain, types, message);
      expect(signature).toBe("0x1234567890abcdef");
    });

    it("GetAddressCallback returns valid address", async () => {
      const mockGetAddress: GetAddressCallback = async () => {
        return "0x1234567890123456789012345678901234567890";
      };

      const address = await mockGetAddress();
      expect(address).toBe("0x1234567890123456789012345678901234567890");
    });

    it("SendTransactionCallback accepts TransactionRequest and returns hash", async () => {
      const mockSendTransaction: SendTransactionCallback = async (tx) => {
        expect(tx.to).toBeDefined();
        return "0xabcdef1234567890";
      };

      const tx: TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        data: "0x1234",
      };

      const hash = await mockSendTransaction(tx);
      expect(hash).toBe("0xabcdef1234567890");
    });

    it("WalletCallbacks contains all required callbacks", async () => {
      const callbacks: WalletCallbacks = {
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        getAddress: vi.fn().mockResolvedValue("0xaddress"),
        sendTransaction: vi.fn().mockResolvedValue("0xhash"),
      };

      expect(callbacks.signTypedData).toBeDefined();
      expect(callbacks.getAddress).toBeDefined();
      expect(callbacks.sendTransaction).toBeDefined();

      const signature = await callbacks.signTypedData({}, {}, {});
      const address = await callbacks.getAddress();
      const hash = await callbacks.sendTransaction!({ to: "0x1234" });

      expect(signature).toBe("0xsignature");
      expect(address).toBe("0xaddress");
      expect(hash).toBe("0xhash");
    });

    it("WalletCallbacks allows optional sendTransaction", () => {
      const callbacks: WalletCallbacks = {
        signTypedData: vi.fn(),
        getAddress: vi.fn(),
      };

      expect(callbacks.signTypedData).toBeDefined();
      expect(callbacks.getAddress).toBeDefined();
      expect(callbacks.sendTransaction).toBeUndefined();
    });
  });

  describe("createEthersCallbacks", () => {
    it("creates valid WalletCallbacks from ethers signer", async () => {
      const mockSigner = {
        signTypedData: vi.fn().mockResolvedValue("0xethers-signature"),
        getAddress: vi.fn().mockResolvedValue("0xEthersAddress1234567890123456789012345678"),
        sendTransaction: vi.fn().mockResolvedValue({ hash: "0xethers-tx-hash" }),
      };

      const callbacks = createEthersCallbacks(mockSigner);

      expect(callbacks.signTypedData).toBeDefined();
      expect(callbacks.getAddress).toBeDefined();
      expect(callbacks.sendTransaction).toBeDefined();

      // Test signTypedData
      const domain: EIP712Domain = { name: "Test", chainId: 1 };
      const types: EIP712Types = { Test: [{ name: "value", type: "uint256" }] };
      const message: EIP712Message = { value: 42 };

      const signature = await callbacks.signTypedData(domain, types, message);
      expect(signature).toBe("0xethers-signature");
      expect(mockSigner.signTypedData).toHaveBeenCalledWith(domain, types, message);

      // Test getAddress
      const address = await callbacks.getAddress();
      expect(address).toBe("0xEthersAddress1234567890123456789012345678");
      expect(mockSigner.getAddress).toHaveBeenCalled();

      // Test sendTransaction
      const tx: TransactionRequest = { to: "0x1234", data: "0xabcd" };
      const hash = await callbacks.sendTransaction!(tx);
      expect(hash).toBe("0xethers-tx-hash");
      expect(mockSigner.sendTransaction).toHaveBeenCalledWith(tx);
    });

    it("handles ethers signer errors", async () => {
      const mockSigner = {
        signTypedData: vi.fn().mockRejectedValue(new Error("User rejected")),
        getAddress: vi.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
        sendTransaction: vi.fn(),
      };

      const callbacks = createEthersCallbacks(mockSigner);

      await expect(
        callbacks.signTypedData({}, {}, {})
      ).rejects.toThrow("User rejected");
    });
  });

  describe("createViemCallbacks", () => {
    it("creates valid WalletCallbacks from viem wallet client", async () => {
      const mockWalletClient = {
        account: {
          address: "0xViemAddress12345678901234567890123456789",
        },
        signTypedData: vi.fn().mockResolvedValue("0xviem-signature"),
        sendTransaction: vi.fn().mockResolvedValue("0xviem-tx-hash"),
      };

      const callbacks = createViemCallbacks(mockWalletClient);

      expect(callbacks.signTypedData).toBeDefined();
      expect(callbacks.getAddress).toBeDefined();
      expect(callbacks.sendTransaction).toBeDefined();

      // Test signTypedData
      const domain: EIP712Domain = { name: "Test", chainId: 1 };
      const types: EIP712Types = { Test: [{ name: "value", type: "uint256" }] };
      const message: EIP712Message = { value: 42 };

      const signature = await callbacks.signTypedData(domain, types, message);
      expect(signature).toBe("0xviem-signature");
      expect(mockWalletClient.signTypedData).toHaveBeenCalledWith({
        domain,
        types,
        message,
        account: mockWalletClient.account,
        primaryType: "Test",
      });

      // Test getAddress
      const address = await callbacks.getAddress();
      expect(address).toBe("0xViemAddress12345678901234567890123456789");

      // Test sendTransaction
      const tx: TransactionRequest = { to: "0x1234", data: "0xabcd", value: BigInt(1000) };
      const hash = await callbacks.sendTransaction!(tx);
      expect(hash).toBe("0xviem-tx-hash");
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: BigInt(1000),
        account: mockWalletClient.account,
      });
    });

    it("handles viem wallet client without value in transaction", async () => {
      const mockWalletClient = {
        account: { address: "0xViemAddress12345678901234567890123456789" },
        signTypedData: vi.fn(),
        sendTransaction: vi.fn().mockResolvedValue("0xhash"),
      };

      const callbacks = createViemCallbacks(mockWalletClient);
      const tx: TransactionRequest = { to: "0x1234", data: "0xabcd" };

      await callbacks.sendTransaction!(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        account: mockWalletClient.account,
      });
    });

    it("extracts primaryType from types object keys", async () => {
      const mockWalletClient = {
        account: { address: "0x1234567890123456789012345678901234567890" },
        signTypedData: vi.fn().mockResolvedValue("0xsig"),
        sendTransaction: vi.fn(),
      };

      const callbacks = createViemCallbacks(mockWalletClient);

      const types: EIP712Types = {
        CustomType: [{ name: "field", type: "string" }],
        OtherType: [{ name: "value", type: "uint256" }],
      };

      await callbacks.signTypedData({}, types, {});

      expect(mockWalletClient.signTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryType: "CustomType", // First key
        })
      );
    });
  });

  describe("createMetaMaskCallbacks", () => {
    it("creates valid WalletCallbacks from MetaMask ethereum object", async () => {
      const userAddress = "0xMetaMaskAddress123456789012345678901234";
      const mockEthereum = {
        request: vi.fn()
          .mockResolvedValueOnce("0xmetamask-signature") // signTypedData
          .mockResolvedValueOnce("0xmetamask-tx-hash"),  // sendTransaction
      };

      const callbacks = createMetaMaskCallbacks(mockEthereum, userAddress);

      expect(callbacks.signTypedData).toBeDefined();
      expect(callbacks.getAddress).toBeDefined();
      expect(callbacks.sendTransaction).toBeDefined();

      // Test signTypedData
      const domain: EIP712Domain = { name: "Test", chainId: 1 };
      const types: EIP712Types = { Test: [{ name: "value", type: "uint256" }] };
      const message: EIP712Message = { value: 42 };

      const signature = await callbacks.signTypedData(domain, types, message);
      expect(signature).toBe("0xmetamask-signature");

      const signCall = mockEthereum.request.mock.calls[0][0];
      expect(signCall.method).toBe("eth_signTypedData_v4");
      expect(signCall.params[0]).toBe(userAddress);

      const typedData = JSON.parse(signCall.params[1]);
      expect(typedData.domain).toEqual(domain);
      expect(typedData.message).toEqual(message);
      expect(typedData.primaryType).toBe("Test");
      expect(typedData.types.EIP712Domain).toEqual([]);

      // Test getAddress
      const address = await callbacks.getAddress();
      expect(address).toBe(userAddress);

      // Test sendTransaction
      const tx: TransactionRequest = { to: "0x1234", data: "0xabcd", value: BigInt(1000) };
      const hash = await callbacks.sendTransaction!(tx);
      expect(hash).toBe("0xmetamask-tx-hash");

      const txCall = mockEthereum.request.mock.calls[1][0];
      expect(txCall.method).toBe("eth_sendTransaction");
      expect(txCall.params[0].to).toBe(tx.to);
      expect(txCall.params[0].from).toBe(userAddress);
      expect(txCall.params[0].data).toBe(tx.data);
      expect(txCall.params[0].value).toBe("0x3e8"); // 1000 in hex
    });

    it("handles transaction without value", async () => {
      const userAddress = "0x1234567890123456789012345678901234567890";
      const mockEthereum = {
        request: vi.fn().mockResolvedValue("0xhash"),
      };

      const callbacks = createMetaMaskCallbacks(mockEthereum, userAddress);
      const tx: TransactionRequest = { to: "0x5678", data: "0xabcd" };

      await callbacks.sendTransaction!(tx);

      const txCall = mockEthereum.request.mock.calls[0][0];
      expect(txCall.params[0].value).toBeUndefined();
    });

    it("converts string value to hex in transaction", async () => {
      const userAddress = "0x1234567890123456789012345678901234567890";
      const mockEthereum = {
        request: vi.fn().mockResolvedValue("0xhash"),
      };

      const callbacks = createMetaMaskCallbacks(mockEthereum, userAddress);
      const tx: TransactionRequest = { to: "0x5678", value: "2000" };

      await callbacks.sendTransaction!(tx);

      const txCall = mockEthereum.request.mock.calls[0][0];
      expect(txCall.params[0].value).toBe("0x7d0"); // 2000 in hex
    });

    it("handles MetaMask user rejection", async () => {
      const mockEthereum = {
        request: vi.fn().mockRejectedValue(new Error("User rejected request")),
      };

      const callbacks = createMetaMaskCallbacks(mockEthereum, "0x1234567890123456789012345678901234567890");

      await expect(
        callbacks.signTypedData({}, { Test: [] }, {})
      ).rejects.toThrow("User rejected request");
    });

    it("includes EIP712Domain in types for MetaMask", async () => {
      const mockEthereum = {
        request: vi.fn().mockResolvedValue("0xsig"),
      };

      const callbacks = createMetaMaskCallbacks(mockEthereum, "0x1234567890123456789012345678901234567890");

      const types: EIP712Types = {
        MyType: [{ name: "value", type: "uint256" }],
      };

      await callbacks.signTypedData({}, types, {});

      const signCall = mockEthereum.request.mock.calls[0][0];
      const typedData = JSON.parse(signCall.params[1]);

      expect(typedData.types.EIP712Domain).toEqual([]);
      expect(typedData.types.MyType).toEqual(types.MyType);
    });
  });

  describe("Integration Tests", () => {
    it("all helper functions produce compatible WalletCallbacks", async () => {
      const mockEthersSigner = {
        signTypedData: vi.fn().mockResolvedValue("0xsig1"),
        getAddress: vi.fn().mockResolvedValue("0xaddr1"),
        sendTransaction: vi.fn().mockResolvedValue({ hash: "0xhash1" }),
      };

      const mockViemClient = {
        account: { address: "0xaddr2" },
        signTypedData: vi.fn().mockResolvedValue("0xsig2"),
        sendTransaction: vi.fn().mockResolvedValue("0xhash2"),
      };

      const mockMetaMask = {
        request: vi.fn().mockResolvedValue("0xsig3"),
      };

      const ethersCallbacks = createEthersCallbacks(mockEthersSigner);
      const viemCallbacks = createViemCallbacks(mockViemClient);
      const metamaskCallbacks = createMetaMaskCallbacks(mockMetaMask, "0xaddr3");

      // All should have the same structure
      const allCallbacks = [ethersCallbacks, viemCallbacks, metamaskCallbacks];

      allCallbacks.forEach((callbacks) => {
        expect(callbacks).toHaveProperty("signTypedData");
        expect(callbacks).toHaveProperty("getAddress");
        expect(callbacks).toHaveProperty("sendTransaction");
        expect(typeof callbacks.signTypedData).toBe("function");
        expect(typeof callbacks.getAddress).toBe("function");
        expect(typeof callbacks.sendTransaction).toBe("function");
      });
    });

    it("callbacks work with real-world-like EIP712 data", async () => {
      const mockSigner = {
        signTypedData: vi.fn().mockResolvedValue("0xrealSignature"),
        getAddress: vi.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
        sendTransaction: vi.fn().mockResolvedValue({ hash: "0xrealHash" }),
      };

      const callbacks = createEthersCallbacks(mockSigner);

      const domain: EIP712Domain = {
        name: "FHEVM Decryption",
        version: "1",
        chainId: 11155111,
        verifyingContract: "0xA25a9Cbae6a9ea52F25259c1D850C30a9FbA4A3A",
      };

      const types: EIP712Types = {
        Reencrypt: [
          { name: "publicKey", type: "bytes32" },
          { name: "signature", type: "bytes" },
        ],
      };

      const message: EIP712Message = {
        publicKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        signature: "0xabcdef",
      };

      const signature = await callbacks.signTypedData(domain, types, message);
      expect(signature).toBe("0xrealSignature");
      expect(mockSigner.signTypedData).toHaveBeenCalledWith(domain, types, message);
    });
  });
});
