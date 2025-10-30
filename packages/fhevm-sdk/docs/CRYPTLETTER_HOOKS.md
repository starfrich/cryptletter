# Cryptletter React Hooks Guide

Complete guide to using Cryptletter React hooks for building encrypted newsletter applications with FHEVM.

## Table of Contents

1. [Overview](#overview)
2. [useCryptletter Hook](#usecryptletter-hook)
3. [useCreatorProfile Hook](#usecreatorprofile-hook)
4. [useSubscriptions Hook](#usesubscriptions-hook)
5. [Complete Examples](#complete-examples)
6. [Best Practices](#best-practices)

## Overview

The Cryptletter SDK provides three specialized React hooks for building encrypted newsletter applications:

- **`useCryptletter`**: Main hook providing all Cryptletter operations (creator, subscriber, content access)
- **`useCreatorProfile`**: Focused hook for managing creator profiles with auto-refresh
- **`useSubscriptions`**: Focused hook for managing subscriptions with tracking and auto-refresh

All hooks integrate seamlessly with FHEVM for end-to-end encryption of newsletter content.

### Quick Start

```typescript
import {
  useCryptletter,
  useCreatorProfile,
  useSubscriptions,
} from "@fhevm-sdk/react";

// Basic setup
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

The main hook providing comprehensive access to all Cryptletter functionality.

### Configuration

```typescript
interface UseCryptletterConfig {
  contractAddress: string;      // Cryptletter contract address
  contractABI: any[];           // Contract ABI
  ipfsJWT: string;              // IPFS JWT token for authentication
  ipfsGateway?: string;         // Optional custom IPFS gateway
  provider: ethers.Provider;    // Ethers provider
  signer?: ethers.Signer;       // Optional ethers signer (required for write operations)
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
  getSubscriptionStatus: (
    subscriberAddress: string,
    creatorAddress: string
  ) => Promise<SubscriptionStatus>;
  listNewsletters: (creatorAddress: string, limit?: number) => Promise<NewsletterMetadata[]>;
  getNewsletterMetadata: (postId: number) => Promise<NewsletterMetadata>;
  getCreators: (offset?: number, limit?: number) => Promise<string[]>;
  getCreatorCount: () => Promise<number>;

  // Status
  isPublishing: boolean;
  isFetching: boolean;
  isLoading: boolean;
  error: Error | null;

  // SDK instance (for advanced usage)
  sdk: CryptletterCore | null;
}
```

### Basic Usage

```typescript
import { useCryptletter } from "@fhevm-sdk/react";

function NewsletterApp() {
  const {
    publishNewsletter,
    subscribe,
    listNewsletters,
    isPublishing,
    error,
  } = useCryptletter({
    contractAddress: "0x...",
    contractABI: [...],
    ipfsJWT: "your-jwt",
    provider,
    signer,
  });

  const handlePublish = async () => {
    try {
      const result = await publishNewsletter({
        title: "My Newsletter",
        content: "Newsletter content...",
        author: "Alice",
        isPublic: false,
      });
      console.log("Published:", result);
    } catch (err) {
      console.error("Failed to publish:", err);
    }
  };

  return (
    <div>
      {isPublishing && <p>Publishing...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={handlePublish}>Publish Newsletter</button>
    </div>
  );
}
```

### Creator Operations

#### Register as Creator

```typescript
const { registerAsCreator, isLoading } = useCryptletter(config);

async function handleRegister() {
  try {
    // Price in wei (0.01 ETH = 10000000000000000 wei)
    const monthlyPrice = BigInt("10000000000000000");

    const txHash = await registerAsCreator(
      "Alice's Newsletter",
      "Tech and Web3 insights",
      monthlyPrice
    );

    console.log("Registered! Transaction:", txHash);
  } catch (error) {
    console.error("Registration failed:", error);
  }
}
```

#### Update Profile

```typescript
const { updateProfile } = useCryptletter(config);

async function handleUpdateProfile() {
  try {
    const txHash = await updateProfile(
      "Alice's Tech Newsletter",
      "Updated bio with more details"
    );
    console.log("Profile updated:", txHash);
  } catch (error) {
    console.error("Update failed:", error);
  }
}
```

#### Update Pricing

```typescript
const { updatePrice } = useCryptletter(config);

async function handleUpdatePrice() {
  try {
    const newPrice = BigInt("20000000000000000"); // 0.02 ETH
    const txHash = await updatePrice(newPrice);
    console.log("Price updated:", txHash);
  } catch (error) {
    console.error("Price update failed:", error);
  }
}
```

#### Publish Newsletter

```typescript
const { publishNewsletter, isPublishing } = useCryptletter(config);

async function handlePublish(content: any) {
  try {
    const result = await publishNewsletter({
      title: "Weekly Update #5",
      content: JSON.stringify(content), // TipTap editor content
      author: "Alice",
      preview: "This week's highlights...",
      isPublic: false, // Subscriber-only content
    });

    console.log("Published!");
    console.log("IPFS CID:", result.ipfsCid);
    console.log("Post ID:", result.postId);
    console.log("Transaction:", result.txHash);
  } catch (error) {
    console.error("Publish failed:", error);
  }
}
```

### Subscriber Operations

#### Subscribe to Creator

```typescript
const { subscribe, getCreator, isLoading } = useCryptletter(config);

async function handleSubscribe(creatorAddress: string) {
  try {
    // Get creator info to know the price
    const creator = await getCreator(creatorAddress);

    // Subscribe with the creator's monthly price
    const txHash = await subscribe(creatorAddress, creator.monthlyPrice);

    console.log("Subscribed! Transaction:", txHash);
  } catch (error) {
    console.error("Subscription failed:", error);
  }
}
```

#### Renew Subscription

```typescript
const { renewSubscription, getCreator } = useCryptletter(config);

async function handleRenew(creatorAddress: string) {
  try {
    const creator = await getCreator(creatorAddress);
    const txHash = await renewSubscription(creatorAddress, creator.monthlyPrice);
    console.log("Subscription renewed:", txHash);
  } catch (error) {
    console.error("Renewal failed:", error);
  }
}
```

#### Cancel Subscription

```typescript
const { cancelSubscription } = useCryptletter(config);

async function handleCancel(creatorAddress: string) {
  try {
    const txHash = await cancelSubscription(creatorAddress);
    console.log("Subscription cancelled:", txHash);
  } catch (error) {
    console.error("Cancellation failed:", error);
  }
}
```

### Content Access

#### Check Access Rights

```typescript
const { checkAccess } = useCryptletter(config);

async function verifyAccess(postId: number, userAddress: string) {
  try {
    const hasAccess = await checkAccess(postId, userAddress);
    if (hasAccess) {
      console.log("User has access to this newsletter");
    } else {
      console.log("User needs to subscribe");
    }
  } catch (error) {
    console.error("Access check failed:", error);
  }
}
```

#### Decrypt Newsletter Content

```typescript
const {
  getEncryptedKey,
  decryptNewsletterContent,
  checkAccess,
  isFetching,
} = useCryptletter(config);

async function readNewsletter(postId: number, userAddress: string) {
  try {
    // 1. Check if user has access
    const hasAccess = await checkAccess(postId, userAddress);
    if (!hasAccess) {
      throw new Error("No access to this newsletter");
    }

    // 2. Get encrypted key (FHE encrypted AES key)
    const encryptedKey = await getEncryptedKey(postId);

    // 3. Decrypt the key using FHE (this happens via the FHEVM instance)
    // You need to call your contract's decrypt function or use FHE decryption
    const decryptedAESKey = await decryptFHEKey(encryptedKey); // Implement this

    // 4. Decrypt newsletter content
    const newsletter = await decryptNewsletterContent(postId, decryptedAESKey);

    console.log("Newsletter:", newsletter.data);
    console.log("Title:", newsletter.data.title);
    console.log("Content:", newsletter.data.content);
  } catch (error) {
    console.error("Failed to read newsletter:", error);
  }
}
```

### Query Operations

#### Get Creator Profile

```typescript
const { getCreator } = useCryptletter(config);

async function fetchCreatorProfile(creatorAddress: string) {
  try {
    const profile = await getCreator(creatorAddress);

    console.log("Name:", profile.name);
    console.log("Bio:", profile.bio);
    console.log("Monthly Price:", profile.monthlyPrice);
    console.log("Subscribers:", profile.subscriberCount);
    console.log("Is Active:", profile.isActive);
  } catch (error) {
    console.error("Failed to fetch profile:", error);
  }
}
```

#### Check Subscription Status

```typescript
const { getSubscriptionStatus } = useCryptletter(config);

async function checkStatus(subscriberAddress: string, creatorAddress: string) {
  try {
    const status = await getSubscriptionStatus(subscriberAddress, creatorAddress);

    console.log("Is Active:", status.isActive);
    console.log("Start Date:", new Date(status.startDate * 1000));
    console.log("End Date:", new Date(status.endDate * 1000));
    console.log("Days Remaining:", status.daysRemaining);
  } catch (error) {
    console.error("Failed to check status:", error);
  }
}
```

#### List Newsletters

```typescript
const { listNewsletters } = useCryptletter(config);

async function fetchNewsletters(creatorAddress: string) {
  try {
    const newsletters = await listNewsletters(creatorAddress, 10); // Last 10

    newsletters.forEach((newsletter) => {
      console.log("Title:", newsletter.title);
      console.log("Preview:", newsletter.preview);
      console.log("Published:", new Date(newsletter.timestamp * 1000));
      console.log("Is Public:", newsletter.isPublic);
      console.log("---");
    });
  } catch (error) {
    console.error("Failed to fetch newsletters:", error);
  }
}
```

#### Get All Creators

```typescript
const { getCreators, getCreatorCount } = useCryptletter(config);

async function fetchAllCreators() {
  try {
    const count = await getCreatorCount();
    console.log(`Total creators: ${count}`);

    // Fetch all creators (paginated)
    const creators = await getCreators(0, count);
    console.log("Creator addresses:", creators);
  } catch (error) {
    console.error("Failed to fetch creators:", error);
  }
}
```

---

## useCreatorProfile Hook

Specialized hook for managing creator profiles with auto-refresh capabilities.

### Configuration

```typescript
interface UseCreatorProfileConfig extends UseCryptletterConfig {
  creatorAddress?: string;     // Address of the creator to track
  autoRefresh?: boolean;        // Enable auto-refresh (default: false)
  refreshInterval?: number;     // Refresh interval in ms (default: 30000)
}
```

### Return Value

```typescript
interface UseCreatorProfileReturn {
  // Profile data
  profile: CreatorProfile | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshProfile: () => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<string>;
  updatePrice: (newPriceWei: bigint) => Promise<string>;
  registerAsCreator: (
    name: string,
    bio: string,
    monthlyPriceWei: bigint
  ) => Promise<string>;

  // Computed stats
  monthlyPriceEth: string | null;  // Price in ETH (formatted)
  subscriberCount: number;
  isRegistered: boolean;
}
```

### Basic Usage

```typescript
import { useCreatorProfile } from "@fhevm-sdk/react";

function CreatorDashboard({ creatorAddress }: { creatorAddress: string }) {
  const {
    profile,
    updateProfile,
    updatePrice,
    monthlyPriceEth,
    subscriberCount,
    isLoading,
    error,
  } = useCreatorProfile({
    ...config,
    creatorAddress,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  if (isLoading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.bio}</p>
      <p>Monthly Price: {monthlyPriceEth} ETH</p>
      <p>Subscribers: {subscriberCount}</p>
    </div>
  );
}
```

### Update Profile with Auto-Refresh

```typescript
const { updateProfile, refreshProfile } = useCreatorProfile({
  ...config,
  creatorAddress: "0x...",
  autoRefresh: true,
});

async function handleUpdate() {
  try {
    // Update automatically refreshes the profile
    await updateProfile("New Name", "New bio");
    console.log("Profile updated and refreshed!");
  } catch (error) {
    console.error("Update failed:", error);
  }
}

// Manual refresh
async function handleManualRefresh() {
  await refreshProfile();
}
```

### Creator Registration Flow

```typescript
function CreatorRegistrationForm() {
  const {
    registerAsCreator,
    isRegistered,
    isLoading,
  } = useCreatorProfile(config);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [priceEth, setPriceEth] = useState("0.01");

  async function handleRegister() {
    try {
      // Convert ETH to Wei
      const priceWei = BigInt(parseFloat(priceEth) * 1e18);

      await registerAsCreator(name, bio, priceWei);
      console.log("Successfully registered as creator!");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  }

  if (isRegistered) {
    return <div>You are already registered as a creator!</div>;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Creator Name"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio"
      />
      <input
        type="number"
        step="0.001"
        value={priceEth}
        onChange={(e) => setPriceEth(e.target.value)}
        placeholder="Monthly Price (ETH)"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Registering..." : "Register as Creator"}
      </button>
    </form>
  );
}
```

---

## useSubscriptions Hook

Specialized hook for managing subscriptions with tracking and auto-refresh.

### Configuration

```typescript
interface UseSubscriptionsConfig extends UseCryptletterConfig {
  subscriberAddress?: string;     // Address of the subscriber (current user)
  autoRefresh?: boolean;          // Enable auto-refresh (default: false)
  refreshInterval?: number;       // Refresh interval in ms (default: 60000)
}
```

### Return Value

```typescript
interface UseSubscriptionsReturn {
  // Subscription management
  subscribe: (creatorAddress: string) => Promise<string>;
  renewSubscription: (creatorAddress: string) => Promise<string>;
  cancelSubscription: (creatorAddress: string) => Promise<string>;

  // Subscription queries
  getSubscriptionStatus: (creatorAddress: string) => Promise<SubscriptionStatus>;
  checkSubscriptionStatus: (creatorAddress: string) => Promise<void>;

  // Tracked subscriptions
  subscriptions: Map<string, SubscriptionInfo>;
  activeSubscriptions: SubscriptionInfo[];      // Currently active
  expiringSubscriptions: SubscriptionInfo[];    // Expiring within 7 days

  // State
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshAll: () => Promise<void>;
  trackCreator: (creatorAddress: string) => Promise<void>;
  untrackCreator: (creatorAddress: string) => void;
}
```

### Basic Usage

```typescript
import { useSubscriptions } from "@fhevm-sdk/react";

function SubscriptionManager({ userAddress }: { userAddress: string }) {
  const {
    subscribe,
    renewSubscription,
    activeSubscriptions,
    expiringSubscriptions,
    isLoading,
  } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
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
              Renew Subscription
            </button>
          )}
        </div>
      ))}

      {expiringSubscriptions.length > 0 && (
        <div className="alert">
          ⚠️ You have {expiringSubscriptions.length} subscriptions expiring soon!
        </div>
      )}
    </div>
  );
}
```

### Subscribe to Creator

```typescript
const { subscribe, isLoading } = useSubscriptions({
  ...config,
  subscriberAddress: "0x...",
});

async function handleSubscribe(creatorAddress: string) {
  try {
    // Subscribe automatically fetches creator price
    const txHash = await subscribe(creatorAddress);
    console.log("Subscribed! Transaction:", txHash);
  } catch (error) {
    console.error("Subscription failed:", error);
  }
}
```

### Track Multiple Subscriptions

```typescript
const {
  trackCreator,
  untrackCreator,
  subscriptions,
  refreshAll,
} = useSubscriptions({
  ...config,
  subscriberAddress: "0x...",
});

// Track a new creator
async function addTracking(creatorAddress: string) {
  await trackCreator(creatorAddress);
}

// Remove tracking
function removeTracking(creatorAddress: string) {
  untrackCreator(creatorAddress);
}

// Refresh all tracked subscriptions
async function refresh() {
  await refreshAll();
}

// Display tracked subscriptions
function SubscriptionList() {
  return (
    <div>
      {Array.from(subscriptions.values()).map((sub) => (
        <div key={sub.creatorAddress}>
          <h3>{sub.creatorProfile?.name}</h3>
          <p>Status: {sub.status.isActive ? "Active" : "Inactive"}</p>
          <p>Days remaining: {sub.status.daysRemaining}</p>
          <button onClick={() => removeTracking(sub.creatorAddress)}>
            Untrack
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Expiring Subscriptions Alert

```typescript
function ExpiringSubscriptionsAlert() {
  const { expiringSubscriptions, renewSubscription } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
  });

  if (expiringSubscriptions.length === 0) return null;

  return (
    <div className="alert">
      <h3>⚠️ Subscriptions Expiring Soon</h3>
      {expiringSubscriptions.map((sub) => (
        <div key={sub.creatorAddress}>
          <p>
            {sub.creatorProfile?.name} expires in {sub.status.daysRemaining} days
          </p>
          <button onClick={() => renewSubscription(sub.creatorAddress)}>
            Renew Now
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Complete Examples

### Creator Application

```typescript
import { useCreatorProfile, useCryptletter } from "@fhevm-sdk/react";

function CreatorApp() {
  const creatorAddress = useWalletAddress(); // Your wallet hook

  const {
    profile,
    updateProfile,
    updatePrice,
    monthlyPriceEth,
    subscriberCount,
    isLoading,
  } = useCreatorProfile({
    ...config,
    creatorAddress,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const { publishNewsletter, isPublishing } = useCryptletter(config);

  async function handlePublish(newsletterData: any) {
    try {
      const result = await publishNewsletter({
        title: newsletterData.title,
        content: JSON.stringify(newsletterData.content),
        author: profile?.name || "Anonymous",
        preview: newsletterData.preview,
        isPublic: false,
      });

      console.log("Newsletter published:", result.postId);
    } catch (error) {
      console.error("Publish failed:", error);
    }
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <header>
        <h1>{profile?.name}</h1>
        <p>{subscriberCount} subscribers</p>
        <p>Monthly: {monthlyPriceEth} ETH</p>
      </header>

      <NewsletterEditor onPublish={handlePublish} />

      {isPublishing && <div>Publishing...</div>}
    </div>
  );
}
```

### Subscriber Application

```typescript
import { useSubscriptions, useCryptletter } from "@fhevm-sdk/react";

function SubscriberApp() {
  const userAddress = useWalletAddress();

  const {
    subscribe,
    activeSubscriptions,
    expiringSubscriptions,
  } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const { listNewsletters, decryptNewsletterContent } = useCryptletter(config);

  async function readNewsletter(postId: number) {
    // Implementation here
  }

  return (
    <div>
      <h1>My Subscriptions</h1>

      {expiringSubscriptions.length > 0 && (
        <ExpiringSubscriptionsAlert />
      )}

      {activeSubscriptions.map((sub) => (
        <CreatorFeed
          key={sub.creatorAddress}
          creatorAddress={sub.creatorAddress}
          creatorName={sub.creatorProfile?.name}
          onRead={readNewsletter}
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
// Create a centralized config
const useCryptletterConfig = () => {
  const { provider, signer } = useEthers(); // Or your wallet hook

  return {
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    contractABI: CryptletterABI,
    ipfsJWT: process.env.NEXT_PUBLIC_IPFS_JWT!,
    ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    provider,
    signer,
  };
};

// Use in components
function MyComponent() {
  const config = useCryptletterConfig();
  const cryptletter = useCryptletter(config);
}
```

### 2. Error Handling

```typescript
function NewsletterComponent() {
  const { publishNewsletter, error } = useCryptletter(config);

  async function handlePublish(data: any) {
    try {
      const result = await publishNewsletter(data);
      toast.success("Newsletter published!");
    } catch (err) {
      // Error is also available in hook's error state
      console.error("Publish failed:", err);
      toast.error(error?.message || "Unknown error");
    }
  }
}
```

### 3. Loading States

```typescript
function NewsletterList({ creatorAddress }: { creatorAddress: string }) {
  const [newsletters, setNewsletters] = useState<NewsletterMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const { listNewsletters } = useCryptletter(config);

  useEffect(() => {
    async function fetchNewsletters() {
      try {
        setLoading(true);
        const data = await listNewsletters(creatorAddress);
        setNewsletters(data);
      } catch (error) {
        console.error("Failed to fetch newsletters:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNewsletters();
  }, [creatorAddress]);

  if (loading) return <LoadingSpinner />;

  return <NewsletterGrid newsletters={newsletters} />;
}
```

### 4. Auto-Refresh Configuration

```typescript
// Use auto-refresh for real-time data
const profile = useCreatorProfile({
  ...config,
  creatorAddress,
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds for profiles
});

const subscriptions = useSubscriptions({
  ...config,
  subscriberAddress: userAddress,
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute for subscriptions
});
```

### 5. Optimistic Updates

```typescript
function SubscriptionButton({ creatorAddress }: { creatorAddress: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { subscribe } = useSubscriptions(config);

  async function handleSubscribe() {
    // Optimistic update
    setIsSubscribed(true);

    try {
      await subscribe(creatorAddress);
      toast.success("Subscribed successfully!");
    } catch (error) {
      // Revert on error
      setIsSubscribed(false);
      toast.error("Subscription failed");
    }
  }

  return (
    <button onClick={handleSubscribe} disabled={isSubscribed}>
      {isSubscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}
```

### 6. Price Formatting

```typescript
// Helper function
function weiToEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

function ethToWei(eth: string): bigint {
  return BigInt(parseFloat(eth) * 1e18);
}

// Usage
const { updatePrice } = useCreatorProfile(config);

async function handlePriceChange(newPriceEth: string) {
  const priceWei = ethToWei(newPriceEth);
  await updatePrice(priceWei);
}
```

### 7. Subscription Tracking

```typescript
// Track subscriptions on mount
function SubscriptionTracker({ creatorAddresses }: { creatorAddresses: string[] }) {
  const { trackCreator, subscriptions } = useSubscriptions({
    ...config,
    subscriberAddress: userAddress,
    autoRefresh: true,
  });

  useEffect(() => {
    // Track all creators on mount
    creatorAddresses.forEach((addr) => {
      trackCreator(addr);
    });
  }, [creatorAddresses]);

  return (
    <div>
      {Array.from(subscriptions.values()).map((sub) => (
        <SubscriptionCard key={sub.creatorAddress} subscription={sub} />
      ))}
    </div>
  );
}
```

---

## Resources

- [Cryptletter Contract Documentation](../contracts/)
- [IPFS Operations Guide](./UTILS.md#ipfs-operations)
- [Content Encryption Guide](./UTILS.md#content-encryption)
- [FHEVM Documentation](https://docs.zama.ai/protocol/)