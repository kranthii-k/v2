import { ethers } from 'ethers';

// Contract ABIs (Import from generated files or define here)
// For demo purposes, we'll use simplified ABIs

export const PUBLIC_FUND_PROJECT_ABI = [
  "function createProject(string memory _title, string memory _description, address _contractor, address _auditor, string[] memory _milestoneTitles, string[] memory _milestoneDescriptions, uint256[] memory _milestoneAmounts, uint256[] memory _milestoneEstimatedDates) external returns (uint256)",
  "function donateToWallet() external payable",
  "function donationPool() external view returns (uint256)",
  "function allocateFunds(uint256 _projectId) external payable",
  "function requestMilestoneRelease(uint256 _projectId, uint256 _milestoneId) external",
  "function submitProof(uint256 _projectId, uint256 _milestoneId, string memory _proofHash) external",
  "function resubmitMilestone(uint256 _projectId, uint256 _milestoneId, string memory _newProofHash) external",
  "function approveMilestone(uint256 _projectId, uint256 _milestoneId) external",
  "function rejectMilestone(uint256 _projectId, uint256 _milestoneId, string memory _reason) external",
  "function raiseAnomalyFlag(uint256 _projectId, uint256 _milestoneId, uint256 _score, string memory _reason) external",
  "function approveAnomalyClearance(uint256 _projectId, uint256 _milestoneId) external",
  "function anomalyFlags(bytes32 key) external view returns (bool active, bool cleared, uint256 score, uint256 approvals, string memory reason, uint256 raisedAt)",
  "function anomalyMultiSigApprovals(bytes32 key, address account) external view returns (bool)",
  "function ANOMALY_MULTISIG_THRESHOLD() external view returns (uint256)",
  "function getProjectDetails(uint256 _projectId) external view returns (tuple(uint256 projectId, string title, string description, uint256 allocatedFunds, uint256 spentFunds, uint256 remainingFunds, address governmentAddress, address contractorAddress, address auditorAddress, uint8 status, uint256 createdAt, uint256 lastUpdated, uint256 currentMilestoneIndex))",
  "function getProjectMilestones(uint256 _projectId) external view returns (tuple(uint256 milestoneId, string title, string description, uint256 fundAmount, uint8 status, string proofHash, uint256 requestedAt, uint256 approvedAt, address approvedBy, uint256 nftTokenId, string rejectionReason, uint256 estimatedCompletionDate, uint256 actualCompletionDate)[])",
  "function getProjectProgress(uint256 _projectId) external view returns (uint256)",
  "function getAuditTrail(uint256 _projectId) external view returns (tuple(uint256 timestamp, address actor, string action, uint256 milestoneId, uint256 amount, string txHash)[])",
  "function getAllProjects() external view returns (tuple(uint256 projectId, string title, string description, uint256 allocatedFunds, uint256 spentFunds, uint256 remainingFunds, address governmentAddress, address contractorAddress, address auditorAddress, uint8 status, uint256 createdAt, uint256 lastUpdated, uint256 currentMilestoneIndex)[])",
  "function getTotalProjects() external view returns (uint256)",
  "function GOVERNMENT_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "event ProjectCreated(uint256 indexed projectId, string title, uint256 budget, address contractor, address auditor)",
  "event DonationReceived(address indexed donor, uint256 amount)",
  "event FundsAllocated(uint256 indexed projectId, uint256 amount, address by)",
  "event MilestoneRequested(uint256 indexed projectId, uint256 milestoneId, address contractor)",
  "event ProofSubmitted(uint256 indexed projectId, uint256 milestoneId, string proofHash)",
  "event MilestoneApproved(uint256 indexed projectId, uint256 milestoneId, uint256 nftTokenId, address auditor)",
  "event FundsReleased(uint256 indexed projectId, uint256 milestoneId, uint256 amount, address to)"
  ,"event AnomalyFlagRaised(uint256 indexed projectId, uint256 indexed milestoneId, uint256 score, string reason, address raisedBy)",
  "event AnomalyFlagApproved(uint256 indexed projectId, uint256 indexed milestoneId, address approver, uint256 approvals)",
  "event AnomalyFlagCleared(uint256 indexed projectId, uint256 indexed milestoneId)"
];

export const APPROVAL_NFT_ABI = [
  "function getApprovalMetadata(uint256 _tokenId) external view returns (tuple(uint256 projectId, uint256 milestoneId, string milestoneTitle, address auditor, uint256 approvalDate, bool exists))",
  "function getNFTForMilestone(uint256 _projectId, uint256 _milestoneId) external view returns (uint256)",
  "function getProjectNFTs(uint256 _projectId, uint256 _milestoneCount) external view returns (uint256[])",
  "function getTotalApprovals() external view returns (uint256)"
];

export const IMPACT_SCORE_ABI = [
  "function calculateScore(uint256 _projectId) external view returns (uint256)",
  "function calculateDetailedScore(uint256 _projectId) external view returns (tuple(uint256 onTimeScore, uint256 budgetScore, uint256 approvalScore, uint256 transparencyScore, uint256 totalScore, string rating))",
  "function getColorCode(uint256 _score) external pure returns (string memory)",
  "function getScoreInterpretation(uint256 _score) external pure returns (string memory)"
];

// Contract addresses (Update these after deployment)
// Hardcoded for Hardhat Local - these are deterministic addresses
export const CONTRACT_ADDRESSES = {
  PUBLIC_FUND_PROJECT: process.env.NEXT_PUBLIC_PUBLIC_FUND_PROJECT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  APPROVAL_NFT: process.env.NEXT_PUBLIC_APPROVAL_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  IMPACT_SCORE_CALCULATOR: process.env.NEXT_PUBLIC_IMPACT_SCORE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ZK_VERIFIER: process.env.NEXT_PUBLIC_ZK_VERIFIER_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
};

// Network configuration
// For local development, use Hardhat Local
// For production, switch to Polygon Mumbai
export const NETWORK_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337),
  name: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Hardhat Local',
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC || 'http://127.0.0.1:8545',
  blockExplorer: process.env.NEXT_PUBLIC_BLOCK_EXPLORER || '',
};

export const LOCAL_GOVERNMENT_ACCOUNT =
  process.env.NEXT_PUBLIC_LOCAL_GOVERNMENT_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

/**
 * Get Web3 Provider (MetaMask)
 */
export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('MetaMask not installed');
};

/**
 * Get read-only JSON-RPC provider for contract reads.
 */
export const getReadOnlyProvider = () => {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl, undefined, {
    staticNetwork: true,
  });
};

/**
 * Get Signer
 */
export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

/**
 * Connect Wallet
 */
export const connectWallet = async () => {
  try {
    const provider = getProvider();
    await provider.send('eth_requestAccounts', []);
    const signer = await getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    
    return {
      address,
      balance: ethers.formatEther(balance),
      connected: true,
    };
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    throw new Error(error.message || 'Failed to connect wallet');
  }
};

/**
 * Read already-authorized wallet account without opening a MetaMask prompt.
 */
export const getConnectedWallet = async () => {
  if (typeof window === 'undefined' || !window.ethereum?.request) {
    return null;
  }

  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  const address = accounts?.[0];
  if (!address) {
    return null;
  }

  const provider = getProvider();
  const balance = await provider.getBalance(address);

  return {
    address,
    balance: ethers.formatEther(balance),
    connected: true,
  };
};

/**
 * Disconnect Wallet
 */
export const disconnectWallet = async () => {
  console.log('🔌 disconnectWallet called');
  if (typeof window !== 'undefined' && window.ethereum?.request) {
    try {
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.warn('Wallet permission revoke was skipped or unsupported:', error);
    }
  }

  // Clear wallet state
  if (typeof window !== 'undefined') {
    // Clear any stored wallet data
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    console.log('✅ LocalStorage cleared');
  } else {
    console.warn('⚠️ Window is undefined');
  }
  // Some wallets do not support permission revocation; in that case we still clear app state.
};

/**
 * Switch to correct network
 */
export const switchNetwork = async () => {
  try {
    const chainId = `0x${NETWORK_CONFIG.chainId.toString(16)}`;
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (error: any) {
    // Network not added, add it
    if (error.code === 4902 || error.code === -32002) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
            chainName: NETWORK_CONFIG.name,
            rpcUrls: [NETWORK_CONFIG.rpcUrl],
            blockExplorerUrls: NETWORK_CONFIG.blockExplorer ? [NETWORK_CONFIG.blockExplorer] : [],
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      });
    }
  }
};

/**
 * Ensure we're on the correct network before transactions
 */
export const ensureCorrectNetwork = async () => {
  try {
    const readOnlyProvider = getReadOnlyProvider();

    try {
      await readOnlyProvider.getBlockNumber();
    } catch (rpcError: any) {
      console.error('RPC connection error:', rpcError);
      throw new Error('Cannot connect to Hardhat node. Please ensure it is running: npm run node');
    }

    const provider = getProvider();
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    
    if (currentChainId !== NETWORK_CONFIG.chainId) {
      await switchNetwork();
      // Wait a bit for network switch
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error: any) {
    console.error('Error ensuring correct network:', error);
    if (error.message?.includes('RPC endpoint')) {
      throw new Error('Hardhat node is not responding. Please restart it: npm run node');
    }
    throw error;
  }
};

/**
 * Get PublicFundProject contract instance
 */
export const getPublicFundProjectContract = async (withSigner = true) => {
  if (withSigner) {
    const signer = await getSigner();
    // Create contract with explicit address (not ENS name)
    const contractAddress = ethers.getAddress(CONTRACT_ADDRESSES.PUBLIC_FUND_PROJECT);
    return new ethers.Contract(
      contractAddress,
      PUBLIC_FUND_PROJECT_ABI,
      signer
    );
  } else {
    const provider = getReadOnlyProvider();
    const contractAddress = ethers.getAddress(CONTRACT_ADDRESSES.PUBLIC_FUND_PROJECT);
    return new ethers.Contract(
      contractAddress,
      PUBLIC_FUND_PROJECT_ABI,
      provider
    );
  }
};

/**
 * Get ApprovalNFT contract instance
 */
export const getApprovalNFTContract = async (withSigner = false) => {
  if (withSigner) {
    const signer = await getSigner();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.APPROVAL_NFT,
      APPROVAL_NFT_ABI,
      signer
    );
  } else {
    const provider = getReadOnlyProvider();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.APPROVAL_NFT,
      APPROVAL_NFT_ABI,
      provider
    );
  }
};

/**
 * Get ImpactScoreCalculator contract instance
 */
export const getImpactScoreContract = async () => {
  const provider = getReadOnlyProvider();
  return new ethers.Contract(
    CONTRACT_ADDRESSES.IMPACT_SCORE_CALCULATOR,
    IMPACT_SCORE_ABI,
    provider
  );
};

/**
 * Format address for display
 */
export const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format timestamp to date
 */
export const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format amount (ETH to display)
 */
export const formatAmount = (amount: string | bigint) => {
  return parseFloat(ethers.formatEther(amount)).toFixed(4);
};

/**
 * Parse amount (display to Wei)
 */
export const parseAmount = (amount: string) => {
  return ethers.parseEther(amount);
};

/**
 * Get project status label
 */
export const getProjectStatusLabel = (status: number) => {
  const labels = ['Pending', 'Active', 'Completed', 'Suspended'];
  return labels[status] || 'Unknown';
};

/**
 * Get milestone status label
 */
export const getMilestoneStatusLabel = (status: number) => {
  const labels = ['Pending', 'In Progress', 'Under Review', 'Approved', 'Rejected'];
  return labels[status] || 'Unknown';
};

/**
 * Get status color
 */
export const getStatusColor = (status: number, type: 'project' | 'milestone') => {
  if (type === 'project') {
    const colors = ['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500'];
    return colors[status] || 'bg-gray-500';
  } else {
    const colors = ['bg-gray-500', 'bg-yellow-500', 'bg-orange-500', 'bg-green-500', 'bg-red-500'];
    return colors[status] || 'bg-gray-500';
  }
};

// Type definitions
declare global {
  interface Window {
    ethereum?: any;
  }
}
