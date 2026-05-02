import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment of PFTUS contracts...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy ApprovalNFT
  console.log("📦 Deploying ApprovalNFT contract...");
  const ApprovalNFT = await ethers.getContractFactory("ApprovalNFT");
  const approvalNFT = await ApprovalNFT.deploy(deployer.address); // Pass initial owner
  const nftDeployTx = approvalNFT.deploymentTransaction();
  if (nftDeployTx) {
    console.log("⏳ Waiting for ApprovalNFT deployment transaction...");
    await nftDeployTx.wait();
  }
  await approvalNFT.waitForDeployment();
  const approvalNFTAddress = await approvalNFT.getAddress();
  console.log("✅ ApprovalNFT deployed to:", approvalNFTAddress, "\n");

  // Deploy ImpactScoreCalculator (needs placeholder address initially)
  console.log("📦 Deploying ImpactScoreCalculator contract...");
  const ImpactScoreCalculator = await ethers.getContractFactory("ImpactScoreCalculator");
  const impactScoreCalculator = await ImpactScoreCalculator.deploy(ethers.ZeroAddress); // Placeholder
  const scoreDeployTx = impactScoreCalculator.deploymentTransaction();
  if (scoreDeployTx) {
    console.log("⏳ Waiting for ImpactScoreCalculator deployment transaction...");
    await scoreDeployTx.wait();
  }
  await impactScoreCalculator.waitForDeployment();
  const impactScoreAddress = await impactScoreCalculator.getAddress();
  console.log("✅ ImpactScoreCalculator deployed to:", impactScoreAddress, "\n");

  // Deploy PublicFundProject
  console.log("📦 Deploying PublicFundProject contract...");
  const PublicFundProject = await ethers.getContractFactory("PublicFundProject");
  const publicFundProject = await PublicFundProject.deploy(approvalNFTAddress, impactScoreAddress);
  const projectDeployTx = publicFundProject.deploymentTransaction();
  if (projectDeployTx) {
    console.log("⏳ Waiting for PublicFundProject deployment transaction...");
    await projectDeployTx.wait();
  }
  await publicFundProject.waitForDeployment();
  const publicFundProjectAddress = await publicFundProject.getAddress();
  
  // Verify deployment
  const code = await ethers.provider.getCode(publicFundProjectAddress);
  if (code.length < 10) {
    throw new Error(`Contract deployment failed - no code at ${publicFundProjectAddress}`);
  }
  console.log("✅ PublicFundProject deployed to:", publicFundProjectAddress);
  console.log("   Code length:", code.length, "bytes\n");

  // Update ImpactScoreCalculator with correct PublicFundProject address
  console.log("🔄 Updating ImpactScoreCalculator with PublicFundProject address...");
  const updateTx = await impactScoreCalculator.updateProjectAddress(publicFundProjectAddress);
  await updateTx.wait();
  console.log("✅ ImpactScoreCalculator updated\n");

  // Transfer ApprovalNFT ownership to PublicFundProject
  console.log("🔄 Transferring ApprovalNFT ownership to PublicFundProject...");
  const transferTx = await approvalNFT.transferOwnership(publicFundProjectAddress);
  await transferTx.wait();
  console.log("✅ Ownership transferred\n");

  // Deploy ZKVerifier
  console.log("📦 Deploying ZKVerifier contract...");
  const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
  const zkVerifier = await ZKVerifier.deploy();
  await zkVerifier.waitForDeployment();
  const zkVerifierAddress = await zkVerifier.getAddress();
  console.log("✅ ZKVerifier deployed to:", zkVerifierAddress, "\n");

  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📋 CONTRACT ADDRESSES:\n");
  console.log("PublicFundProject:    ", publicFundProjectAddress);
  console.log("ApprovalNFT:          ", approvalNFTAddress);
  console.log("ImpactScoreCalculator:", impactScoreAddress);
  console.log("ZKVerifier:           ", zkVerifierAddress);
  console.log("\n");

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contracts: {
      PublicFundProject: publicFundProjectAddress,
      ApprovalNFT: approvalNFTAddress,
      ImpactScoreCalculator: impactScoreAddress,
      ZKVerifier: zkVerifierAddress
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployment-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("💾 Addresses saved to deployment-addresses.json\n");

  // Generate .env file content
  console.log("📝 Add these to your frontend/.env.local file:\n");
  console.log(`NEXT_PUBLIC_PUBLIC_FUND_PROJECT_ADDRESS=${publicFundProjectAddress}`);
  console.log(`NEXT_PUBLIC_APPROVAL_NFT_ADDRESS=${approvalNFTAddress}`);
  console.log(`NEXT_PUBLIC_IMPACT_SCORE_ADDRESS=${impactScoreAddress}`);
  console.log(`NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=${zkVerifierAddress}`);
  console.log("\n");

  console.log("🔗 Next steps:");
  console.log("1. Update frontend/.env.local with contract addresses");
  console.log("2. Verify contracts on block explorer");
  console.log("3. Fund test wallets with MATIC");
  console.log("4. Run frontend: cd frontend && npm run dev");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

