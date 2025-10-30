import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { Cryptletter, Cryptletter__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("Cryptletter")) as Cryptletter__factory;
  const cryptletterContract = (await factory.deploy()) as Cryptletter;
  const cryptletterContractAddress = await cryptletterContract.getAddress();

  return { cryptletterContract, cryptletterContractAddress };
}

describe("Cryptletter", function () {
  let signers: Signers;
  let cryptletterContract: Cryptletter;
  let cryptletterContractAddress: string;

  const MONTHLY_PRICE = ethers.parseEther("0.01"); // 0.01 ETH
  const CREATOR_NAME = "Alice Creator";
  const CREATOR_BIO = "A passionate newsletter writer";
  const POST_TITLE = "My First Newsletter";
  const POST_PREVIEW = "This is a preview of my amazing newsletter content...";
  const POST_CID = "QmXxxx1234567890abcdef";

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cryptletterContract, cryptletterContractAddress } = await deployFixture());
  });

  describe("Creator Registration", function () {
    it("should register a new creator successfully", async function () {
      await expect(cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE))
        .to.emit(cryptletterContract, "CreatorRegistered")
        .withArgs(signers.alice.address, CREATOR_NAME, MONTHLY_PRICE);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.name).to.equal(CREATOR_NAME);
      expect(creator.bio).to.equal(CREATOR_BIO);
      expect(creator.monthlyPrice).to.equal(MONTHLY_PRICE);
      expect(creator.subscriberCount).to.equal(0);
      expect(creator.isActive).to.be.true;
    });

    it("should revert if creator is already registered", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      await expect(
        cryptletterContract.connect(signers.alice).registerCreator("New Name", "New Bio", MONTHLY_PRICE),
      ).to.be.revertedWithCustomError(cryptletterContract, "AlreadyRegistered");
    });

    it("should revert if name is empty", async function () {
      await expect(
        cryptletterContract.connect(signers.alice).registerCreator("", CREATOR_BIO, MONTHLY_PRICE),
      ).to.be.revertedWithCustomError(cryptletterContract, "InvalidInput");
    });

    it("should revert if price is zero", async function () {
      await expect(
        cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, 0),
      ).to.be.revertedWithCustomError(cryptletterContract, "InvalidPrice");
    });

    it("should add creator to creator list", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const creatorCount = await cryptletterContract.getCreatorCount();
      expect(creatorCount).to.equal(1);

      const creators = await cryptletterContract.getCreators(0, 10);
      expect(creators[0]).to.equal(signers.alice.address);
    });
  });

  describe("Profile Updates", function () {
    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);
    });

    it("should update creator profile", async function () {
      const newName = "Alice Updated";
      const newBio = "Updated bio content";

      await expect(cryptletterContract.connect(signers.alice).updateProfile(newName, newBio))
        .to.emit(cryptletterContract, "CreatorProfileUpdated")
        .withArgs(signers.alice.address, newName, newBio);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.name).to.equal(newName);
      expect(creator.bio).to.equal(newBio);
    });

    it("should update monthly price", async function () {
      const newPrice = ethers.parseEther("0.02");

      await expect(cryptletterContract.connect(signers.alice).updateMonthlyPrice(newPrice))
        .to.emit(cryptletterContract, "MonthlyPriceUpdated")
        .withArgs(signers.alice.address, MONTHLY_PRICE, newPrice);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.monthlyPrice).to.equal(newPrice);
    });

    it("should revert update profile if not registered", async function () {
      await expect(cryptletterContract.connect(signers.bob).updateProfile("Bob", "Bio")).to.be.revertedWithCustomError(
        cryptletterContract,
        "NotRegistered",
      );
    });

    it("should revert update price to zero", async function () {
      await expect(cryptletterContract.connect(signers.alice).updateMonthlyPrice(0)).to.be.revertedWithCustomError(
        cryptletterContract,
        "InvalidPrice",
      );
    });
  });

  describe("Newsletter Publishing", function () {
    let encryptedKey: any;

    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      // Create an encrypted AES key (simulating a 256-bit key as a number)
      const mockAESKey = 12345678901234567890n; // Mock AES key
      encryptedKey = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey)
        .encrypt();
    });

    it("should publish a new newsletter", async function () {
      const tx = await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false);

      await expect(tx)
        .to.emit(cryptletterContract, "NewsletterPublished")
        .withArgs(0, signers.alice.address, POST_TITLE, POST_CID, false);

      const newsletter = await cryptletterContract.getNewsletter(0);
      expect(newsletter.contentCID).to.equal(POST_CID);
      expect(newsletter.title).to.equal(POST_TITLE);
      expect(newsletter.preview).to.equal(POST_PREVIEW);
      expect(newsletter.isPublic).to.be.false;
      expect(newsletter.creator).to.equal(signers.alice.address);
    });

    it("should publish a public newsletter", async function () {
      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, true);

      const newsletter = await cryptletterContract.getNewsletter(0);
      expect(newsletter.isPublic).to.be.true;
    });

    it("should revert if not registered as creator", async function () {
      await expect(
        cryptletterContract
          .connect(signers.bob)
          .publishNewsletter(
            POST_CID,
            encryptedKey.handles[0],
            encryptedKey.inputProof,
            POST_TITLE,
            POST_PREVIEW,
            false,
          ),
      ).to.be.revertedWithCustomError(cryptletterContract, "NotRegistered");
    });

    it("should revert if content CID is empty", async function () {
      await expect(
        cryptletterContract
          .connect(signers.alice)
          .publishNewsletter("", encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false),
      ).to.be.revertedWithCustomError(cryptletterContract, "InvalidInput");
    });

    it("should increment post counter", async function () {
      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false);

      const postCounter = await cryptletterContract.postCounter();
      expect(postCounter).to.equal(1);
    });
  });

  describe("Subscriptions", function () {
    let encryptedKey: any;

    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const mockAESKey = 12345678901234567890n;
      encryptedKey = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey)
        .encrypt();
    });

    it("should subscribe to a creator", async function () {
      const balanceBefore = await ethers.provider.getBalance(signers.alice.address);

      const tx = await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      await expect(tx).to.emit(cryptletterContract, "Subscribed");

      const balanceAfter = await ethers.provider.getBalance(signers.alice.address);
      expect(balanceAfter - balanceBefore).to.equal(MONTHLY_PRICE);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.subscriberCount).to.equal(1);
    });

    it("should get subscription status", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [isActive, expiresAt, subscribedAt] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      expect(isActive).to.be.true;
      expect(expiresAt).to.be.greaterThan(0);
      expect(subscribedAt).to.be.greaterThan(0);
    });

    it("should revert subscription with insufficient payment", async function () {
      await expect(
        cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
          value: ethers.parseEther("0.005"),
        }),
      ).to.be.revertedWithCustomError(cryptletterContract, "InsufficientPayment");
    });

    it("should renew subscription", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [, expiresAtBefore] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      await expect(
        cryptletterContract.connect(signers.bob).renewSubscription(signers.alice.address, {
          value: MONTHLY_PRICE,
        }),
      ).to.emit(cryptletterContract, "SubscriptionRenewed");

      const [, expiresAtAfter] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      expect(expiresAtAfter).to.be.greaterThan(expiresAtBefore);
    });

    it("should cancel subscription", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      await expect(cryptletterContract.connect(signers.bob).cancelSubscription(signers.alice.address))
        .to.emit(cryptletterContract, "SubscriptionCancelled")
        .withArgs(signers.bob.address, signers.alice.address);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.subscriberCount).to.equal(0);

      const [isActive] = await cryptletterContract.getSubscriptionStatus(signers.bob.address, signers.alice.address);
      expect(isActive).to.be.false;
    });

    it("should revert cancel if no active subscription", async function () {
      await expect(
        cryptletterContract.connect(signers.bob).cancelSubscription(signers.alice.address),
      ).to.be.revertedWithCustomError(cryptletterContract, "NoActiveSubscription");
    });
  });

  describe("Access Control", function () {
    let encryptedKey: any;
    let postId: number;

    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const mockAESKey = 12345678901234567890n;
      encryptedKey = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey)
        .encrypt();

      // Publish a private newsletter
      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false);
      postId = 0;
    });

    it("should allow creator to access their own newsletter", async function () {
      const hasAccess = await cryptletterContract.canAccessNewsletter(postId, signers.alice.address);
      expect(hasAccess).to.be.true;

      // Creator should be able to get decryption key
      const encryptedKey = await cryptletterContract.connect(signers.alice).getDecryptionKey(postId);
      expect(encryptedKey).to.not.equal(ethers.ZeroHash);
    });

    it("should allow subscriber to access newsletter", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const hasAccess = await cryptletterContract.canAccessNewsletter(postId, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should deny access to non-subscriber", async function () {
      const hasAccess = await cryptletterContract.canAccessNewsletter(postId, signers.bob.address);
      expect(hasAccess).to.be.false;

      // Non-subscriber needs to grant permission first which will revert
      await expect(
        cryptletterContract.connect(signers.bob).grantDecryptionPermission(postId),
      ).to.be.revertedWithCustomError(cryptletterContract, "Unauthorized");
    });

    it("should allow everyone to access public newsletter", async function () {
      // Publish a public newsletter
      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(
          "QmPublic123",
          encryptedKey.handles[0],
          encryptedKey.inputProof,
          "Public Post",
          "Public preview",
          true,
        );

      const publicPostId = 1;
      const hasAccess = await cryptletterContract.canAccessNewsletter(publicPostId, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should allow access after subscription cancellation until expiry", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      let hasAccess = await cryptletterContract.canAccessNewsletter(postId, signers.bob.address);
      expect(hasAccess).to.be.true;

      // Cancel subscription
      await cryptletterContract.connect(signers.bob).cancelSubscription(signers.alice.address);

      // User can still access content until expiry even after cancellation (by design)
      hasAccess = await cryptletterContract.canAccessNewsletter(postId, signers.bob.address);
      expect(hasAccess).to.be.true;

      // Check subscription status shows inactive
      const [isActive] = await cryptletterContract.getSubscriptionStatus(signers.bob.address, signers.alice.address);
      expect(isActive).to.be.false;
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator("Alice", "Alice's bio", MONTHLY_PRICE);
      await cryptletterContract.connect(signers.bob).registerCreator("Bob", "Bob's bio", ethers.parseEther("0.02"));
      await cryptletterContract
        .connect(signers.charlie)
        .registerCreator("Charlie", "Charlie's bio", ethers.parseEther("0.03"));
    });

    it("should get creator count", async function () {
      const count = await cryptletterContract.getCreatorCount();
      expect(count).to.equal(3);
    });

    it("should get creators with pagination", async function () {
      const creators = await cryptletterContract.getCreators(0, 2);
      expect(creators.length).to.equal(2);
      expect(creators[0]).to.equal(signers.alice.address);
      expect(creators[1]).to.equal(signers.bob.address);
    });

    it("should handle pagination offset", async function () {
      const creators = await cryptletterContract.getCreators(1, 2);
      expect(creators.length).to.equal(2);
      expect(creators[0]).to.equal(signers.bob.address);
      expect(creators[1]).to.equal(signers.charlie.address);
    });

    it("should return empty array for offset beyond total", async function () {
      const creators = await cryptletterContract.getCreators(10, 5);
      expect(creators.length).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("should handle multiple subscribers to same creator", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      await cryptletterContract.connect(signers.charlie).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.subscriberCount).to.equal(2);
    });

    it("should handle subscription expiry extension", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      // First subscription
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [, expiresAt1] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      // Second subscription (extends the first)
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [, expiresAt2] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      expect(expiresAt2).to.be.greaterThan(expiresAt1);

      // Subscriber count should still be 1
      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.subscriberCount).to.equal(1);
    });

    it("should handle multiple newsletters from same creator", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const mockAESKey1 = 11111111111111111111n;
      const encryptedKey1 = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey1)
        .encrypt();

      const mockAESKey2 = 22222222222222222222n;
      const encryptedKey2 = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey2)
        .encrypt();

      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(
          "QmPost1",
          encryptedKey1.handles[0],
          encryptedKey1.inputProof,
          "First Post",
          "Preview 1",
          false,
        );

      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(
          "QmPost2",
          encryptedKey2.handles[0],
          encryptedKey2.inputProof,
          "Second Post",
          "Preview 2",
          false,
        );

      const postCounter = await cryptletterContract.postCounter();
      expect(postCounter).to.equal(2);

      const newsletter1 = await cryptletterContract.getNewsletter(0);
      const newsletter2 = await cryptletterContract.getNewsletter(1);

      expect(newsletter1.title).to.equal("First Post");
      expect(newsletter2.title).to.equal("Second Post");
      expect(newsletter1.creator).to.equal(signers.alice.address);
      expect(newsletter2.creator).to.equal(signers.alice.address);
    });

    it("should return empty newsletter for non-existent ID", async function () {
      const newsletter = await cryptletterContract.getNewsletter(999);
      // Non-existent newsletters have zero address as creator
      expect(newsletter.creator).to.equal(ethers.ZeroAddress);
    });

    it("should revert getDecryptionKey for non-existent newsletter", async function () {
      await expect(cryptletterContract.connect(signers.alice).getDecryptionKey(999)).to.be.reverted;
    });

    it("should handle zero subscriber count correctly", async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const creator = await cryptletterContract.getCreator(signers.alice.address);
      expect(creator.subscriberCount).to.equal(0);
    });
  });

  describe("FHE Encryption Flow", function () {
    let encryptedKey: any;
    let postId: number;

    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);

      const mockAESKey = 12345678901234567890n;
      encryptedKey = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey)
        .encrypt();

      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false);
      postId = 0;
    });

    it("should store encrypted AES key on-chain", async function () {
      const newsletter = await cryptletterContract.getNewsletter(postId);
      // The encrypted key handle should be stored (we can't directly verify the content in mock mode)
      expect(newsletter.contentCID).to.equal(POST_CID);
    });

    it("should allow creator to retrieve encrypted key", async function () {
      const retrievedKey = await cryptletterContract.connect(signers.alice).getDecryptionKey(postId);

      // In mock mode, we can verify that a key was returned
      expect(retrievedKey).to.not.equal(ethers.ZeroHash);
    });

    it("should allow subscriber to retrieve encrypted key", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const retrievedKey = await cryptletterContract.connect(signers.bob).getDecryptionKey(postId);

      expect(retrievedKey).to.not.equal(ethers.ZeroHash);
    });

    it("should handle multiple encrypted keys independently", async function () {
      const mockAESKey2 = 98765432109876543210n;
      const encryptedKey2 = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey2)
        .encrypt();

      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(
          "QmSecondPost",
          encryptedKey2.handles[0],
          encryptedKey2.inputProof,
          "Second Newsletter",
          "Second preview",
          false,
        );

      const key1 = await cryptletterContract.connect(signers.alice).getDecryptionKey(0);
      const key2 = await cryptletterContract.connect(signers.alice).getDecryptionKey(1);

      // Keys should be different (stored separately)
      expect(key1).to.not.equal(key2);
    });
  });

  describe("Subscription Time Management", function () {
    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);
    });

    it("should set correct expiry time on subscription", async function () {
      const subscriptionTx = await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const receipt = await subscriptionTx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const subscriptionTime = block!.timestamp;

      const [, expiresAt, subscribedAt] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      // Should expire in 30 days (2592000 seconds)
      const expectedExpiry = BigInt(subscriptionTime) + 2592000n;
      expect(expiresAt).to.equal(expectedExpiry);
      expect(subscribedAt).to.equal(subscriptionTime);
    });

    it("should extend expiry on renewal", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [, expiresAtBefore] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      // Wait a bit and renew
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);

      await cryptletterContract.connect(signers.bob).renewSubscription(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [, expiresAtAfter] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      // Should add 30 days to previous expiry
      const expectedExpiry = expiresAtBefore + 2592000n;
      expect(expiresAtAfter).to.equal(expectedExpiry);
    });

    it("should handle subscription status after expiry", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const [isActiveBefore] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );
      expect(isActiveBefore).to.be.true;

      // Fast forward past expiry (31 days)
      await ethers.provider.send("evm_increaseTime", [2678400]); // 31 days
      await ethers.provider.send("evm_mine", []);

      const [isActiveAfter, expiresAt] = await cryptletterContract.getSubscriptionStatus(
        signers.bob.address,
        signers.alice.address,
      );

      // isActive flag remains true (subscription.isActive is not changed by time)
      // But expiresAt should be in the past
      expect(isActiveAfter).to.be.true; // isActive flag doesn't auto-update
      expect(expiresAt).to.be.lessThan(await ethers.provider.getBlock("latest").then((b) => b!.timestamp));
    });

    it("should deny access after subscription expiry", async function () {
      // Use existing alice registration (already registered in beforeEach of parent describe block)
      const mockAESKey = 12345678901234567890n;
      const encryptedKey = await fhevm
        .createEncryptedInput(cryptletterContractAddress, signers.alice.address)
        .add256(mockAESKey)
        .encrypt();

      await cryptletterContract
        .connect(signers.alice)
        .publishNewsletter(POST_CID, encryptedKey.handles[0], encryptedKey.inputProof, POST_TITLE, POST_PREVIEW, false);

      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      // Verify access before expiry
      let hasAccess = await cryptletterContract.canAccessNewsletter(0, signers.bob.address);
      expect(hasAccess).to.be.true;

      // Fast forward past expiry
      await ethers.provider.send("evm_increaseTime", [2678400]); // 31 days
      await ethers.provider.send("evm_mine", []);

      // Verify no access after expiry
      hasAccess = await cryptletterContract.canAccessNewsletter(0, signers.bob.address);
      expect(hasAccess).to.be.false;
    });
  });

  describe("Payment and Balance Management", function () {
    beforeEach(async function () {
      await cryptletterContract.connect(signers.alice).registerCreator(CREATOR_NAME, CREATOR_BIO, MONTHLY_PRICE);
    });

    it("should transfer exact payment amount to creator", async function () {
      const balanceBefore = await ethers.provider.getBalance(signers.alice.address);

      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const balanceAfter = await ethers.provider.getBalance(signers.alice.address);

      expect(balanceAfter - balanceBefore).to.equal(MONTHLY_PRICE);
    });

    it("should not refund on cancellation", async function () {
      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const balanceBefore = await ethers.provider.getBalance(signers.bob.address);

      const cancelTx = await cryptletterContract.connect(signers.bob).cancelSubscription(signers.alice.address);
      const receipt = await cancelTx.wait();
      const gasCost = receipt!.gasUsed * cancelTx.gasPrice!;

      const balanceAfter = await ethers.provider.getBalance(signers.bob.address);

      // Balance should only decrease by gas cost, no refund
      expect(balanceBefore - balanceAfter).to.equal(gasCost);
    });

    it("should handle multiple payments to same creator", async function () {
      const balanceBefore = await ethers.provider.getBalance(signers.alice.address);

      await cryptletterContract.connect(signers.bob).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      await cryptletterContract.connect(signers.charlie).subscribe(signers.alice.address, {
        value: MONTHLY_PRICE,
      });

      const balanceAfter = await ethers.provider.getBalance(signers.alice.address);

      expect(balanceAfter - balanceBefore).to.equal(MONTHLY_PRICE * 2n);
    });
  });
});
