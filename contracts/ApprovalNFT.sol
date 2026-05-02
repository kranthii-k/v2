// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ApprovalNFT
 * @dev NFT contract for minting public fund approval stamps
 * @notice Each NFT represents an auditor-verified milestone completion
 */
contract ApprovalNFT is ERC721, ERC721URIStorage, Ownable {
    
    uint256 private _tokenIdCounter;
    
    // ============ Structs ============
    struct ApprovalMetadata {
        uint256 projectId;
        uint256 milestoneId;
        string milestoneTitle;
        address auditor;
        uint256 approvalDate;
        bool exists;
    }
    
    // ============ State Variables ============
    mapping(uint256 => ApprovalMetadata) public approvalData;
    mapping(uint256 => mapping(uint256 => uint256)) public projectMilestoneToNFT; // projectId => milestoneId => tokenId
    
    // ============ Events ============
    event ApprovalStampMinted(
        uint256 indexed tokenId,
        uint256 indexed projectId,
        uint256 milestoneId,
        address auditor
    );
    
    // ============ Constructor ============
    constructor(address initialOwner) ERC721("Public Fund Approval Seal", "PFAS") Ownable(initialOwner) {}
    
    // ============ Main Functions ============
    
    /**
     * @dev Mint a new approval stamp NFT
     * @notice Only owner (PublicFundProject contract) can mint
     */
    function mintApprovalStamp(
        uint256 _projectId,
        uint256 _milestoneId,
        string memory _milestoneTitle,
        address _auditor
    ) external onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        // Mint NFT to auditor as proof of their verification
        _safeMint(_auditor, tokenId);
        
        // Store metadata
        approvalData[tokenId] = ApprovalMetadata({
            projectId: _projectId,
            milestoneId: _milestoneId,
            milestoneTitle: _milestoneTitle,
            auditor: _auditor,
            approvalDate: block.timestamp,
            exists: true
        });
        
        projectMilestoneToNFT[_projectId][_milestoneId] = tokenId;
        
        // Set token URI (can be updated to point to IPFS metadata)
        string memory uri = _generateTokenURI(_projectId, _milestoneId, _milestoneTitle);
        _setTokenURI(tokenId, uri);
        
        emit ApprovalStampMinted(tokenId, _projectId, _milestoneId, _auditor);
        
        return tokenId;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get approval metadata for a token
     */
    function getApprovalMetadata(uint256 _tokenId) 
        external 
        view 
        returns (ApprovalMetadata memory) 
    {
        require(approvalData[_tokenId].exists, "Token does not exist");
        return approvalData[_tokenId];
    }
    
    /**
     * @dev Get NFT token ID for a specific project milestone
     */
    function getNFTForMilestone(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (uint256) 
    {
        return projectMilestoneToNFT[_projectId][_milestoneId];
    }
    
    /**
     * @dev Get all NFTs for a specific project
     */
    function getProjectNFTs(uint256 _projectId, uint256 _milestoneCount) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory nfts = new uint256[](_milestoneCount);
        for (uint256 i = 0; i < _milestoneCount; i++) {
            nfts[i] = projectMilestoneToNFT[_projectId][i];
        }
        return nfts;
    }
    
    /**
     * @dev Get total number of approval stamps minted
     */
    function getTotalApprovals() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Check if a milestone has been approved (NFT exists)
     */
    function isMilestoneApproved(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (bool) 
    {
        return projectMilestoneToNFT[_projectId][_milestoneId] != 0;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Generate token URI metadata
     * @notice In production, this would point to IPFS with full metadata JSON
     */
    function _generateTokenURI(
        uint256 _projectId,
        uint256 _milestoneId,
        string memory /* _milestoneTitle */
    ) internal pure returns (string memory) {
        // Simplified version - in production, upload to IPFS
        return string(
            abi.encodePacked(
                "ipfs://approval-metadata/",
                "project-", _uint2str(_projectId),
                "/milestone-", _uint2str(_milestoneId),
                ".json"
            )
        );
    }
    
    /**
     * @dev Convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
    
    // ============ Override Functions ============
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Override to make approval stamps non-transferable (soulbound)
     * @notice This ensures approval stamps remain with the auditor who issued them
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Approval stamps are non-transferable (soulbound)");
        return super._update(to, tokenId, auth);
    }
}

