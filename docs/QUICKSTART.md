# ⚡ PFTUS Quick Start

Get up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- MetaMask extension installed
- Git installed

## 🚀 Fast Setup

```bash
# 1. Clone & Install
git clone <repository-url>
cd Blockchain-based-Public-Fund-Tracking-Utilization-System
npm install
cd frontend && npm install && cd ..

# 2. Setup Environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# 3. Compile Contracts
npm run compile

# 4. Deploy (Local Testnet)
# Terminal 1:
npm run node

# Terminal 2:
npm run deploy:local

# 5. Configure Frontend
# Copy addresses from terminal output
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with contract addresses

# 6. Run Frontend
cd frontend
npm run dev
```

Open http://localhost:3000 🎉

## 🎬 Quick Demo

### Create Project (Government)
1. Connect wallet → Government Dashboard
2. Create New Project → Fill form → Submit
3. Allocate 1 ETH → Submit

### Request Milestone (Contractor)
1. Switch wallet → Contractor Dashboard
2. Request Release → Upload Proof

### Approve (Auditor)
1. Switch wallet → Auditor Dashboard
2. Review → Approve

### View Public
1. Open Public Explorer (no wallet needed)
2. See complete transparency!

## 📚 Full Documentation

- [Complete Setup Guide](SETUP_GUIDE.md)
- [README](README.md)
- [Demo Script](presentation/DEMO_SCRIPT.md)

## 🆘 Issues?

Check [Troubleshooting](SETUP_GUIDE.md#-troubleshooting) section.

---

**Ready for your seminar!** 🎤

