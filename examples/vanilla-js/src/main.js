import './style.css';
import { FhevmClient, helpers } from "@fhevm-sdk/vanilla";
import { Buffer } from 'buffer';
import { deployedContracts } from "./deployedContracts";
import {
  createErrorHandler,
  createValidationManager,
  createRetryManager,
  createDebugManager,
} from './lib/utils/index.js';

// Ensure Buffer is available globally (needed for web3 operations)
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// ============================================================================
// Helper Functions for Contract Resolution
// ============================================================================

/**
 * Get contract configuration for the current chain
 * @param {number} chainId - The chain ID
 * @returns {{ address: string, abi: any[] } | null} Contract config or null
 */
function getContractForChain(chainId) {
  const chainConfig = deployedContracts[chainId];
  if (!chainConfig || !chainConfig.FHECounter) {
    return null;
  }
  return {
    address: chainConfig.FHECounter.address,
    abi: chainConfig.FHECounter.abi,
  };
}

// ============================================================================
// DOM Elements
// ============================================================================

// Navbar wallet connect
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const connectedState = document.getElementById("connected-state");
const disconnectedState = document.getElementById("disconnected-state");
const shortAddressEl = document.getElementById("short-address");
const networkNameEl = document.getElementById("network-name");
const networkIconBadge = document.getElementById("network-icon-badge");
const connectSpinner = document.getElementById("connect-spinner");
const connectText = document.getElementById("connect-text");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");

// Main sections
const notConnectedState = document.getElementById("not-connected-state");
const mainContent = document.getElementById("main-content");
const wrongNetworkState = document.getElementById("wrong-network-state");

// FHEVM status
const fhevmStatusBadge = document.getElementById("fhevm-status-badge");
const fhevmStatusSpinner = document.getElementById("fhevm-status-spinner");
const fhevmStatusText = document.getElementById("fhevm-status-text");
const fhevmError = document.getElementById("fhevm-error");

// Handle display
const handleDisplay = document.getElementById("handle-display");
const refreshHandleBtn = document.getElementById("refresh-handle");
const refreshSpinner = document.getElementById("refresh-spinner");

// Decrypted value display
const decryptedSection = document.getElementById("decrypted-section");
const decryptedValueDisplay = document.getElementById("decrypted-value-display");
const decryptedValue = document.getElementById("decrypted-value");
const decryptBtn = document.getElementById("decrypt");
const decryptSpinner = document.getElementById("decrypt-spinner");
const decryptText = document.getElementById("decrypt-text");

// Counter controls
const counterInput = document.getElementById("counter-input");
const btnPlus1 = document.getElementById("btn-plus-1");
const btnPlus5 = document.getElementById("btn-plus-5");
const btnMinus1 = document.getElementById("btn-minus-1");
const btnMinus5 = document.getElementById("btn-minus-5");
const updateCounterBtn = document.getElementById("update-counter");
const updateSpinner = document.getElementById("update-spinner");
const updateText = document.getElementById("update-text");

// Status message
const statusMessage = document.getElementById("status-message");
const statusText = document.getElementById("status-text");

// Log
const logEl = document.getElementById("log");

// ============================================================================
// State Management
// ============================================================================

let client;
let account;
let chainIdValue;
let fhevmReady = false;
let currentHandle;
let currentDecryptedValue;

const state = {
  isConnecting: false,
  isInitializing: false,
  isRefreshing: false,
  isDecrypting: false,
  isProcessing: false,
};

// ============================================================================
// Utils Managers
// ============================================================================

const errorHandler = createErrorHandler();
const validator = createValidationManager();
const retryMgr = createRetryManager();
const debugMgr = createDebugManager();

// Initialize debug mode from localStorage
debugMgr.initializeDebugMode();

// Set up error handler listeners
errorHandler.on('error', (message) => {
  log(`❌ Error: ${message}`);
});

// Set up validation listeners
validator.on('validationChange', (errors) => {
  if (Object.keys(errors).length > 0) {
    log(`⚠️ Validation errors:`, errors);
  }
});

// Set up retry progress listeners
retryMgr.on('retryProgress', (state) => {
  if (debugMgr.isDebugEnabled()) {
    log(`🔄 ${state.retryMessage}`);
  }
});

// Set up debug mode listeners
debugMgr.on('debugModeChange', (enabled) => {
  log(`🔧 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
});

// ============================================================================
// Utility Functions
// ============================================================================

function log(msg, data) {
  const timestamp = new Date().toLocaleTimeString();
  let logMessage = `[${timestamp}] ${msg}`;
  if (data) {
    try {
      // Handle BigInt serialization
      const dataStr = JSON.stringify(data, (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      });
      logMessage += ` ${dataStr}`;
    } catch (e) {
      // Fallback to toString if JSON.stringify fails
      logMessage += ` ${String(data)}`;
    }
  }

  // Only display in Activity Log if debug is enabled
  if (debugMgr.isDebugEnabled()) {
    logEl.textContent += `\n${logMessage}`;
    // Auto-scroll to latest message
    const logContainer = logEl.parentElement;
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  // Always log to browser console for debugging
  console.log(logMessage, data);
}

function showStatus(msg, type = "info") {
  statusText.textContent = msg;
  statusMessage.classList.remove("hidden", "alert-error", "alert-success", "alert-info", "alert-warning");
  statusMessage.classList.add(type === "error" ? "alert-error" : type === "success" ? "alert-success" : type === "warning" ? "alert-warning" : "alert-info");
}

function updateNetworkBadge() {
  if (!chainIdValue) {
    networkNameEl.textContent = "Unknown";
    networkIconBadge.textContent = "🔗";
    networkIconBadge.className = "badge badge-sm badge-ghost";
    return;
  }

  // Update network name and icon based on chain ID
  if (chainIdValue === 31337) {
    networkNameEl.textContent = "Localhost";
    networkIconBadge.textContent = "🏠";
    networkIconBadge.className = "badge badge-sm badge-secondary";
  } else if (chainIdValue === 11155111) {
    networkNameEl.textContent = "Sepolia";
    networkIconBadge.textContent = "🌐";
    networkIconBadge.className = "badge badge-sm badge-accent";
  } else {
    networkNameEl.textContent = `Chain ${chainIdValue}`;
    networkIconBadge.textContent = "🔗";
    networkIconBadge.className = "badge badge-sm badge-ghost";
  }

  // Update network switcher dropdown states
  updateNetworkSwitcherDropdown();
}

function updateNetworkSwitcherDropdown() {
  const switchLocalhostBtn = document.getElementById("switch-localhost");
  const switchSepoliaBtn = document.getElementById("switch-sepolia");

  if (!switchLocalhostBtn || !switchSepoliaBtn) return;

  // Get check marks
  const localhostCheck = switchLocalhostBtn.querySelector(".network-check");
  const sepoliaCheck = switchSepoliaBtn.querySelector(".network-check");

  if (!account) {
    // Disable both when not connected
    switchLocalhostBtn.disabled = true;
    switchSepoliaBtn.disabled = true;
    if (localhostCheck) localhostCheck.classList.add("hidden");
    if (sepoliaCheck) sepoliaCheck.classList.add("hidden");
    return;
  }

  const isLocalhost = chainIdValue === 31337;
  const isSepolia = chainIdValue === 11155111;

  // Update Localhost button
  switchLocalhostBtn.disabled = isLocalhost;
  if (localhostCheck) {
    if (isLocalhost) {
      localhostCheck.classList.remove("hidden");
      switchLocalhostBtn.classList.add("active");
    } else {
      localhostCheck.classList.add("hidden");
      switchLocalhostBtn.classList.remove("active");
    }
  }

  // Update Sepolia button
  switchSepoliaBtn.disabled = isSepolia;
  if (sepoliaCheck) {
    if (isSepolia) {
      sepoliaCheck.classList.remove("hidden");
      switchSepoliaBtn.classList.add("active");
    } else {
      sepoliaCheck.classList.add("hidden");
      switchSepoliaBtn.classList.remove("active");
    }
  }
}

function updateUIVisibility() {
  const connected = !!account;
  const validChain = chainIdValue === 31337 || chainIdValue === 11155111;
  const contentReady = connected && fhevmReady && validChain;

  connectedState.classList.toggle("hidden", !connected);
  disconnectedState.classList.toggle("hidden", connected);
  notConnectedState.classList.toggle("hidden", connected);
  mainContent.classList.toggle("hidden", !contentReady);
  wrongNetworkState.classList.toggle("hidden", connected && validChain);
}

function setAllButtonsDisabled(disabled) {
  [btnPlus1, btnPlus5, btnMinus1, btnMinus5, updateCounterBtn, refreshHandleBtn, decryptBtn].forEach(btn => {
    btn.disabled = disabled || state.isProcessing || state.isDecrypting || state.isRefreshing;
  });
}

// ============================================================================
// Network Switching
// ============================================================================

async function switchNetwork(targetChainId) {
  if (!window.ethereum) {
    log("❌ No Ethereum provider found");
    showStatus("No Ethereum provider found", "error");
    return;
  }

  if (chainIdValue === targetChainId) {
    log(`ℹ️ Already on the target network (${targetChainId})`);
    return;
  }

  try {
    const chainIdHex = `0x${targetChainId.toString(16)}`;
    log(`🔄 Switching to network ${targetChainId} (${chainIdHex})...`);

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      log(`✅ Switched to network ${targetChainId}`);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        log(`⚠️ Network ${targetChainId} not found in wallet, attempting to add...`);

        // Define network configurations
        const networkConfigs = {
          31337: {
            chainId: chainIdHex,
            chainName: 'Localhost',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: null,
          },
          11155111: {
            chainId: chainIdHex,
            chainName: 'Sepolia',
            nativeCurrency: {
              name: 'Sepolia Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://eth-sepolia.public.blastapi.io'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        };

        const networkConfig = networkConfigs[targetChainId];
        if (!networkConfig) {
          throw new Error(`Network configuration not found for chainId ${targetChainId}`);
        }

        // Try to add the network
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
        log(`✅ Network ${targetChainId} added and switched`);
      } else {
        throw switchError;
      }
    }
  } catch (error) {
    const errorMsg = errorHandler.handleError(error);
    log(`❌ Failed to switch network: ${error.message}`);
    showStatus(`Failed to switch network: ${errorMsg}`, "error");
  }
}

// ============================================================================
// Wallet Connect
// ============================================================================

async function connectWallet() {
  if (state.isConnecting) return;
  state.isConnecting = true;
  connectBtn.disabled = true;
  connectSpinner.classList.remove("hidden");
  connectText.textContent = "Connecting...";
  errorMessage.classList.add("hidden");

  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    log("🔗 Requesting wallet connection...");
    const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = addr;
    chainIdValue = parseInt(await window.ethereum.request({ method: "eth_chainId" }));

    log(`✅ Connected: ${addr}`);
    log(`🌐 Chain ID: ${chainIdValue}`);

    shortAddressEl.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    updateNetworkBadge();
    updateUIVisibility();

    // Auto-initialize FHEVM after wallet connection
    await initFhevm();
  } catch (error) {
    const errorMsg = errorHandler.handleError(error);
    log(`❌ Connection failed: ${error.message}`);
    errorText.textContent = errorMsg;
    errorMessage.classList.remove("hidden");
  } finally {
    state.isConnecting = false;
    connectBtn.disabled = false;
    connectSpinner.classList.add("hidden");
    connectText.textContent = "Connect Wallet";
  }
}

function disconnectWallet() {
  account = null;
  chainIdValue = null;
  fhevmReady = false;
  client = undefined;
  currentHandle = null;
  currentDecryptedValue = null;
  updateUIVisibility();
  updateNetworkSwitcherDropdown();
  log("👋 Wallet disconnected");
}

// ============================================================================
// FHEVM Initialization
// ============================================================================

async function initFhevm() {
  if (state.isInitializing) return;
  if (!account) return;
  if (fhevmReady) return;

  state.isInitializing = true;
  fhevmStatusSpinner.classList.remove("hidden");

  try {
    log("⚙️ Initializing FHEVM...");
    fhevmStatusText.textContent = "Initializing...";

    const stopTimer = debugMgr.startPerformanceTimer('fhevm-init');

    if (!client) {
      client = new FhevmClient({
        provider: window.ethereum,
        onStatusChange: (s) => {
          log(`⚡ FHEVM status: ${s}`);
        }
      });
    }

    await client.init();
    log("🚀 FHEVM initialized successfully!");

    const metric = stopTimer();
    if (debugMgr.isDebugEnabled()) {
      log(`⏱️ Initialization took ${metric.duration}ms`);
    }

    fhevmReady = true;
    fhevmStatusSpinner.classList.add("hidden");
    fhevmStatusText.textContent = "Ready ✓";
    fhevmStatusBadge.className = "badge badge-lg badge-success";
    fhevmError.classList.add("hidden");

    updateUIVisibility();
    await refreshCounterHandle();
  } catch (error) {
    const errorMsg = errorHandler.handleError(error);
    log(`❌ Initialization failed: ${error.message}`);
    fhevmStatusText.textContent = "Error";
    fhevmStatusBadge.className = "badge badge-lg badge-error";
    fhevmStatusSpinner.classList.add("hidden");
    fhevmError.textContent = errorMsg;
    fhevmError.classList.remove("hidden");
  } finally {
    state.isInitializing = false;
  }
}

// ============================================================================
// Counter Operations
// ============================================================================

async function refreshCounterHandle() {
  if (state.isRefreshing || !fhevmReady) return;

  state.isRefreshing = true;
  refreshHandleBtn.disabled = true;
  refreshSpinner.classList.remove("hidden");

  try {
    log("📖 Reading encrypted counter...");

    // Get contract for current chain
    const contract = getContractForChain(chainIdValue);
    if (!contract) {
      throw new Error(`Contract not deployed on chain ${chainIdValue}`);
    }

    const { ethers } = await import("ethers");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const ctr = new ethers.Contract(contract.address, contract.abi, signer);
    const handle = await ctr.getCount();

    currentHandle = handle;
    handleDisplay.textContent = `${handle.slice(0, 10)}...${handle.slice(-8)}`;
    log("✅ Handle retrieved");

    // Clear decrypted value when handle changes
    currentDecryptedValue = null;
    showDecryptedValue(null);
  } catch (error) {
    log(`❌ Failed to read counter: ${error.message}`);
    showStatus(`Error: ${error.message}`, "error");
  } finally {
    state.isRefreshing = false;
    refreshHandleBtn.disabled = false;
    refreshSpinner.classList.add("hidden");
  }
}

async function updateCounter(delta) {
  if (state.isProcessing || !fhevmReady) return;

  state.isProcessing = true;
  setAllButtonsDisabled(true);
  updateSpinner.classList.remove("hidden");

  try {
    const amount = Math.abs(delta);
    const op = delta > 0 ? "increment" : "decrement";

    log(`🔐 Encrypting ${amount} with euint32...`);
    showStatus(`Encrypting ${amount}...`);

    const stopTimer = debugMgr.startPerformanceTimer(`${op}-operation`);

    // Get contract for current chain
    const contract = getContractForChain(chainIdValue);
    if (!contract) {
      throw new Error(`Contract not deployed on chain ${chainIdValue}`);
    }

    const { ethers } = await import("ethers");

    // Ensure addresses are in proper checksum format
    const checksummedUserAddress = ethers.getAddress(account);
    const checksummedContractAddress = ethers.getAddress(contract.address);

    // Validate addresses
    validator.validateAddressField('userAddress', checksummedUserAddress);
    validator.validateAddressField('contractAddress', checksummedContractAddress);

    const enc = await client.encrypt(amount, "euint32", {
      contractAddress: checksummedContractAddress,
      userAddress: checksummedUserAddress,
    });
    log("✅ Encryption successful");

    const { toHex } = helpers;

    log(`📝 Preparing ${op} transaction...`);
    showStatus(`Sending ${op} transaction...`);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const ctr = new ethers.Contract(checksummedContractAddress, contract.abi, signer);

    const tx = delta > 0
      ? await ctr.increment(toHex(enc.handles[0]), toHex(enc.inputProof))
      : await ctr.decrement(toHex(enc.handles[0]), toHex(enc.inputProof));

    log(`📤 Sent ${op} transaction: ${tx.hash}`);
    log(`⏳ Waiting for confirmation...`);
    showStatus(`Waiting for confirmation...`);

    // Use retry with progress for transaction confirmation
    await retryMgr.retryWithProgress(`${op}-confirmation`, async () => {
      return await tx.wait();
    });

    const metric = stopTimer();
    if (debugMgr.isDebugEnabled()) {
      log(`⏱️ ${op} took ${metric.duration}ms`);
    }

    log(`✅ ${op.charAt(0).toUpperCase() + op.slice(1)} confirmed!`);
    showStatus(`${op.charAt(0).toUpperCase() + op.slice(1)} successful!`, "success");

    // Refresh counter handle
    await refreshCounterHandle();
  } catch (error) {
    const errorMsg = errorHandler.handleError(error);
    if (errorHandler.shouldRetry(error)) {
      log(`🔄 Error is retryable: ${error.message}`);
    } else if (errorHandler.isUserError(error)) {
      log(`👤 User cancelled operation`);
    }
    log(`❌ Operation failed: ${error.message}`);
    showStatus(`Error: ${errorMsg}`, "error");
  } finally {
    state.isProcessing = false;
    setAllButtonsDisabled(false);
    updateSpinner.classList.add("hidden");
    updateText.textContent = "Update Counter";
  }
}

async function decryptCounter() {
  if (state.isDecrypting || !fhevmReady || !currentHandle) return;

  state.isDecrypting = true;
  decryptBtn.disabled = true;
  decryptSpinner.classList.remove("hidden");
  decryptText.textContent = "Decrypting...";
  setAllButtonsDisabled(true);

  try {
    log("🔑 Building decryption request...");
    showStatus("Building decryption request...");

    const stopTimer = debugMgr.startPerformanceTimer('decrypt-operation');

    // Get contract for current chain
    const contract = getContractForChain(chainIdValue);
    if (!contract) {
      throw new Error(`Contract not deployed on chain ${chainIdValue}`);
    }

    const { ethers } = await import("ethers");

    // Ensure addresses are in proper checksum format
    const checksummedUserAddress = ethers.getAddress(account);
    const checksummedContractAddress = ethers.getAddress(contract.address);

    // Validate addresses
    validator.validateAddressField('decryptUserAddress', checksummedUserAddress);
    validator.validateAddressField('decryptContractAddress', checksummedContractAddress);

    log(`✅ Address checksum validated - User: ${checksummedUserAddress}`);
    log(`✅ Contract address checksum validated - Contract: ${checksummedContractAddress}`);

    const instance = client.getInstance();
    const nowSec = Math.floor(Date.now() / 1000);
    const durationDays = 1;

    // Generate keypair
    log("🔐 Generating keypair...");
    const { publicKey, privateKey } = instance.generateKeypair();
    log(`📦 Keypair generated - Public Key: ${publicKey.slice(0, 20)}...`);

    // Create EIP-712 structure with checksummed address
    log("📋 Creating EIP-712 structure...");
    const eip712 = instance.createEIP712(publicKey, [checksummedContractAddress], nowSec, durationDays);

    // Sign with ethers
    log("✍️  Signing decryption request with MetaMask...");
    showStatus("Signing decryption request...");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message
    );
    log("✅ Signature created successfully");
    log(`📝 Signature: ${signature.slice(0, 20)}...`);

    log("🔓 Calling decryption via RelayerSDK...");
    showStatus("Decrypting counter value...");

    // Call userDecrypt directly via instance with checksummed addresses
    const results = await instance.userDecrypt(
      [{ handle: currentHandle, contractAddress: checksummedContractAddress }],
      privateKey,
      publicKey,
      signature,
      [checksummedContractAddress],
      checksummedUserAddress,
      nowSec,
      durationDays
    );

    log(`📊 Decryption results received:`, results);

    // Find the decrypted value in results
    let decryptedValue = null;
    if (results && typeof results === 'object') {
      // Try to find the value by handle
      if (results[currentHandle] !== undefined) {
        decryptedValue = results[currentHandle];
      } else {
        // If not found by exact handle, try the first available result
        const values = Object.values(results);
        if (values.length > 0) {
          decryptedValue = values[0];
        }
      }
    }

    log(`🔎 Looking for result with handle: ${currentHandle}`);
    log(`📦 Available result keys: ${Object.keys(results || {}).join(', ') || 'none'}`);

    if (decryptedValue !== null && decryptedValue !== undefined) {
      currentDecryptedValue = decryptedValue;
      showDecryptedValue(decryptedValue);

      const metric = stopTimer();
      if (debugMgr.isDebugEnabled()) {
        log(`⏱️ Decryption took ${metric.duration}ms`);
      }

      log(`✅ Successfully decrypted! Value: ${decryptedValue}`);
      showStatus(`Decrypted value: ${decryptedValue}`, "success");
    } else {
      log(`❌ No decrypted value found in results`);
      // Handle BigInt in error message
      const resultsStr = JSON.stringify(results, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      });
      throw new Error(`Decryption returned no valid value. Results: ${resultsStr}`);
    }
  } catch (error) {
    const errorMsg = errorHandler.handleError(error);
    if (errorHandler.shouldRetry(error)) {
      log(`🔄 Error is retryable: ${error.message}`);
    } else if (errorHandler.isUserError(error)) {
      log(`👤 User rejected the signature request`);
    }
    log(`❌ Decryption failed: ${error.message}`);
    showStatus(`Error: ${errorMsg}`, "error");
    console.error("Decryption error details:", error);
  } finally {
    state.isDecrypting = false;
    decryptBtn.disabled = false;
    decryptSpinner.classList.add("hidden");
    decryptText.textContent = "Decrypt";
    setAllButtonsDisabled(false);
  }
}

function showDecryptedValue(value) {
  if (value !== null && value !== undefined) {
    decryptedValueDisplay.classList.remove("hidden");
    decryptedSection.classList.add("hidden");
    decryptedValue.textContent = String(value);
  } else {
    decryptedValueDisplay.classList.add("hidden");
    decryptedSection.classList.remove("hidden");
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

// Debug Toggle
const debugToggleBtn = document.getElementById("debug-toggle");
const debugIcon = document.getElementById("debug-icon");
const debugText = document.getElementById("debug-text");
const clearLogsBtn = document.getElementById("clear-logs");

debugToggleBtn.addEventListener("click", () => {
  const isEnabled = debugMgr.toggleDebugMode();
  debugIcon.textContent = isEnabled ? "🔍" : "🐛";
  debugText.textContent = isEnabled ? "Debug ON" : "Debug OFF";
  debugToggleBtn.classList.toggle("btn-primary", isEnabled);
  debugToggleBtn.classList.toggle("btn-ghost", !isEnabled);
});

// Clear logs button
clearLogsBtn.addEventListener("click", () => {
  logEl.textContent = "Ready to start...";
  console.log("📝 Activity log cleared");
});

// Error Alert Elements
const globalErrorAlert = document.getElementById("global-error-alert");
const errorAlertMessage = document.getElementById("error-alert-message");
const errorAlertRetry = document.getElementById("error-alert-retry");
const errorAlertDismiss = document.getElementById("error-alert-dismiss");

// Validation Alert Elements
const validationAlert = document.getElementById("validation-alert");
const validationErrorsList = document.getElementById("validation-errors-list");
const validationAlertDismiss = document.getElementById("validation-alert-dismiss");

// Show global error alert
function showErrorAlert(message, retryFn = null) {
  errorAlertMessage.textContent = message;
  if (retryFn) {
    errorAlertRetry.classList.remove("hidden");
    errorAlertRetry.onclick = () => {
      hideErrorAlert();
      retryFn();
    };
  } else {
    errorAlertRetry.classList.add("hidden");
  }
  globalErrorAlert.classList.remove("hidden");
}

function hideErrorAlert() {
  globalErrorAlert.classList.add("hidden");
  errorAlertRetry.onclick = null;
}

// Show validation errors alert
function showValidationAlert(errors) {
  validationErrorsList.innerHTML = '';
  Object.entries(errors).forEach(([field, message]) => {
    const errorItem = document.createElement('div');
    errorItem.className = 'text-warning';
    errorItem.textContent = `• ${field}: ${message}`;
    validationErrorsList.appendChild(errorItem);
  });
  validationAlert.classList.remove("hidden");
}

function hideValidationAlert() {
  validationAlert.classList.add("hidden");
}

// Error and validation alert listeners
errorAlertDismiss.addEventListener("click", hideErrorAlert);
validationAlertDismiss.addEventListener("click", hideValidationAlert);

// Connect error handler to global error alert
errorHandler.on('error', (message) => {
  showErrorAlert(message);
});

// Connect validation handler to validation alert
validator.on('validationChange', (errors) => {
  if (Object.keys(errors).length > 0) {
    showValidationAlert(errors);
  } else {
    hideValidationAlert();
  }
});

// Wallet
connectBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);

// Network Switcher (from dropdown)
document.addEventListener("DOMContentLoaded", () => {
  const switchLocalhostBtn = document.getElementById("switch-localhost");
  const switchSepoliaBtn = document.getElementById("switch-sepolia");

  if (switchLocalhostBtn) {
    switchLocalhostBtn.addEventListener("click", () => switchNetwork(31337));
  }

  if (switchSepoliaBtn) {
    switchSepoliaBtn.addEventListener("click", () => switchNetwork(11155111));
  }
});

// Quick action buttons
btnPlus1.addEventListener("click", () => {
  counterInput.value = "1";
  updateCounter(1);
});

btnPlus5.addEventListener("click", () => {
  counterInput.value = "5";
  updateCounter(5);
});

btnMinus1.addEventListener("click", () => {
  counterInput.value = "-1";
  updateCounter(-1);
});

btnMinus5.addEventListener("click", () => {
  counterInput.value = "-5";
  updateCounter(-5);
});

// Update counter button
updateCounterBtn.addEventListener("click", () => {
  const value = Number(counterInput.value || 0);
  if (value !== 0) {
    const op = value > 0 ? "Increment" : "Decrement";
    updateText.textContent = `${op} by ${Math.abs(value)}...`;
    updateCounter(value);
  }
});

// Counter input with Enter key support
counterInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    updateCounterBtn.click();
  }
});

// Decrypt button
decryptBtn.addEventListener("click", decryptCounter);
refreshHandleBtn.addEventListener("click", refreshCounterHandle);

// Detect network/account changes
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== account) {
      account = accounts[0];
      log(`🔄 Account switched to: ${account}`);
      shortAddressEl.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
    }
  });

  window.ethereum.on("chainChanged", (newChainId) => {
    chainIdValue = parseInt(newChainId);
    log(`🔄 Chain switched to: ${chainIdValue}`);
    updateNetworkBadge();
    updateUIVisibility();
    fhevmReady = false;
    if (account) {
      initFhevm();
    }
  });
}

// Initialize
log("✅ Application initialized. Connect wallet to start.");
updateUIVisibility();
