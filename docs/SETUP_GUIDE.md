# 🚀 Complete Setup Guide - PFTUS

This guide will help you set up and run the complete PFTUS system from scratch.

## 📋 Prerequisites

### Required Software

1. **Node.js and npm**
   ```bash
   # Check if installed
   node --version  # Should be v18 or higher
   npm --version   # Should be v9 or higher
   
   # If not installed, download from: https://nodejs.org/
   ```

2. **Git**
   ```bash
   # Check if installed
   git --version
   
   # If not installed, download from: https://git-scm.com/
   ```

3. **MetaMask Browser Extension**
   - Install from: https://metamask.io/
   - Create 3 separate accounts (Government, Contractor, Auditor)

### Recommended Software

- **Visual Studio Code**: https://code.visualstudio.com/
- **Postman** (for API testing): https://www.postman.com/

---

## 📥 Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd Blockchain-based-Public-Fund-Tracking-Utilization-System

# Or if you're already in the directory
cd Blockchain-based-Public-Fund-Tracking-Utilization-System
```

---

## 📦 Step 2: Install Dependencies

### Install Contract Dependencies

```bash
# In project root
npm install
```

This installs:
- Hardhat (Ethereum development environment)
- OpenZeppelin Contracts (secure smart contract library)
- Ethers.js (Ethereum library)
- TypeScript and related tools

### Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

This installs:
- Next.js and React
- Tailwind CSS
- Web3 libraries
- UI components

---

## 🔧 Step 3: Environment Configuration

### Configure Contract Environment

```bash
# Create .env file in root
cp .env.example .env
```

Edit `.env`:
```env
# For testnet deployment
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=your_metamask_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

**How to get Private Key:**
1. Open MetaMask
2. Click three dots → Account Details
3. Click "Export Private Key"
4. Enter password
5. Copy key (NEVER share this!)

**How to get PolygonScan API Key:**
1. Go to: https://polygonscan.com/apis
2. Sign up for free account
3. Generate API key

### Configure Frontend Environment

```bash
# Create frontend env file
cp frontend/.env.example frontend/.env.local
```

We'll fill this after deploying contracts.

---

## 🏗️ Step 4: Compile Smart Contracts

```bash
# Compile all contracts
npm run compile
```

You should see:
```
Compiled 10 Solidity files successfully
```

If errors occur:
- Check Node.js version (must be v18+)
- Delete `node_modules` and `cache` folders, reinstall
- Check for syntax errors in contract files

---

## 🌐 Step 5: Deploy to Testnet

### Option A: Local Hardhat Network (Fastest for Testing)

```bash
# Terminal 1 - Start local blockchain
npm run node

# Terminal 2 - Deploy contracts
npm run deploy:local
```

### Option B: Polygon Mumbai Testnet (Recommended for Demo)

#### Get Test MATIC

1. Copy your MetaMask address
2. Visit: https://faucet.polygon.technology/
3. Select "Mumbai" network
4. Paste address and request MATIC
5. Wait 1-2 minutes for tokens

#### Deploy Contracts

```bash
npm run deploy:mumbai
```

You should see:
```
🚀 Starting deployment...
✅ ApprovalNFT deployed to: 0x...
✅ ImpactScoreCalculator deployed to: 0x...
✅ PublicFundProject deployed to: 0x...
✅ ZKVerifier deployed to: 0x...
💾 Addresses saved to deployment-addresses.json
```

**Save these addresses!** You'll need them in the next step.

---

## ⚙️ Step 6: Configure Frontend

### Update Contract Addresses

Open `frontend/.env.local` and paste the deployed addresses:

```env
NEXT_PUBLIC_PUBLIC_FUND_PROJECT_ADDRESS=0xYourDeployedAddress1
NEXT_PUBLIC_APPROVAL_NFT_ADDRESS=0xYourDeployedAddress2
NEXT_PUBLIC_IMPACT_SCORE_ADDRESS=0xYourDeployedAddress3
NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0xYourDeployedAddress4
```

### Add Network to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Enter details:
   ```
   Network Name: Polygon Mumbai
   RPC URL: https://rpc-mumbai.maticvigil.com
   Chain ID: 80001
   Currency Symbol: MATIC
   Block Explorer: https://mumbai.polygonscan.com
   ```
4. Save

---

## 🚀 Step 7: Run Frontend

```bash
cd frontend
npm run dev
```

Open browser: http://localhost:3000

You should see the PFTUS home page! 🎉

---

## 🎭 Step 8: Setup Demo Wallets

### Create 3 MetaMask Accounts

1. **Government Account**
   - Click MetaMask icon
   - My Accounts → Create Account
   - Name: "PFTUS Government"
   - Copy address

2. **Contractor Account**
   - Create another account
   - Name: "PFTUS Contractor"
   - Copy address

3. **Auditor Account**
   - Create another account
   - Name: "PFTUS Auditor"
   - Copy address

### Fund All Accounts

Send test MATIC to all 3 accounts:
- Visit: https://faucet.polygon.technology/
- Request MATIC for each address
- Each account needs at least 0.5 MATIC for transactions

---

## ✅ Step 9: Verify Setup

### Test 1: Connect Wallet

1. Go to http://localhost:3000
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve connection
5. Your address should appear

### Test 2: Check Contract Connection

1. Go to Government Dashboard
2. If no errors appear, contracts are connected!
3. If you see errors, check:
   - Contract addresses in `.env.local`
   - Network (should be Mumbai)
   - Account has MATIC

---

## 🎬 Step 10: Run Demo

### Create First Project

1. **Connect as Government**
   - Switch to Government account in MetaMask
   - Refresh page
   - Click "Government Dashboard"

2. **Create Project**
   - Click "Create New Project"
   - Fill details:
     ```
     Title: Demo Road Construction
     Description: Test project for demonstration
     Contractor: [Paste Contractor address]
     Auditor: [Paste Auditor address]
     
     Milestone 1:
       Title: Foundation Work
       Amount: 1
       Date: [tomorrow]
       Description: Initial setup
     ```
   - Click "Create Project"
   - Approve MetaMask transaction
   - Wait for confirmation ✅

3. **Allocate Funds**
   - Enter "1" in allocation field
   - Click "Allocate Funds"
   - Approve transaction
   - Project status → Active ✅

### Request Milestone (Contractor)

1. **Switch Accounts**
   - Open MetaMask
   - Switch to Contractor account
   - Refresh page

2. **Request Release**
   - Go to Contractor Dashboard
   - Find your project
   - Click "Request Release" for Milestone 1
   - Approve transaction ✅

3. **Upload Proof**
   - Click "Upload Proof"
   - Select any PDF/image file
   - Wait for upload
   - Status → Under Review ✅

### Approve Milestone (Auditor)

1. **Switch Accounts**
   - Switch to Auditor account in MetaMask
   - Refresh page

2. **Review & Approve**
   - Go to Auditor Dashboard
   - See pending approval
   - Click "View Document" (optional)
   - Click "Approve"
   - Confirm transaction
   - Status → Approved ✅
   - NFT minted ✅
   - Funds released ✅

### View as Public

1. **Open Incognito/Private Window**
2. Go to http://localhost:3000
3. Click "Public Explorer"
4. Find your project
5. Click to view details
6. See:
   - Progress: 100%
   - Funds spent: 1 ETH
   - Milestone approved
   - NFT stamp
   - Complete audit trail

**Demo Complete!** 🎉

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to network"

**Solution:**
```bash
# Check if you're on correct network
# MetaMask → Networks → Polygon Mumbai

# Or restart local node
npm run node
```

### Issue: "Transaction failed"

**Solutions:**
1. Check you have enough MATIC
2. Increase gas limit in MetaMask
3. Wait 30 seconds and try again
4. Check contract addresses are correct

### Issue: "Contract not found"

**Solutions:**
1. Verify `.env.local` has correct addresses
2. Restart frontend: `npm run dev`
3. Clear browser cache
4. Redeploy contracts

### Issue: "MetaMask not detected"

**Solutions:**
1. Install MetaMask extension
2. Refresh page
3. Try different browser
4. Enable MetaMask in extension settings

### Issue: "Wrong network"

**Solutions:**
1. Open MetaMask
2. Switch to Polygon Mumbai
3. If network missing, add it (see Step 6)

---

## 🔒 Security Notes

### NEVER Commit or Share:

- ❌ Private keys
- ❌ Seed phrases
- ❌ .env files
- ❌ API keys

### Always:

- ✅ Use test accounts for development
- ✅ Keep `.env` in `.gitignore`
- ✅ Use environment variables
- ✅ Test on testnet first

---

## 📚 Next Steps

### For Development:

1. Read smart contract code in `contracts/`
2. Customize frontend in `frontend/app/`
3. Add new features
4. Write tests

### For Presentation:

1. Review `presentation/DEMO_SCRIPT.md`
2. Practice demo flow 3 times
3. Prepare backup screenshots
4. Test screen sharing

### For Deployment:

1. Audit smart contracts
2. Deploy to mainnet
3. Verify contracts on PolygonScan
4. Setup production frontend

---

## 🆘 Getting Help

### Documentation:

- Project Overview: `cursor_project_rules/PROJECT_OVERVIEW.md`
- Technical Specs: `cursor_project_rules/TECHNICAL_SPECIFICATIONS.md`
- Implementation Plan: `implementation-plan.md`

### Common Commands:

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:mumbai

# Run frontend
cd frontend && npm run dev

# Clean and rebuild
npm run clean && npm run compile

# Check contract on explorer
# https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
```

---

## ✨ You're All Set!

Your PFTUS system is now fully functional and ready for demonstration.

**Quick Start Demo:**
```bash
# Terminal 1
cd frontend
npm run dev

# Terminal 2 (optional - monitor logs)
# No need if using testnet

# Browser
# Open http://localhost:3000
```

Good luck with your seminar! 🚀

---

**Questions?** Check troubleshooting section or review documentation files.

