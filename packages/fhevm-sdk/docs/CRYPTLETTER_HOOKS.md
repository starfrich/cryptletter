# Cryptletter React Hooks Guide

Complete guide to using Cryptletter React hooks for encrypted newsletter applications with FHEVM.

## Overview

Three specialized hooks for building encrypted newsletter applications:

- **`useCryptletter`**: Main hook for all Cryptletter operations
- **`useCreatorProfile`**: Creator profile management with auto-refresh
- **`useSubscriptions`**: Subscription tracking with auto-refresh

### Quick Start

```typescript
import { useCryptletter, useCreatorProfile, useSubscriptions } from "@fhevm-sdk/react";

const config = {
  contractAddress: "0x...",
  contractABI: [...],
  ipfsJWT: "your-ipfs-jwt",
  provider: ethersProvider,
  signer: ethersSigner,
};
```

---

## useCryptletter Hook

Main hook providing comprehensive access to all Cryptletter functionality.

### Configuration

```typescript
interface UseCryptletterConfig {
  contractAddress: string;
  contractABI: any[];
  ipfsJWT: string;
  ipfsGateway?: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}
```

### Return Value

```typescript
interface UseCryptletterReturn {
  // Creator functions
  registerAsCreator: (name: string, bio: string, monthlyPriceWei: bigint) => Promise<string>;
  updateProfile: (name: string, bio: string) => Promise<string>;
  updatePrice: (newPriceWei: bigint) => Promise<string>;
  publishNewsletter: (options: PublishOptions) => Promise<PublishResult>;

  // Subscriber functions
  subscribe: (creatorAddress: string, paymentWei: bigint) => Promise<string>;
  renewSubscription: (creatorAddress: string, paymentWei: bigint) => Promise<string>;
  cancelSubscription: (creatorAddress: string) => Promise<string>;

  // Content access
  getEncryptedKey: (postId: number) => Promise<string>;
  decryptNewsletterContent: (postId: number, decryptedAESKey: string) => Promise<FetchResult>;
  checkAccess: (postId: number, userAddress?: string) => Promise<boolean>;

  // Queries
  getCreator: (creatorAddress: string) => Promise<CreatorProfile>;
  getSubscriptionStatus: (subscriberAddress: string, creatorAddress: string) => Promise<SubscriptionStatus>;
  listNewsletters: (creatorAddress: string, limit?: number) => Promise<NewsletterMetadata[]>;
  getNewsletterMetadata: (postId: number) => Promise<NewsletterMetadata>;

  // Status
  isPublishing: boolean;
  isFetching: boolean;
  isLoading: boolean;
  error: Error | null;
}
```

### Basic Usage

```typescript
function NewsletterApp() {
  const { publishNewsletter, subscribe, isPublishing, error } = useCryptletter(config);

  const handlePublish = async () => {
    const result = await publishNewsletter({
      title: "My Newsletter",
      content: "Newsletter content...",
      author: "Alice",
      isPublic: false,
    });
    console.log("Published:", result.postId);
  };

  return (
    <div>
      {isPublishing && <p>Publishing...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={handlePublish}>Publish</button>
    </div>
  );
}
```

### Creator Operations

```typescript
// Register as creator
const txHash = await registerAsCreator(
  "Alice's Newsletter",
  "Tech and Web3 insights",
  BigInt("10000000000000000") // 0.01 ETH
);

// Update profile
await updateProfile("New Name", "Updated bio");

// Update pricing
await updatePrice(BigInt("20000000000000000")); // 0.02 ETH

// Publish newsletter
const result = await publishNewsletter({
  title: "Weekly Update #5",
  content: JSON.stringify(editorContent),
  author: "Alice",
  preview: "This week's highlights...",
  isPublic: false,
});
```

### Subscriber Operations

```typescript
// Subscribe to creator
const creator = await getCreator(creatorAddress);
const txHash = await subscribe(creatorAddress, creator.monthlyPrice);

// Renew subscription
await renewSubscription(creatorAddress, creator.monthlyPrice);

// Cancel subscription
await cancelSubscription(creatorAddress);
```

### Content Access

```typescript
// Check access
const hasAccess = await checkAccess(postId, userAddress);

// Decrypt newsletter
const encryptedKey = await getEncryptedKey(postId);
const decryptedAESKey = await decryptFHEKey(encryptedKey); // Use FHE instance
const newsletter = await decryptNewsletterContent(postId, decryptedAESKey);
```

---

## useCreatorProfile Hook

Specialized hook for managing creator profiles with auto-refresh.

### Configuration

```typescript
interface UseCreatorProfileConfig extends UseCryptletterConfig {
  creatorAddress?: string;
  autoRefresh?: boolean;        // default: false
  refreshInterval?: number;     // default: 30000ms
}
```

### Return Value

```typescript
interface UseCreatorProfileReturn {
  profile: CreatorProfile | null;
  isLoading: boolean;
  error: Error | null;

  refreshProfile: () => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<string>;
  updatePrice: (newPriceWei: bigint) => Promise<string>;
  registerAsCreator: (name: string, bio: string, monthlyPriceWei: bigint) => Promise<string>;

  monthlyPriceEth: string | null;
  subscriberCount: number;
  isRegistered: boolean;
}
```

### Usage

```typescript
function CreatorDashboard({ creatorAddress }) {
  const {
    profile,
    updateProfile,
    monthlyPriceEth,
    subscriberCount,
  } = useCreatorProfile({
    ...config,
    creatorAddress,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>{profile?.bio}</p>
      <p>Monthly: {monthlyPriceEth} ETH</p>
      <p>Subscribers: {subscriberCount}</p>
    </div>
  );
}
```

---

## useSubscriptions Hook

Specialized hook for managing subscriptions with tracking.

### Configuration

```typescript
interface UseSubscriptionsConfig extends UseCryptletterConfig {
  subscriberAddress?: string;
  autoRefresh?: boolean;        // default: false
  refreshInterval?: number;     // default: 60000ms
}
```

### Return Value

```typescript
interface UseSubscriptionsReturn {
  subscribe: (creatorAddress: string) => Promise<string>;
  renewSubscription: (creatorAddress: string) => Promise<string>;
  cancelSubscription: (creatorAddress: string) => Promise<string>;

  subscriptions: Map<string, SubscriptionInfo>;
  activeSubscriptions: SubscriptionInfo[];
  expiringSubscriptions: SubscriptionInfo[];  // Expiring within 7 days

  isLoading: boolean;
  error: Error | null;

  refreshAll: () => Promise<void>;
  trackCreator: (creatorAddress: string) => Promise<void>;
  untrackCreator: (creatorAddress: string) => void;
}
```

### Usage

```typescript
function SubscriptionManager({ userAddress }) {
  const {
    subscribe,
    renewSubscription,
    activeSubscriptions,
    expiringSubscriptions,
  } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
  });

  return (
    <div>
      <h2>Active Subscriptions</h2>
      {activeSubscriptions.map((sub) => (
        <div key={sub.creatorAddress}>
          <h3>{sub.creatorProfile?.name}</h3>
          <p>Expires in {sub.status.daysRemaining} days</p>
          {sub.isExpiringSoon && (
            <button onClick={() => renewSubscription(sub.creatorAddress)}>
              Renew
            </button>
          )}
        </div>
      ))}

      {expiringSubscriptions.length > 0 && (
        <div className="alert">
          ⚠️ {expiringSubscriptions.length} subscriptions expiring soon!
        </div>
      )}
    </div>
  );
}
```

---

## Complete Examples

### Creator Application

```typescript
function CreatorApp() {
  const creatorAddress = useWalletAddress();
  const { profile, monthlyPriceEth, subscriberCount } = useCreatorProfile({
    ...config,
    creatorAddress,
    autoRefresh: true,
  });

  const { publishNewsletter, isPublishing } = useCryptletter(config);

  return (
    <div>
      <header>
        <h1>{profile?.name}</h1>
        <p>{subscriberCount} subscribers • {monthlyPriceEth} ETH/month</p>
      </header>
      <NewsletterEditor onPublish={publishNewsletter} />
    </div>
  );
}
```

### Subscriber Application

```typescript
function SubscriberApp() {
  const userAddress = useWalletAddress();
  const { activeSubscriptions } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
  });

  const { decryptNewsletterContent } = useCryptletter(config);

  return (
    <div>
      <h1>My Subscriptions</h1>
      {activeSubscriptions.map((sub) => (
        <CreatorFeed
          key={sub.creatorAddress}
          creatorAddress={sub.creatorAddress}
          onRead={decryptNewsletterContent}
        />
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. Configuration Management

```typescript
const useCryptletterConfig = () => {
  const { provider, signer } = useEthers();
  return {
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    contractABI: CryptletterABI,
    ipfsJWT: process.env.NEXT_PUBLIC_IPFS_JWT!,
    provider,
    signer,
  };
};
```

### 2. Error Handling

```typescript
const { publishNewsletter, error } = useCryptletter(config);

if (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  return <ErrorDisplay suggestion={suggestion} />;
}
```

### 3. Loading States

```typescript
const { listNewsletters, isLoading } = useCryptletter(config);

useEffect(() => {
  async function load() {
    const newsletters = await listNewsletters(creatorAddress);
    setNewsletters(newsletters);
  }
  load();
}, [creatorAddress]);

if (isLoading) return <LoadingSpinner />;
```

### 4. Price Formatting

```typescript
function weiToEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

function ethToWei(eth: string): bigint {
  return BigInt(parseFloat(eth) * 1e18);
}
```

---

## Resources

- [Cryptletter Contract Documentation](../contracts/)
- [IPFS Operations Guide](./UTILS.md#ipfs-operations)
- [Content Encryption Guide](./UTILS.md#content-encryption)
- [FHEVM Documentation](https://docs.zama.ai/protocol/)
