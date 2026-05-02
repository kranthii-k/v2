import axios from 'axios';
import { ethers } from 'ethers';

/**
 * IPFS Helper Functions
 * For demo purposes, we'll simulate IPFS uploads with hash generation
 * In production, integrate with Pinata, IPFS HTTP API, or web3.storage
 */

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

/**
 * Upload file to IPFS (Pinata)
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const localFormData = new FormData();
    localFormData.append('file', file);

    const localResponse = await axios.post('/api/upload', localFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (localResponse.data?.hash) {
      return localResponse.data.hash;
    }

    // For demo mode, generate a fake hash
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return generateMockIPFSHash(file.name);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    // Fallback to mock hash
    return generateMockIPFSHash(file.name);
  }
};

/**
 * Upload JSON metadata to IPFS
 */
export const uploadJSONToIPFS = async (metadata: object): Promise<string> => {
  try {
    // For demo mode, generate a fake hash
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return generateMockIPFSHash(JSON.stringify(metadata));
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    return generateMockIPFSHash(JSON.stringify(metadata));
  }
};

/**
 * Generate mock IPFS hash for demo purposes
 */
export const generateMockIPFSHash = (content: string): string => {
  // Generate a deterministic hash from content
  const hash = ethers.keccak256(ethers.toUtf8Bytes(content));
  // Convert to IPFS-like format (Qm...)
  return `Qm${hash.slice(2, 48)}`;
};

/**
 * Get IPFS URL from hash
 */
export const getIPFSUrl = (hash: string): string => {
  if (hash.startsWith('/uploads/') || hash.startsWith('http://') || hash.startsWith('https://')) {
    return hash;
  }

  return `${PINATA_GATEWAY}${hash}`;
};

/**
 * Generate proof hash from file
 */
export const generateProofHash = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const hash = ethers.keccak256(uint8Array);
      resolve(hash);
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Upload proof document and return both IPFS hash and content hash
 */
export const uploadProofDocument = async (file: File): Promise<{
  ipfsHash: string;
  contentHash: string;
}> => {
  const [ipfsHash, contentHash] = await Promise.all([
    uploadToIPFS(file),
    generateProofHash(file),
  ]);

  return {
    ipfsHash,
    contentHash,
  };
};

/**
 * Create NFT metadata for approval stamp
 */
export const createApprovalNFTMetadata = async (
  projectId: number,
  projectTitle: string,
  milestoneId: number,
  milestoneTitle: string,
  auditorAddress: string,
  approvalDate: Date,
  fundAmount: string
): Promise<string> => {
  const metadata = {
    name: `Public Fund Approval Seal #${projectId}-${milestoneId}`,
    description: `Official verification of ${milestoneTitle} completion for ${projectTitle}`,
    image: 'ipfs://QmYourDefaultSealImageHash/seal.png', // Replace with actual seal image
    attributes: [
      {
        trait_type: 'Project ID',
        value: projectId.toString(),
      },
      {
        trait_type: 'Project',
        value: projectTitle,
      },
      {
        trait_type: 'Milestone ID',
        value: milestoneId.toString(),
      },
      {
        trait_type: 'Milestone',
        value: milestoneTitle,
      },
      {
        trait_type: 'Approved By',
        value: auditorAddress,
      },
      {
        trait_type: 'Approval Date',
        value: approvalDate.toISOString(),
      },
      {
        trait_type: 'Fund Amount (ETH)',
        value: fundAmount,
      },
      {
        trait_type: 'Type',
        value: 'Public Fund Approval',
      },
    ],
  };

  return await uploadJSONToIPFS(metadata);
};

/**
 * Fetch file from IPFS
 */
export const fetchFromIPFS = async (hash: string): Promise<any> => {
  try {
    const response = await axios.get(getIPFSUrl(hash));
    return response.data;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

/**
 * Check if file/hash exists on IPFS
 */
export const checkIPFSExists = async (hash: string): Promise<boolean> => {
  try {
    await axios.head(getIPFSUrl(hash));
    return true;
  } catch (error) {
    return false;
  }
};
