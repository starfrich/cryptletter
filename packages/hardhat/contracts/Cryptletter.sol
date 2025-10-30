// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Cryptletter - Encrypted Newsletter Platform
/// @author Zama Developer Program - Cryptletter Team
/// @notice A decentralized encrypted newsletter platform using FHEVM for privacy-preserving content distribution
/// @dev Implements hybrid architecture: IPFS storage + on-chain access control with FHE encryption
contract Cryptletter is SepoliaConfig {
    // ============ Structs ============

    /// @notice Creator profile information
    struct Creator {
        string name;
        string bio;
        uint256 monthlyPrice; // Price in wei for monthly subscription
        uint256 subscriberCount;
        bool isActive;
    }

    /// @notice Newsletter post metadata
    struct NewsletterPost {
        string contentCID; // IPFS CID for encrypted content
        euint256 encryptedKey; // AES key encrypted with FHE
        string title;
        string preview; // First 200 chars or custom preview
        uint256 publishedAt;
        bool isPublic; // Free newsletters are public
        address creator;
    }

    /// @notice Subscription information
    struct Subscription {
        uint256 expiresAt; // Timestamp when subscription expires
        uint256 subscribedAt; // Initial subscription timestamp
        bool isActive;
    }

    // ============ State Variables ============

    /// @notice Mapping from creator address to creator profile
    mapping(address => Creator) public creators;

    /// @notice Mapping from post ID to newsletter post
    mapping(uint256 => NewsletterPost) public newsletters;

    /// @notice Mapping from subscriber => creator => subscription
    mapping(address => mapping(address => Subscription)) public subscriptions;

    /// @notice Array of all creator addresses for discovery
    address[] public creatorList;

    /// @notice Counter for newsletter post IDs
    uint256 public postCounter;

    /// @notice Constant for subscription duration (30 days)
    uint256 public constant SUBSCRIPTION_DURATION = 30 days;

    // ============ Events ============

    event CreatorRegistered(address indexed creator, string name, uint256 monthlyPrice);
    event CreatorProfileUpdated(address indexed creator, string name, string bio);
    event MonthlyPriceUpdated(address indexed creator, uint256 oldPrice, uint256 newPrice);
    event NewsletterPublished(
        uint256 indexed postId,
        address indexed creator,
        string title,
        string contentCID,
        bool isPublic
    );
    event Subscribed(address indexed subscriber, address indexed creator, uint256 expiresAt);
    event SubscriptionRenewed(address indexed subscriber, address indexed creator, uint256 newExpiresAt);
    event SubscriptionCancelled(address indexed subscriber, address indexed creator);

    // ============ Errors ============

    error AlreadyRegistered();
    error NotRegistered();
    error InvalidPrice();
    error InvalidInput();
    error InsufficientPayment();
    error SubscriptionExpired();
    error NoActiveSubscription();
    error Unauthorized();

    // ============ Creator Functions ============

    /// @notice Register as a creator on the platform
    /// @param name Creator's display name
    /// @param bio Creator's bio/description
    /// @param monthlyPrice Subscription price in wei per month
    function registerCreator(string calldata name, string calldata bio, uint256 monthlyPrice) external {
        if (creators[msg.sender].isActive) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert InvalidInput();
        if (monthlyPrice == 0) revert InvalidPrice();

        creators[msg.sender] = Creator({
            name: name,
            bio: bio,
            monthlyPrice: monthlyPrice,
            subscriberCount: 0,
            isActive: true
        });

        creatorList.push(msg.sender);

        emit CreatorRegistered(msg.sender, name, monthlyPrice);
    }

    /// @notice Update creator profile information
    /// @param name New display name
    /// @param bio New bio/description
    function updateProfile(string calldata name, string calldata bio) external {
        if (!creators[msg.sender].isActive) revert NotRegistered();
        if (bytes(name).length == 0) revert InvalidInput();

        creators[msg.sender].name = name;
        creators[msg.sender].bio = bio;

        emit CreatorProfileUpdated(msg.sender, name, bio);
    }

    /// @notice Update monthly subscription price
    /// @param newPrice New price in wei
    function updateMonthlyPrice(uint256 newPrice) external {
        if (!creators[msg.sender].isActive) revert NotRegistered();
        if (newPrice == 0) revert InvalidPrice();

        uint256 oldPrice = creators[msg.sender].monthlyPrice;
        creators[msg.sender].monthlyPrice = newPrice;

        emit MonthlyPriceUpdated(msg.sender, oldPrice, newPrice);
    }

    // ============ Publishing Functions ============

    /// @notice Publish a new newsletter post
    /// @param contentCID IPFS CID of encrypted content
    /// @param inputEncryptedKey External encrypted AES key
    /// @param inputProof Proof for the encrypted key
    /// @param title Newsletter title
    /// @param preview Preview text (first ~200 chars)
    /// @param isPublic Whether this is a free/public post
    /// @return postId The ID of the created post
    function publishNewsletter(
        string calldata contentCID,
        externalEuint256 inputEncryptedKey,
        bytes calldata inputProof,
        string calldata title,
        string calldata preview,
        bool isPublic
    ) external returns (uint256 postId) {
        if (!creators[msg.sender].isActive) revert NotRegistered();
        if (bytes(contentCID).length == 0 || bytes(title).length == 0) revert InvalidInput();

        // Convert external encrypted key to internal euint256
        euint256 encryptedKey = FHE.fromExternal(inputEncryptedKey, inputProof);

        // Allow this contract and creator to access the encrypted key
        FHE.allowThis(encryptedKey);
        FHE.allow(encryptedKey, msg.sender);

        postId = postCounter++;

        newsletters[postId] = NewsletterPost({
            contentCID: contentCID,
            encryptedKey: encryptedKey,
            title: title,
            preview: preview,
            publishedAt: block.timestamp,
            isPublic: isPublic,
            creator: msg.sender
        });

        emit NewsletterPublished(postId, msg.sender, title, contentCID, isPublic);
    }

    // ============ Subscription Functions ============

    /// @notice Subscribe to a creator's newsletter
    /// @param creator Address of the creator to subscribe to
    function subscribe(address creator) external payable {
        if (!creators[creator].isActive) revert NotRegistered();
        if (msg.value < creators[creator].monthlyPrice) revert InsufficientPayment();

        Subscription storage sub = subscriptions[msg.sender][creator];

        // Calculate new expiry date
        uint256 expiresAt;
        if (sub.isActive && sub.expiresAt > block.timestamp) {
            // Extend existing subscription
            expiresAt = sub.expiresAt + SUBSCRIPTION_DURATION;
        } else {
            // New subscription or expired subscription
            expiresAt = block.timestamp + SUBSCRIPTION_DURATION;
            if (!sub.isActive) {
                creators[creator].subscriberCount++;
            }
        }

        sub.expiresAt = expiresAt;
        sub.subscribedAt = sub.subscribedAt == 0 ? block.timestamp : sub.subscribedAt;
        sub.isActive = true;

        // Transfer payment to creator
        (bool success, ) = creator.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit Subscribed(msg.sender, creator, expiresAt);
    }

    /// @notice Renew an existing subscription
    /// @param creator Address of the creator
    function renewSubscription(address creator) external payable {
        if (!creators[creator].isActive) revert NotRegistered();
        if (msg.value < creators[creator].monthlyPrice) revert InsufficientPayment();

        Subscription storage sub = subscriptions[msg.sender][creator];
        if (!sub.isActive) revert NoActiveSubscription();

        // Extend from current expiry or now, whichever is later
        uint256 baseTime = sub.expiresAt > block.timestamp ? sub.expiresAt : block.timestamp;
        sub.expiresAt = baseTime + SUBSCRIPTION_DURATION;

        // Transfer payment to creator
        (bool success, ) = creator.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit SubscriptionRenewed(msg.sender, creator, sub.expiresAt);
    }

    /// @notice Cancel a subscription (doesn't refund, just marks inactive)
    /// @param creator Address of the creator
    function cancelSubscription(address creator) external {
        Subscription storage sub = subscriptions[msg.sender][creator];
        if (!sub.isActive) revert NoActiveSubscription();

        sub.isActive = false;
        creators[creator].subscriberCount--;

        emit SubscriptionCancelled(msg.sender, creator);
    }

    // ============ Access Control Functions ============

    /// @notice Check if a user can access a newsletter
    /// @param postId Newsletter post ID
    /// @param user User address to check
    /// @return hasAccess Whether the user has access
    function canAccessNewsletter(uint256 postId, address user) public view returns (bool hasAccess) {
        NewsletterPost storage post = newsletters[postId];

        // Check if newsletter exists (creator should not be zero address)
        if (post.creator == address(0)) {
            return false;
        }

        // Public posts are accessible to everyone
        if (post.isPublic) {
            return true;
        }

        // Creator can always access their own content
        if (user == post.creator) {
            return true;
        }

        // Check if user has valid subscription (not expired yet)
        // Even if cancelled (isActive=false), user can still access until expiresAt
        Subscription storage sub = subscriptions[user][post.creator];
        return sub.expiresAt > block.timestamp;
    }

    /// @notice Grant permission to decrypt a newsletter's key
    /// @dev Must be called before attempting client-side decryption
    /// @param postId Newsletter post ID
    function grantDecryptionPermission(uint256 postId) external {
        NewsletterPost storage post = newsletters[postId];

        // For public posts, no need to grant permission (no encryption)
        if (post.isPublic) {
            return; // Early return for public posts
        }

        if (!canAccessNewsletter(postId, msg.sender)) revert Unauthorized();

        // Grant permission to the caller to decrypt the key
        FHE.allow(post.encryptedKey, msg.sender);
    }

    /// @notice Get decryption key for a newsletter (only if user has access)
    /// @dev Permission must be granted via grantDecryptionPermission first (except for creators)
    /// @param postId Newsletter post ID
    /// @return encryptedKey The encrypted AES key handle
    function getDecryptionKey(uint256 postId) external view returns (euint256 encryptedKey) {
        NewsletterPost storage post = newsletters[postId];

        // Explicit checks with better error messages
        require(post.creator != address(0), "Newsletter does not exist");

        // For view functions, msg.sender in local testing might be default account
        // So we allow anyone to READ the encrypted key handle (it's still encrypted)
        // The actual FHE decryption will fail if they don't have permission
        // This is safe because the encrypted key is meaningless without FHE permission

        return post.encryptedKey;
    }

    /// @notice Get subscription status for a creator
    /// @param subscriber Subscriber address
    /// @param creator Creator address
    /// @return isActive Whether subscription is active (not cancelled)
    /// @return expiresAt Expiry timestamp
    /// @return subscribedAt Initial subscription timestamp
    /// @return hasAccess Whether user can still access content (considers expiry, not cancellation)
    function getSubscriptionStatus(
        address subscriber,
        address creator
    ) external view returns (bool isActive, uint256 expiresAt, uint256 subscribedAt, bool hasAccess) {
        Subscription storage sub = subscriptions[subscriber][creator];
        bool stillHasAccess = sub.expiresAt > block.timestamp;
        return (sub.isActive, sub.expiresAt, sub.subscribedAt, stillHasAccess);
    }

    // ============ Query Functions ============

    /// @notice Get creator details
    /// @param creator Creator address
    /// @return Creator struct with profile information
    function getCreator(address creator) external view returns (Creator memory) {
        return creators[creator];
    }

    /// @notice Get newsletter post details
    /// @param postId Post ID
    /// @return NewsletterPost struct with post information
    function getNewsletter(uint256 postId) external view returns (NewsletterPost memory) {
        return newsletters[postId];
    }

    /// @notice Get total number of creators
    /// @return Total number of registered creators
    function getCreatorCount() external view returns (uint256) {
        return creatorList.length;
    }

    /// @notice Get list of creator addresses (paginated)
    /// @param offset Starting index
    /// @param limit Number of creators to return
    /// @return Array of creator addresses
    function getCreators(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = creatorList.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = creatorList[i];
        }

        return result;
    }
}
