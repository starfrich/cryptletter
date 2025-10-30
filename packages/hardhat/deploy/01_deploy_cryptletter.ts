import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying Cryptletter contract...");
  console.log("Deployer address:", deployer);

  const deployedCryptletter = await deploy("Cryptletter", {
    from: deployer,
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 5 : 1,
  });

  console.log(`✅ Cryptletter contract deployed at: ${deployedCryptletter.address}`);

  // Verify on Etherscan if on Sepolia
  if (hre.network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    try {
      await hre.run("verify:verify", {
        address: deployedCryptletter.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified on Etherscan");
      } else {
        console.error("Error verifying contract:", error);
      }
    }
  }

  console.log("\n📝 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: Cryptletter`);
  console.log(`Address: ${deployedCryptletter.address}`);
  console.log(`Deployer: ${deployer}`);
  console.log("=".repeat(50));
};

export default func;
func.id = "deploy_cryptletter";
func.tags = ["Cryptletter", "main"];
