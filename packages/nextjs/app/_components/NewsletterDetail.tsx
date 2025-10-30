"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NewsletterViewer } from "../../components/cryptletter/NewsletterViewer";
import { Address } from "../../components/helper";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import {
  type NewsletterData,
  createIPFSClient,
  decryptContent,
  deserializeBundle,
  fheOutputToAESKey,
} from "@fhevm-sdk";
import { useFHEDecrypt, useFhevmContext } from "@fhevm-sdk/react";
import { formatDistanceToNow } from "date-fns";
import { useAccount, useReadContract, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

interface NewsletterDetailProps {
  postId: string;
}

export function NewsletterDetail({ postId }: NewsletterDetailProps) {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;
  const [decryptedNewsletter, setDecryptedNewsletter] = useState<NewsletterData | null>(null);
  const [aesKey, setAesKey] = useState<Uint8Array | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // FHEVM instance for decryption
  const { instance, storage } = useFhevmContext();
  const { signTypedDataAsync } = useSignTypedData();

  // Create wagmi-compatible callbacks for FHE decryption
  const signTypedData = useCallback(
    async (domain: any, types: any, message: any) => {
      return await signTypedDataAsync({ domain, types, message, primaryType: Object.keys(types)[0] });
    },
    [signTypedDataAsync],
  );

  const getAddress = useCallback(async () => {
    return userAddress as string;
  }, [userAddress]);

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Get newsletter details
  const { data: newsletterData } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getNewsletter",
    args: [BigInt(postId)],
    query: {
      enabled: Boolean(contractInfo?.address && postId),
    },
  });

  // Get creator info - handle both array and object responses
  const creator = newsletterData
    ? Array.isArray(newsletterData)
      ? newsletterData[6]
      : (newsletterData as any).creator
    : undefined;
  const { data: creatorData } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [creator as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && creator),
    },
  });

  // Check access
  const { data: hasAccess } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "canAccessNewsletter",
    args: [BigInt(postId), userAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && postId && userAddress),
    },
  });

  // Auto-grant permission for creators (they already have FHE permission from publishNewsletter)
  useEffect(() => {
    if (!newsletterData || !userAddress) return;

    const newsletterArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
    const creatorAddress = newsletterArray?.[6] as string | undefined;

    if (!creatorAddress) return;

    const isCreator = userAddress.toLowerCase() === creatorAddress.toLowerCase();

    if (isCreator && !permissionGranted) {
      setPermissionGranted(true);
    }
  }, [newsletterData, userAddress, permissionGranted]);

  // Grant decryption permission transaction
  const {
    writeContract: grantPermission,
    data: grantPermissionHash,
    isPending: isGrantingPermission,
  } = useWriteContract();

  // Wait for permission grant transaction
  const { isSuccess: isPermissionGranted } = useWaitForTransactionReceipt({
    hash: grantPermissionHash,
  });

  // Get encrypted key handle from contract (for premium content ONLY)
  // Only fetch after permission has been granted and ONLY for premium content
  const isPublic = newsletterData
    ? Array.isArray(newsletterData)
      ? newsletterData[5]
      : (newsletterData as any).isPublic
    : false;

  const { data: encryptedKeyHandle, refetch: refetchEncryptedKey } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getDecryptionKey",
    args: [BigInt(postId)],
    query: {
      enabled: Boolean(
        contractInfo?.address && postId && hasAccess && newsletterData && permissionGranted && !isPublic, // ONLY fetch for premium content
      ),
    },
  });

  // Prepare FHE decryption requests (ONLY for premium content)
  const fheRequests = useMemo(() => {
    // Free content doesn't need FHE decryption
    if (isPublic || !encryptedKeyHandle || !contractInfo?.address) return undefined;

    return [
      {
        handle: encryptedKeyHandle as string,
        contractAddress: contractInfo.address,
      },
    ];
  }, [isPublic, encryptedKeyHandle, contractInfo?.address]);

  // FHE Decryption hook
  const {
    decrypt: decryptFHE,
    isDecrypting: isFHEDecrypting,
    results: fheResults,
    error: fheError,
    errorMessage: fheErrorMessage,
  } = useFHEDecrypt({
    instance,
    signTypedData,
    getAddress,
    fhevmDecryptionSignatureStorage: storage!,
    chainId,
    requests: fheRequests,
    autoDecrypt: false,
    retry: { maxRetries: 0, retryDelay: 2000 }, // No auto-retry to avoid multiple signature popups
  });

  const handleDecrypt = useCallback(async () => {
    if (!newsletterData || !contractInfo?.address) return;

    // Prevent multiple simultaneous decrypt attempts
    if (isFHEDecrypting) {
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      // Handle both array and object responses from contract
      const newsletterArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
      const contentCID = newsletterArray[0] as string;

      // Step 1: Fetch encrypted content from IPFS
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!pinataJwt) {
        throw new Error("IPFS configuration missing. Please set NEXT_PUBLIC_PINATA_JWT in environment variables.");
      }

      const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
        ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
        : undefined;
      const ipfsClient = createIPFSClient({ jwt: pinataJwt, gateway: ipfsGateway });
      const encryptedData = await ipfsClient.downloadFromIPFS(contentCID);

      if (isPublic) {
        // For free/public content, IPFS stores plain JSON (no encryption, no bundle format)
        // See cryptletter.ts line 198-211
        const jsonString = new TextDecoder().decode(encryptedData);
        const newsletter = JSON.parse(jsonString) as NewsletterData;
        setDecryptedNewsletter(newsletter);
        setFetchError(null);
        setIsFetching(false);
        return;
      }

      // Step 2: For premium content, grant FHE permission first
      // Skip permission granting if user is the creator (they already have permission from publish)
      const newsletterCreator = newsletterArray[6] as string;
      const isCreator = userAddress?.toLowerCase() === newsletterCreator?.toLowerCase();

      if (!permissionGranted && !isCreator && contractInfo.abi) {
        // Grant permission to decrypt (only for non-creators)
        grantPermission({
          address: contractInfo.address as `0x${string}`,
          abi: contractInfo.abi,
          functionName: "grantDecryptionPermission",
          args: [BigInt(postId)],
        });
        // The flow will continue automatically via useEffect when permission is granted
        // Keep isFetching = true so auto-continuation can work
        return;
      }

      // Step 2: For premium content, grant FHE permission first
      // Note: Creator permission is auto-granted by useEffect above (line 102-117)
      // Step 3: After permission is granted, decrypt the FHE-encrypted AES key
      if (!fheRequests || fheRequests.length === 0) {
        throw new Error("Cannot decrypt: No FHE requests available. Please try granting permission first.");
      }

      // Trigger FHE decryption
      await decryptFHE();

      // Wait for FHE decryption to complete
      // The result will be available in fheResults
    } catch (error) {
      console.error("Decryption error:", error);
      setFetchError(error instanceof Error ? error.message : "Failed to decrypt content. Please try again.");
      setIsFetching(false);
    }
  }, [
    newsletterData,
    contractInfo,
    fheRequests,
    decryptFHE,
    permissionGranted,
    grantPermission,
    postId,
    refetchEncryptedKey,
    userAddress,
    isFHEDecrypting,
    isPublic,
  ]);

  // Handle FHE decryption completion
  const handleFHEDecryptionComplete = useCallback(async () => {
    if (!newsletterData || !fheResults || Object.keys(fheResults).length === 0) return;

    try {
      setIsFetching(true);

      // Get the decrypted AES key from FHE results
      const encryptedKeyHandleStr = encryptedKeyHandle as string;

      // Try to find the decrypted value - it might be stored with a different key format
      let decryptedKeyValue = fheResults[encryptedKeyHandleStr];

      // If not found, try the first available result (there should only be one)
      if (!decryptedKeyValue && Object.keys(fheResults).length > 0) {
        const firstKey = Object.keys(fheResults)[0];
        decryptedKeyValue = fheResults[firstKey];
      }

      if (!decryptedKeyValue) {
        console.error("❌ Failed to find decrypted value in results:", {
          handle: encryptedKeyHandleStr,
          availableKeys: Object.keys(fheResults),
          results: fheResults,
        });
        throw new Error("Failed to decrypt AES key");
      }

      // Convert FHE output to AES key (bigint/string to Uint8Array)
      const aesKeyHex =
        typeof decryptedKeyValue === "bigint"
          ? "0x" + decryptedKeyValue.toString(16).padStart(64, "0")
          : decryptedKeyValue.toString();

      const decryptedAesKey = fheOutputToAESKey(aesKeyHex);
      setAesKey(decryptedAesKey); // Store AES key for image decryption

      // Step 3: Fetch encrypted content from IPFS
      const newsletterArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
      const contentCID = newsletterArray[0] as string;

      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!pinataJwt) {
        throw new Error("IPFS configuration missing");
      }

      const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
        ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
        : undefined;
      const ipfsClient = createIPFSClient({ jwt: pinataJwt, gateway: ipfsGateway });
      const encryptedData = await ipfsClient.downloadFromIPFS(contentCID);

      // Deserialize the encrypted bundle
      const bundle = deserializeBundle(new TextDecoder().decode(encryptedData));

      // Step 4: Decrypt content with AES key
      const newsletter = await decryptContent(bundle, decryptedAesKey);
      setDecryptedNewsletter(newsletter);
      setFetchError(null);
    } catch (error) {
      console.error("AES decryption error:", error);
      setFetchError(error instanceof Error ? error.message : "Failed to decrypt content");
    } finally {
      setIsFetching(false);
    }
  }, [newsletterData, fheResults, encryptedKeyHandle]);

  // Auto-trigger AES decryption when FHE results are available (ONLY for premium content)
  useEffect(() => {
    if (!isPublic && fheResults && Object.keys(fheResults).length > 0 && !decryptedNewsletter && !fetchError) {
      handleFHEDecryptionComplete();
    }
  }, [isPublic, fheResults, decryptedNewsletter, fetchError, handleFHEDecryptionComplete]);

  // Track when permission is granted successfully and continue decryption
  useEffect(() => {
    if (isPermissionGranted && !permissionGranted) {
      setPermissionGranted(true);
      refetchEncryptedKey();
    }
  }, [isPermissionGranted, permissionGranted, refetchEncryptedKey]);

  // Auto-continue decryption after permission is granted and key is fetched (ONLY for premium content)
  useEffect(() => {
    if (isPublic) return; // Skip FHE decryption for free content

    const hasFheResults = fheResults && Object.keys(fheResults).length > 0;
    if (
      permissionGranted &&
      encryptedKeyHandle &&
      fheRequests &&
      fheRequests.length > 0 &&
      !decryptedNewsletter &&
      isFetching &&
      !hasFheResults &&
      !isFHEDecrypting
    ) {
      // Continue with FHE decryption only if not already decrypted/decrypting
      decryptFHE();
    }
  }, [
    isPublic,
    permissionGranted,
    encryptedKeyHandle,
    fheRequests,
    decryptedNewsletter,
    isFetching,
    decryptFHE,
    fheResults,
    isFHEDecrypting,
  ]);

  if (!newsletterData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="skeleton h-8 w-3/4 mb-4"></div>
            <div className="skeleton h-4 w-full mb-2"></div>
            <div className="skeleton h-64 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle both array and object responses from contract
  const newsletterArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
  const contentCID = newsletterArray[0] as string;
  const title = newsletterArray[2] as string;
  const preview = newsletterArray[3] as string;
  const publishedAt = newsletterArray[4] as bigint;
  const creatorAddress = newsletterArray[6] as string;

  const creatorArray = creatorData
    ? Array.isArray(creatorData)
      ? creatorData
      : Object.values(creatorData as any)
    : null;
  const creatorName = creatorArray ? creatorArray[0] : "Unknown Creator";
  const timestamp = Number(publishedAt) * 1000;
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  const canView = Boolean(hasAccess);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/creator/${creatorAddress}`} className="btn btn-ghost btn-sm mb-4">
          ← Back to {creatorName}
        </Link>

        <h1 className="text-4xl font-bold mb-4">{title}</h1>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/creator/${creatorAddress}`} className="font-semibold hover:underline">
              {creatorName}
            </Link>
            <span className="text-sm opacity-70">{timeAgo}</span>
            {isPublic && <div className="badge badge-success">Free</div>}
            {!isPublic && canView && <div className="badge badge-info">Premium</div>}
          </div>
          <Address address={creatorAddress} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-6 md:p-8">
          {!canView ? (
            // No access - show preview only
            <div>
              <div className="prose max-w-none mb-6">
                <p className="text-lg leading-relaxed">{preview}</p>
              </div>

              <div className="divider"></div>

              <div className="alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-bold">Subscribe to read the full content</h3>
                  <div className="text-sm">This is a premium newsletter. Subscribe to {creatorName} to unlock.</div>
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <Link href={`/subscribe/${creatorAddress}`}>
                  <button className="btn btn-primary">Subscribe Now</button>
                </Link>
              </div>
            </div>
          ) : (
            // Has access - show full content
            <div>
              {!decryptedNewsletter ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-xl font-semibold mb-2">Encrypted Content</h3>
                  <p className="opacity-70 mb-6">Click the button below to decrypt and view the full newsletter</p>

                  {(fetchError || fheError) && (
                    <div className="alert alert-error mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-current shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{fetchError || fheErrorMessage || fheError}</span>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleDecrypt}
                    disabled={isFetching || isFHEDecrypting || isGrantingPermission}
                  >
                    {isGrantingPermission ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Granting permission...
                      </>
                    ) : isFetching || isFHEDecrypting ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        {isFHEDecrypting ? "Decrypting FHE key..." : "Fetching content..."}
                      </>
                    ) : (
                      "Decrypt & View Content"
                    )}
                  </button>

                  <div className="mt-6 text-sm opacity-60">
                    <p>IPFS CID: {contentCID}</p>
                    {isPublic && <p className="text-info">This is a free newsletter</p>}
                    {!isPublic && <p className="text-warning">This is premium encrypted content</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <NewsletterViewer content={decryptedNewsletter.content} aesKey={aesKey || undefined} />

                  <div className="divider"></div>

                  <div className="flex justify-between items-center text-sm opacity-60">
                    <div>
                      <p>IPFS CID: {contentCID}</p>
                      <p>Author: {decryptedNewsletter.author}</p>
                      {decryptedNewsletter.metadata && (
                        <p>Tags: {Object.keys(decryptedNewsletter.metadata).join(", ")}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
