import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment with verification...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy ApprovalNFT
  console.log("📦 Deploying ApprovalNFT...");
  const ApprovalNFT = await ethers.getContractFactory("ApprovalNFT");
  const nft = await ApprovalNFT.deploy(deployer.address);
  const nftTx = nft.deploymentTransaction();
  if (nftTx) {
    console.log("   Waiting for transaction...");
    await nftTx.wait();
  }
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  
  // Verify NFT
  const nftCode = await ethers.provider.getCode(nftAddr);
  if (nftCode.length < 10) throw new Error("NFT deployment failed");
  console.log("✅ ApprovalNFT:", nftAddr, `(${nftCode.length} bytes)\n`);

  // Deploy ImpactScoreCalculator
  console.log("📦 Deploying ImpactScoreCalculator...");
  const ImpactScore = await ethers.getContractFactory("ImpactScoreCalculator");
  const score = await ImpactScore.deploy(ethers.ZeroAddress);
  const scoreTx = score.deploymentTransaction();
  if (scoreTx) {
    console.log("   Waiting for transaction...");
    await scoreTx.wait();
  }
  await score.waitForDeployment();
  const scoreAddr = await score.getAddress();
  
  // Verify Score
  const scoreCode = await ethers.provider.getCode(scoreAddr);
  if (scoreCode.length < 10) throw new Error("Score deployment failed");
  console.log("✅ ImpactScoreCalculator:", scoreAddr, `(${scoreCode.length} bytes)\n`);

  // Deploy PublicFundProject
  console.log("📦 Deploying PublicFundProject...");
  const PublicFundProject = await ethers.getContractFactory("PublicFundProject");
  const project = await PublicFundProject.deploy(nftAddr, scoreAddr);
  const projectTx = project.deploymentTransaction();
  if (projectTx) {
    console.log("   Waiting for transaction...");
    await projectTx.wait();
  }
  await project.waitForDeployment();
  const projectAddr = await project.getAddress();
  
  // Verify Project - CRITICAL CHECK
  console.log("🔍 Verifying deployment...");
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
  const projectCode = await ethers.provider.getCode(projectAddr);
  console.log(`   Code length: ${projectCode.length} bytes`);
  
  if (projectCode.length < 10) {
    throw new Error(`❌ Contract deployment FAILED - no code at ${projectAddr}`);
  }
  
  // Test contract call
  try {
    const total = await project.getTotalProjects();
    console.log(`   Test call successful: ${total.toString()} projects\n`);
  } catch (e: any) {
    throw new Error(`❌ Contract call failed: ${e.message}`);
  }
  
  console.log("✅ PublicFundProject:", projectAddr, `(${projectCode.length} bytes)\n`);

  // Update contracts
  console.log("🔄 Updating contract relationships...");
  await (await score.updateProjectAddress(projectAddr)).wait();
  await (await nft.transferOwnership(projectAddr)).wait();
  console.log("✅ Updates complete\n");

  // Deploy ZKVerifier
  console.log("📦 Deploying ZKVerifier...");
  const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
  const zk = await ZKVerifier.deploy();
  const zkTx = zk.deploymentTransaction();
  if (zkTx) {
    await zkTx.wait();
  }
  await zk.waitForDeployment();
  const zkAddr = await zk.getAddress();
  console.log("✅ ZKVerifier:", zkAddr, "\n");

  // Final verification
  console.log("🔍 Final verification...");
  const finalCode = await ethers.provider.getCode(projectAddr);
  if (finalCode.length < 10) {
    throw new Error("❌ Contract lost after updates!");
  }
  
  const finalTotal = await project.getTotalProjects();
  console.log(`✅ Contract is working! Total projects: ${finalTotal.toString()}\n`);

  console.log("=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log("PublicFundProject:    ", projectAddr);
  console.log("ApprovalNFT:          ", nftAddr);
  console.log("ImpactScoreCalculator:", scoreAddr);
  console.log("ZKVerifier:           ", zkAddr);
  console.log("\n✅ All contracts deployed and verified!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });

