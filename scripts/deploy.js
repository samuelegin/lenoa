const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy CollateralVault
  console.log("\nDeploying CollateralVault...");
  const CollateralVault = await hre.ethers.getContractFactory("CollateralVault");
  const collateralVault = await CollateralVault.deploy();
  await collateralVault.waitForDeployment();
  const vaultAddress = await collateralVault.getAddress();
  console.log("CollateralVault deployed to:", vaultAddress);

  // Deploy LoanNFT
  console.log("\nDeploying LoanNFT...");
  const LoanNFT = await hre.ethers.getContractFactory("LoanNFT");
  const loanNFT = await LoanNFT.deploy();
  await loanNFT.waitForDeployment();
  const nftAddress = await loanNFT.getAddress();
  console.log("LoanNFT deployed to:", nftAddress);

  // Deploy LoanFactory
  console.log("\nDeploying LoanFactory...");
  const LoanFactory = await hre.ethers.getContractFactory("LoanFactory");
  const loanFactory = await LoanFactory.deploy(nftAddress, vaultAddress);
  await loanFactory.waitForDeployment();
  const factoryAddress = await loanFactory.getAddress();
  console.log("LoanFactory deployed to:", factoryAddress);

  // Set LoanFactory in other contracts
  console.log("\n  Configuring contracts...");
  
  const tx1 = await loanNFT.setLoanFactory(factoryAddress);
  await tx1.wait();
  console.log("LoanFactory set in LoanNFT");

  const tx2 = await collateralVault.setLoanFactory(factoryAddress);
  await tx2.wait();
  console.log("LoanFactory set in CollateralVault");
  
  console.log("\nDeployment Complete!\n");
  console.log("═══════════════════════════════════════");
  console.log("Contract Addresses:");
  console.log("═══════════════════════════════════════");
  console.log("LoanFactory:      ", factoryAddress);
  console.log("LoanNFT:          ", nftAddress);
  console.log("CollateralVault:  ", vaultAddress);
  console.log("Fee Collector:    ", deployer.address);
  console.log("═══════════════════════════════════════");
  
  console.log("\nAdd these to your .env file:");
  console.log("─────────────────────────────────────");
  console.log(`NEXT_PUBLIC_LOAN_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_LOAN_NFT_ADDRESS=${nftAddress}`);
  console.log(`NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS=${vaultAddress}`);
  console.log("─────────────────────────────────────");

  // Verify token support
  console.log("\n🪙 Supported Tokens:");
  const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
  const SEPOLIA_DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";
  const SEPOLIA_USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
  const SEPOLIA_LINK = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  
  console.log(" ETH   (Native)");
  console.log(" DAI   (Sepolia):", SEPOLIA_DAI);
  console.log(" USDC  (Sepolia):", SEPOLIA_USDC);
  console.log(" LINK  (Sepolia):", SEPOLIA_LINK);
  console.log(" WETH  (Sepolia):", SEPOLIA_WETH);
  console.log("\n Fee Structure:");
  console.log("• Origination Fee: 0.5% (from borrower)");
  console.log("• Interest Fee:    5.0% (from lender's profit)");

  // Wait for Etherscan to index
  console.log("\n Waiting 45 seconds for Etherscan to index...");
  await new Promise(resolve => setTimeout(resolve, 45000));

  // Verify contracts
  console.log("\nVer ifying contracts on Etherscan...\n");
  
  try {
    await hre.run("verify:verify", {
      address: vaultAddress,
      constructorArguments: [],
    });
    console.log("CollateralVault verified");
  } catch (error) {
    console.log("CollateralVault verification failed:", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: nftAddress,
      constructorArguments: [],
    });
    console.log("LoanNFT verified");
  } catch (error) {
    console.log("LoanNFT verification failed:", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [nftAddress, vaultAddress],
    });
    console.log("LoanFactory verified");
  } catch (error) {
    console.log("LoanFactory verification failed:", error.message);
  }

  console.log("Next Steps:");
  console.log("1. Update your frontend .env with the addresses above");
  console.log("2. Test create loan on Sepolia");
  console.log("3. Get Sepolia tokens from faucets:");
  console.log("   https://sepoliafaucet.com (ETH)");
  console.log("   https://faucet.circle.com (USDC)");
  console.log("   https://faucets.chain.link (LINK)");
  console.log("4. Withdraw fees with: loanFactory.withdrawAllFees()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });