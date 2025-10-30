"use client";

import { useMemo, useState, useEffect } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHECounterWagmi } from "~~/hooks/fhecounter-example/useFHECounterWagmi";
import { useIndexedDBStorage } from "~~/hooks/helper/useIndexedDBStorage";
import { toggleDebugMode, isDebugEnabled, initializeDebugMode, logDebug } from "~/lib/utils";

/*
 * Main FHECounter React component with 3 buttons
 *  - "Decrypt" button: allows you to decrypt the current FHECounter count handle.
 *  - "Increment" button: allows you to increment the FHECounter count handle using FHE operations.
 *  - "Decrement" button: allows you to decrement the FHECounter count handle using FHE operations.
 *
 * Uses IndexedDB storage for persistent decryption signatures (survives page reload).
 */
export const FHECounterDemo = () => {
  const { isConnected, chain } = useAccount();
  const [debugEnabled, setDebugEnabled] = useState(false);

  const chainId = chain?.id;

  // Initialize debug mode from localStorage on component mount
  useEffect(() => {
    initializeDebugMode();
    setDebugEnabled(isDebugEnabled());
  }, []);

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  // Create EIP-1193 provider from wagmi for FHEVM
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    // Get the wallet provider from window.ethereum
    return (window as any).ethereum;
  }, []);

  const initialMockChains = { 31337: "http://localhost:8545" };

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true, // use enabled to dynamically create the instance on-demand
  });

  //////////////////////////////////////////////////////////////////////////////
  // IndexedDB Storage for persistent decryption signatures
  // This means signatures survive page reload - user doesn't need to re-sign!
  //////////////////////////////////////////////////////////////////////////////

  const { storage: indexedDBStorage, isReady: storageReady, error: storageError } = useIndexedDBStorage({
    dbName: "fhevm-nextjs-app",
    storeName: "signatures",
  });

  //////////////////////////////////////////////////////////////////////////////
  // useFHECounter is a custom hook containing all the FHECounter logic, including
  // - calling the FHECounter contract
  // - encrypting FHE inputs
  // - decrypting FHE handles (with persistent storage!)
  //////////////////////////////////////////////////////////////////////////////

  const fheCounter = useFHECounterWagmi({
    instance: fhevmInstance,
    initialMockChains,
    storage: indexedDBStorage, // Use IndexedDB for persistence
  });

  //////////////////////////////////////////////////////////////////////////////
  // UI Stuff:
  // --------
  // A basic page containing
  // - A bunch of debug values allowing you to better visualize the React state
  // - 1x "Decrypt" button (to decrypt the latest FHECounter count handle)
  // - 1x "Increment" button (to increment the FHECounter)
  // - 1x "Decrement" button (to decrement the FHECounter)
  //////////////////////////////////////////////////////////////////////////////

  // DaisyUI cyberpunk theme button classes
  const primaryButtonClass = "btn btn-primary btn-lg";
  const secondaryButtonClass = "btn btn-secondary btn-lg";
  const successButtonClass = "btn btn-accent btn-lg";

  const titleClass = "font-bold text-xl mb-4 border-b border-base-content/20 pb-2";
  const sectionClass = "bg-base-200 shadow-xl p-6 mb-6";

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="card bg-base-100 shadow-xl p-8 text-center max-w-md">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warning/30 text-warning text-3xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Wallet not connected</h2>
            <p className="text-base-content/70 mb-6">Connect your wallet to use the FHE Counter demo.</p>
            <div className="flex items-center justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🔐 FHE Counter Demo</h1>
        <p className="text-base-content/70">Interact with the Fully Homomorphic Encryption Counter contract</p>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const newState = toggleDebugMode();
              setDebugEnabled(newState);
              logDebug(`Debug mode ${newState ? "enabled" : "disabled"}`);
            }}
            className={`btn btn-sm gap-2 ${debugEnabled ? "btn-info" : "btn-ghost"}`}
          >
            🐛 {debugEnabled ? "Debug ON" : "Debug OFF"}
          </button>
        </div>
      </div>

      {/* Count Handle Display */}
      <div className={sectionClass}>
        <h3 className={titleClass}>🔢 Count Handle</h3>
        <div className="space-y-3 space-x-3">
          {printProperty("Encrypted Handle", fheCounter.handle || "No handle available")}
          {printProperty("Decrypted Value", fheCounter.isDecrypted ? fheCounter.clear : "Not decrypted yet")}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          className={fheCounter.isDecrypted ? successButtonClass : primaryButtonClass}
          disabled={!fheCounter.canDecrypt}
          onClick={fheCounter.decryptCountHandle}
        >
          {fheCounter.canDecrypt
            ? "🔓 Decrypt Counter"
            : fheCounter.isDecrypted
              ? `✅ Decrypted: ${fheCounter.clear}`
              : fheCounter.isDecrypting
                ? "⏳ Decrypting..."
                : "❌ Nothing to decrypt"}
        </button>

        <button
          className={secondaryButtonClass}
          disabled={!fheCounter.canUpdateCounter}
          onClick={() => fheCounter.updateCounter(+1)}
        >
          {fheCounter.canUpdateCounter
            ? "➕ Increment +1"
            : fheCounter.isProcessing
              ? "⏳ Processing..."
              : "❌ Cannot increment"}
        </button>

        <button
          className={secondaryButtonClass}
          disabled={!fheCounter.canUpdateCounter}
          onClick={() => fheCounter.updateCounter(-1)}
        >
          {fheCounter.canUpdateCounter
            ? "➖ Decrement -1"
            : fheCounter.isProcessing
              ? "⏳ Processing..."
              : "❌ Cannot decrement"}
        </button>
      </div>

      {/* Messages */}
      {fheCounter.message && (
        <div className={sectionClass}>
          <h3 className={titleClass}>💬 Messages</h3>
          <div className="alert alert-info">
            <p>{fheCounter.message}</p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>🔧 FHEVM Instance</h3>
          <div className="space-y-3">
            {printProperty("Instance Status", fhevmInstance ? "✅ Connected" : "❌ Disconnected")}
            {printProperty("Status", fhevmStatus)}
            {printProperty("Error", fhevmError ?? "No errors")}
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>💾 Storage</h3>
          <div className="space-y-3">
            {printProperty("Type", storageReady ? "IndexedDB" : "Initializing...")}
            {printProperty("Status", storageReady ? "✅ Ready" : "⏳ Loading")}
            {printProperty("Persistent", storageReady && !storageError ? "✅ Yes" : "❌ No")}
            {storageError && printProperty("Fallback", "localStorage/memory")}
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>📊 Counter Status</h3>
          <div className="space-y-3">
            {printProperty("Refreshing", fheCounter.isRefreshing)}
            {printProperty("Decrypting", fheCounter.isDecrypting)}
            {printProperty("Processing", fheCounter.isProcessing)}
            {printProperty("Can Get Count", fheCounter.canGetCount)}
            {printProperty("Can Decrypt", fheCounter.canDecrypt)}
            {printProperty("Can Modify", fheCounter.canUpdateCounter)}
          </div>
        </div>
      </div>
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-base-100 border border-base-content/20 w-full rounded">
      <span className="font-medium">{name}</span>
      <span className="ml-2 font-mono text-sm font-semibold bg-base-300 px-2 py-1 rounded">
        {displayValue}
      </span>
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-base-100 border border-base-content/20 w-full rounded">
      <span className="font-medium">{name}</span>
      <span className={`badge badge-lg ${value ? "badge-success" : "badge-error"}`}>
        {value ? "✓ true" : "✗ false"}
      </span>
    </div>
  );
}
