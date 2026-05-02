# 🌐 PFTUS - Blockchain-based Public Fund Tracking & Utilization System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)

A comprehensive blockchain-based solution for transparent tracking and utilization of public funds, ensuring accountability and building public trust in governance.

## 🎯 Problem Statement

Government-issued public funds often suffer from:
- ❌ Lack of transparency
- ❌ Delayed utilization reporting
- ❌ Risk of misallocation & corruption
- ❌ No public visibility into actual spending

## ✅ Our Solution

A blockchain platform where:
- **Government** allocates funds to projects
- **Contractors** request and withdraw funds milestone-wise
- **Auditors** verify expenditure proofs
- **Citizens** can view fund flow, progress updates & milestone completion

Everything recorded as **immutable blockchain transactions** → Public trust & transparency.

## 🚀 Novel Features

### 1. Milestone-Based Escrow Smart Contract
Funds released only on verifiable progress milestones. Prevents misuse and ensures accountability.

### 2. Zero-Knowledge Proof (ZK-Lite) Implementation
Citizens can verify spending **without seeing sensitive invoices**. Privacy + Transparency.

### 3. Impact Score / Public Trust Index
Each project gets a transparency + performance score based on:
- On-time milestone completion (40%)
- Budget adherence (30%)
- Audit approval rates (20%)
- Transparency score (10%)

### 4. Audit Trail Explorer
Beautiful dashboard to visualize complete fund flow with timeline and progress bars.

### 5. NFT-Based Approval Stamps
Each milestone approval generates a unique NFT "Public Audit Seal" - immutable proof of verification.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN LAYER                         │
│         (Polygon Mumbai Testnet / Local Hardhat)            │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────┐                 │
│  │ PublicFundProject │  │ ApprovalNFT     │                 │
│  │ Smart Contract    │  │ Smart Contract  │                 │
│  └──────────────────┘  └─────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────┐                 │
│  │ ImpactScore      │  │ ZKVerifier      │                 │
│  │ Calculator       │  │ Contract        │                 │
│  └──────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│   Government   │   │   Contractor   │   │    Auditor     │
│   Dashboard    │   │   Dashboard    │   │   Dashboard    │
│  (Allocate)    │   │  (Request)     │   │  (Verify)      │
└────────────────┘   └────────────────┘   └────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Public Explorer  │
                    │   (Read-Only)     │
                    │  Citizen Portal   │
                    └───────────────────┘
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.20 |
| Development Framework | Hardhat |
| Blockchain Network | Polygon Mumbai Testnet |
| Frontend | Next.js 14 + React 18 |
| Styling | Tailwind CSS |
| Web3 Integration | ethers.js v6 |
| NFT Standard | ERC-721 |
| Testing | Hardhat + Ethers |

## 📦 Project Structure

```
PFTUS/
├── contracts/                     # Smart contracts
│   ├── PublicFundProject.sol     # Main fund management
│   ├── ApprovalNFT.sol           # NFT stamps
│   ├── ImpactScoreCalculator.sol # Trust index
│   └── ZKVerifier.sol            # ZK verification
├── scripts/                       # Deployment scripts
│   └── deploy.ts
├── frontend/                      # Next.js application
│   ├── app/
│   │   ├── government/           # Government dashboard
│   │   ├── contractor/           # Contractor dashboard
│   │   ├── auditor/              # Auditor dashboard
│   │   └── explorer/             # Public explorer
│   └── utils/
│       ├── web3.ts               # Web3 utilities
│       └── ipfs.ts               # IPFS utilities
├── cursor_project_rules/          # Documentation
├── hardhat.config.ts             # Hardhat configuration
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ and npm
- MetaMask wallet
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Blockchain-based-Public-Fund-Tracking-Utilization-System

# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Environment Setup

```bash
# Root directory - for contracts
cp .env.example .env
# Edit .env and add your private key and API keys

# Frontend directory
cp frontend/.env.example frontend/.env.local
# Contract addresses will be added after deployment
```

### Compile Contracts

```bash
npm run compile
```

### Deploy Contracts

#### Option 1: Local Hardhat Network (for testing)

```bash
# Terminal 1 - Start local node
npm run node

# Terminal 2 - Deploy contracts
npm run deploy:local
```

#### Option 2: Polygon Mumbai Testnet

```bash
# Make sure you have test MATIC in your wallet
# Get free MATIC from: https://faucet.polygon.technology/

npm run deploy:mumbai
```

### Update Frontend Configuration

After deployment, copy contract addresses from `deployment-addresses.json` to `frontend/.env.local`:

```env
NEXT_PUBLIC_PUBLIC_FUND_PROJECT_ADDRESS=0x...
NEXT_PUBLIC_APPROVAL_NFT_ADDRESS=0x...
NEXT_PUBLIC_IMPACT_SCORE_ADDRESS=0x...
NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x...
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎬 Demo Flow

### 1. Government Creates Project

1. Connect wallet as Government
2. Navigate to Government Dashboard
3. Click "Create New Project"
4. Fill in:
   - Project Title: "City Road Construction"
   - Description: "Main road repair and expansion"
   - Contractor Address
   - Auditor Address
   - Milestones (3):
     - Foundation Work - 30 ETH
     - Road Construction - 50 ETH
     - Final Touches - 20 ETH
5. Submit transaction
6. Allocate funds (100 ETH) to activate project

### 2. Contractor Requests Milestone

1. Connect wallet as Contractor
2. View assigned projects
3. Request Milestone #1 release
4. Upload proof document (PDF/Image)
5. Submit for review

### 3. Auditor Reviews & Approves

1. Connect wallet as Auditor
2. View pending approvals
3. Review proof document
4. Approve milestone
5. NFT approval stamp minted automatically
6. Funds released to contractor

### 4. Public Views Transparency

1. Navigate to Public Explorer (no wallet needed)
2. Browse all projects
3. Click project to view:
   - Real-time progress
   - Fund utilization
   - Impact Score
   - Audit trail
   - NFT approval stamps

## 📊 Smart Contract Functions

### PublicFundProject.sol

**Government Functions:**
- `createProject()` - Initialize new project with milestones
- `allocateFunds()` - Deposit funds to contract
- `pauseProject()` / `resumeProject()` - Emergency controls

**Contractor Functions:**
- `requestMilestoneRelease()` - Request next milestone
- `submitProof()` - Upload completion proof
- `resubmitMilestone()` - Resubmit after rejection

**Auditor Functions:**
- `approveMilestone()` - Approve and release funds
- `rejectMilestone()` - Reject with reason

**Public View Functions:**
- `getProjectDetails()` - Get project info
- `getProjectMilestones()` - Get all milestones
- `getAuditTrail()` - Get transaction history
- `getProjectProgress()` - Get completion percentage

## 🔐 Security Features

- ✅ Role-based access control (Government, Contractor, Auditor)
- ✅ Reentrancy protection
- ✅ OpenZeppelin security standards
- ✅ Pausable mechanism for emergencies
- ✅ Sequential milestone releases
- ✅ Immutable audit trail

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run coverage
npm run coverage
```

## 🌐 Deployment & Verification

### Verify Contracts on PolygonScan

```bash
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Example:
```bash
npx hardhat verify --network mumbai 0x123... "0xNFTAddress" "0xScoreAddress"
```

## 📈 Impact Score Calculation

**Formula:**
```
Total Score (0-100) = 
  On-Time Completion × 40% +
  Budget Adherence × 30% +
  Audit Approval Rate × 20% +
  Transparency Score × 10%
```

**Rating:**
- 85-100: Excellent (Green)
- 70-84: Good (Yellow)
- 50-69: Average (Orange)
- 0-49: Poor (Red)

## 🎤 Seminar Presentation

### Key Points to Highlight

1. **Problem:** Lack of transparency in public fund management
2. **Solution:** Blockchain-based immutable record system
3. **Novel Features:**
   - Milestone-based escrow
   - NFT approval stamps
   - Zero-knowledge proofs
   - Public trust index
4. **Demo:** Live walkthrough of complete project lifecycle
5. **Impact:** Reduced corruption, increased accountability

### Demo Script

See `presentation/DEMO_SCRIPT.md` for detailed presentation flow.

## 🔮 Future Enhancements

- [ ] Multi-project portfolio tracking
- [ ] AI-based anomaly detection
- [ ] Mobile app for citizens
- [ ] Integration with government ERP systems
- [ ] Cross-chain interoperability
- [ ] Real-time notifications via webhooks
- [ ] Advanced analytics dashboard
- [ ] Support for multiple currencies

## 🤝 Contributing

This is a seminar project. For educational purposes.

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

PFTUS Development Team

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check documentation in `cursor_project_rules/`

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Polygon for scalable blockchain infrastructure
- Next.js team for amazing React framework
- Hardhat for development tools

---

**Built with ❤️ for transparency, accountability, and public trust in governance**

🌟 **Star this repository if you find it useful!**

