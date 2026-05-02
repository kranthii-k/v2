# Technical Specifications - PFTUS

## 🔐 Smart Contract Specifications

### 1. PublicFundProject.sol

#### State Variables
```solidity
uint256 projectId
string projectTitle
string projectDescription
uint256 allocatedFunds
uint256 spentFunds
uint256 remainingFunds
address governmentAddress
address contractorAddress
address auditorAddress
Milestone[] milestones
uint256 currentMilestoneIndex
ProjectStatus status (Pending, Active, Completed, Suspended)
uint256 createdAt
uint256 lastUpdated
```

#### Milestone Structure
```solidity
struct Milestone {
    uint256 milestoneId
    string title
    string description
    uint256 fundAmount
    MilestoneStatus status (Pending, InProgress, UnderReview, Approved, Rejected)
    string proofHash (IPFS hash)
    uint256 requestedAt
    uint256 approvedAt
    address approvedBy
    uint256 nftTokenId
}
```

#### Core Functions
1. `createProject()` - Initialize new project
2. `allocateFunds()` - Government deposits funds
3. `requestMilestoneRelease()` - Contractor requests funds
4. `submitProof()` - Upload milestone completion proof
5. `verifyMilestone()` - Auditor approves/rejects
6. `releaseFunds()` - Auto-release on approval
7. `getProjectDetails()` - Fetch project info
8. `getMilestoneStatus()` - Get milestone data
9. `getAuditTrail()` - Complete transaction history
10. `pauseProject()` - Emergency pause
11. `resumeProject()` - Resume after pause

#### Events
```solidity
event ProjectCreated(uint256 projectId, string title, uint256 budget)
event FundsAllocated(uint256 projectId, uint256 amount)
event MilestoneRequested(uint256 projectId, uint256 milestoneId)
event ProofSubmitted(uint256 projectId, uint256 milestoneId, string proofHash)
event MilestoneApproved(uint256 projectId, uint256 milestoneId, uint256 nftId)
event MilestoneRejected(uint256 projectId, uint256 milestoneId, string reason)
event FundsReleased(uint256 projectId, uint256 milestoneId, uint256 amount)
event ProjectCompleted(uint256 projectId)
```

#### Modifiers
```solidity
onlyGovernment
onlyContractor
onlyAuditor
onlyActiveProject
milestoneExists
```

---

### 2. ApprovalNFT.sol

#### Features
- ERC-721 compliant NFT contract
- Each NFT represents verified milestone approval
- Immutable proof of auditor verification
- Publicly viewable on blockchain explorers

#### Metadata Structure
```json
{
  "name": "Public Fund Approval Seal #123",
  "description": "Official verification of Milestone X completion",
  "image": "ipfs://QmHash/seal.png",
  "attributes": [
    {
      "trait_type": "Project",
      "value": "City Road Construction"
    },
    {
      "trait_type": "Milestone",
      "value": "Foundation Work"
    },
    {
      "trait_type": "Approved By",
      "value": "0x..."
    },
    {
      "trait_type": "Approval Date",
      "value": "2025-10-27"
    },
    {
      "trait_type": "Fund Amount",
      "value": "30 ETH"
    }
  ]
}
```

---

### 3. ZKVerifier.sol (Simplified Zero-Knowledge)

#### Concept
Instead of full ZK-SNARKs (complex), we implement a simplified commitment-reveal scheme:

1. **Commit Phase**: Auditor uploads proof hash (hash of sensitive invoice)
2. **Verification Phase**: Citizens can verify the hash matches without seeing actual invoice
3. **Public Transparency**: Everyone knows proof exists and is verified
4. **Privacy Maintained**: Sensitive vendor/pricing details remain private

#### Functions
```solidity
function commitProof(bytes32 proofHash) public onlyAuditor
function verifyProofExists(uint256 projectId, uint256 milestoneId) public view returns (bool)
function getProofHash(uint256 projectId, uint256 milestoneId) public view returns (bytes32)
```

---

### 4. ImpactScoreCalculator.sol

#### Scoring Algorithm

**Public Trust Index (0-100)**

```
Score = (
    OnTimeCompletion * 40 +
    BudgetAdherence * 30 +
    AuditApprovalRate * 20 +
    TransparencyScore * 10
)
```

#### Breakdown

**On-Time Completion (0-40 points)**
```
= (Milestones completed on-time / Total milestones) * 40
```

**Budget Adherence (0-30 points)**
```
= (1 - |AllocatedFunds - ActualSpent| / AllocatedFunds) * 30
```

**Audit Approval Rate (0-20 points)**
```
= (Approved milestones / Total submitted milestones) * 20
```

**Transparency Score (0-10 points)**
```
= (Documents uploaded / Total milestones) * 10
```

#### Color Coding for UI
- 🟢 **85-100**: Excellent (Green)
- 🟡 **70-84**: Good (Yellow)
- 🟠 **50-69**: Average (Orange)
- 🔴 **0-49**: Poor (Red)

---

## 🎨 Frontend Specifications

### Technology Stack
- **Framework**: Next.js 14+ (React 18+)
- **Styling**: Tailwind CSS
- **Web3**: ethers.js v6
- **State Management**: React Context API
- **Charts**: Chart.js / Recharts
- **Icons**: Heroicons / Lucide React

### Dashboard Components

#### Government Dashboard
```
Components:
- ProjectCreationForm
- FundAllocationPanel
- ProjectsOverviewGrid
- ActiveProjectsList
- BudgetSummaryChart
- TransactionHistory
```

#### Contractor Dashboard
```
Components:
- AssignedProjectsList
- MilestoneRequestForm
- ProofUploadInterface
- PaymentStatusTracker
- NotificationCenter
```

#### Auditor Dashboard
```
Components:
- PendingApprovalsQueue
- ProofDocumentViewer
- ApprovalInterface
- RejectionReasonForm
- AuditHistoryLog
```

#### Public Explorer
```
Components:
- ProjectSearchBar
- ProjectsListGrid
- ProjectDetailView
- FundFlowVisualization
- ProgressTimeline
- MilestoneCards
- NFTGallery
- ImpactScoreDisplay
- AuditTrailTable
```

### Color Scheme (Professional & Government-friendly)
```css
Primary: #2563eb (Blue)
Secondary: #059669 (Green)
Accent: #8b5cf6 (Purple)
Warning: #f59e0b (Orange)
Danger: #ef4444 (Red)
Background: #f9fafb (Light Gray)
Surface: #ffffff (White)
Text Primary: #111827 (Dark Gray)
Text Secondary: #6b7280 (Medium Gray)
```

---

## 🌐 API Endpoints (Optional Backend)

### REST API Structure

```
POST   /api/projects              - Create project
GET    /api/projects              - List all projects
GET    /api/projects/:id          - Get project details
POST   /api/milestones/request    - Request milestone release
POST   /api/milestones/verify     - Verify milestone
GET    /api/audit-trail/:id       - Get project audit trail
POST   /api/upload-proof          - Upload proof to IPFS
GET    /api/impact-score/:id      - Calculate impact score
```

---

## 📊 Database Schema (If using off-chain DB)

### Projects Table
```sql
id, title, description, budget, contractor, auditor, 
status, created_at, blockchain_tx_hash
```

### Milestones Table
```sql
id, project_id, title, amount, status, proof_url, 
requested_at, approved_at, nft_token_id
```

### Transactions Table
```sql
id, project_id, milestone_id, tx_hash, tx_type, 
amount, timestamp, from_address, to_address
```

---

## 🔒 Security Considerations

### Smart Contract Security
1. **Access Control**: Role-based permissions using OpenZeppelin
2. **Reentrancy Protection**: Use ReentrancyGuard
3. **Integer Overflow**: Solidity 0.8+ has built-in protection
4. **Pausable**: Emergency stop mechanism
5. **Upgradeable**: Use proxy pattern if needed

### Frontend Security
1. **Input Validation**: Sanitize all user inputs
2. **XSS Protection**: Use React's built-in escaping
3. **CSRF Protection**: Implement tokens for state-changing operations
4. **Wallet Security**: Never store private keys
5. **HTTPS Only**: Enforce secure connections

---

## 🧪 Testing Strategy

### Smart Contract Tests
```
- Unit tests for all functions
- Integration tests for complete flows
- Gas optimization tests
- Security audit with tools (Slither, MythX)
```

### Frontend Tests
```
- Component unit tests (Jest + React Testing Library)
- E2E tests (Playwright/Cypress)
- Web3 integration tests
- Responsive design tests
```

---

## 🚀 Deployment Strategy

### Testnet Deployment
1. Deploy contracts to Polygon Mumbai
2. Verify contracts on PolygonScan
3. Fund demo wallets with test MATIC
4. Configure frontend with contract addresses
5. Deploy frontend to Vercel/Netlify

### Mainnet Readiness (Future)
1. Complete security audit
2. Optimize gas costs
3. Setup multi-signature governance
4. Deploy with upgradeable proxies
5. Launch with limited scope, scale gradually

---

**This specification ensures a robust, secure, and scalable system.**

