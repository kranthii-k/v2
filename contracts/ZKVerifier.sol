// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZKVerifier
 * @dev Simplified Zero-Knowledge Proof Verification System
 * @notice This implements a commitment-reveal scheme for privacy-preserving proof verification
 * 
 * CONCEPT: Citizens can verify that proofs exist and are verified WITHOUT seeing sensitive invoice details
 * 
 * How it works:
 * 1. Auditor uploads hash of sensitive document (commitment)
 * 2. System stores hash on-chain
 * 3. Citizens can verify hash exists (proof was submitted)
 * 4. Actual sensitive data remains private off-chain
 * 5. Auditor can later reveal specific parts if needed (selective disclosure)
 */
contract ZKVerifier {
    
    // ============ Structs ============
    struct ProofCommitment {
        bytes32 proofHash;          // Hash of the proof document
        bytes32 metadataHash;       // Hash of metadata (amount, vendor, etc.)
        address submitter;          // Who submitted (auditor)
        uint256 timestamp;          // When submitted
        bool verified;              // Whether auditor has verified
        bool exists;                // Whether commitment exists
    }
    
    struct SelectiveDisclosure {
        string field;               // Field name (e.g., "amount", "vendor")
        bytes32 valueHash;          // Hash of the value
        bool disclosed;             // Whether disclosed to public
    }
    
    // ============ State Variables ============
    mapping(uint256 => mapping(uint256 => ProofCommitment)) public projectMilestoneProofs;
    mapping(uint256 => mapping(uint256 => mapping(string => SelectiveDisclosure))) public disclosures;
    
    // ============ Events ============
    event ProofCommitted(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        bytes32 proofHash,
        address submitter
    );
    
    event ProofVerified(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address verifier
    );
    
    event FieldDisclosed(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        string field,
        bytes32 valueHash
    );
    
    // ============ Main Functions ============
    
    /**
     * @dev Commit a proof (upload hash without revealing content)
     */
    function commitProof(
        uint256 _projectId,
        uint256 _milestoneId,
        bytes32 _proofHash,
        bytes32 _metadataHash
    ) external {
        require(_proofHash != bytes32(0), "Invalid proof hash");
        require(_metadataHash != bytes32(0), "Invalid metadata hash");
        
        projectMilestoneProofs[_projectId][_milestoneId] = ProofCommitment({
            proofHash: _proofHash,
            metadataHash: _metadataHash,
            submitter: msg.sender,
            timestamp: block.timestamp,
            verified: false,
            exists: true
        });
        
        emit ProofCommitted(_projectId, _milestoneId, _proofHash, msg.sender);
    }
    
    /**
     * @dev Verify a committed proof (auditor confirms it's legitimate)
     */
    function verifyProof(uint256 _projectId, uint256 _milestoneId) external {
        ProofCommitment storage proof = projectMilestoneProofs[_projectId][_milestoneId];
        require(proof.exists, "Proof commitment does not exist");
        require(proof.submitter == msg.sender, "Only submitter can verify");
        
        proof.verified = true;
        
        emit ProofVerified(_projectId, _milestoneId, msg.sender);
    }
    
    /**
     * @dev Selectively disclose a specific field (e.g., total amount, without vendor details)
     */
    function discloseField(
        uint256 _projectId,
        uint256 _milestoneId,
        string memory _field,
        string memory _value
    ) external {
        ProofCommitment storage proof = projectMilestoneProofs[_projectId][_milestoneId];
        require(proof.exists, "Proof does not exist");
        require(proof.submitter == msg.sender, "Only submitter can disclose");
        
        bytes32 valueHash = keccak256(abi.encodePacked(_value));
        
        disclosures[_projectId][_milestoneId][_field] = SelectiveDisclosure({
            field: _field,
            valueHash: valueHash,
            disclosed: true
        });
        
        emit FieldDisclosed(_projectId, _milestoneId, _field, valueHash);
    }
    
    // ============ Public Verification Functions ============
    
    /**
     * @dev Check if proof exists for a milestone (public can verify)
     */
    function proofExists(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (bool) 
    {
        return projectMilestoneProofs[_projectId][_milestoneId].exists;
    }
    
    /**
     * @dev Check if proof has been verified by auditor (public can verify)
     */
    function isProofVerified(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (bool) 
    {
        return projectMilestoneProofs[_projectId][_milestoneId].verified;
    }
    
    /**
     * @dev Get proof commitment details (without revealing actual content)
     */
    function getProofCommitment(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (
            bytes32 proofHash,
            bytes32 metadataHash,
            address submitter,
            uint256 timestamp,
            bool verified
        ) 
    {
        ProofCommitment memory proof = projectMilestoneProofs[_projectId][_milestoneId];
        require(proof.exists, "Proof does not exist");
        
        return (
            proof.proofHash,
            proof.metadataHash,
            proof.submitter,
            proof.timestamp,
            proof.verified
        );
    }
    
    /**
     * @dev Verify a claimed value against stored hash (zero-knowledge verification)
     * @notice Public can verify if a value matches without seeing original
     */
    function verifyClaimedValue(
        uint256 _projectId,
        uint256 _milestoneId,
        string memory _field,
        string memory _claimedValue
    ) external view returns (bool) {
        SelectiveDisclosure memory disclosure = disclosures[_projectId][_milestoneId][_field];
        require(disclosure.disclosed, "Field not disclosed");
        
        bytes32 claimedHash = keccak256(abi.encodePacked(_claimedValue));
        return claimedHash == disclosure.valueHash;
    }
    
    /**
     * @dev Check if a specific field has been disclosed
     */
    function isFieldDisclosed(
        uint256 _projectId,
        uint256 _milestoneId,
        string memory _field
    ) external view returns (bool) {
        return disclosures[_projectId][_milestoneId][_field].disclosed;
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Generate proof hash from document content (helper for off-chain use)
     * @notice This would typically be done off-chain, but provided for testing
     */
    function generateProofHash(string memory _documentContent) 
        external 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(_documentContent));
    }
    
    /**
     * @dev Generate metadata hash from multiple fields
     */
    function generateMetadataHash(
        string memory _amount,
        string memory _vendor,
        string memory _date
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_amount, _vendor, _date));
    }
    
    /**
     * @dev Batch verify multiple proofs exist
     */
    function batchVerifyProofsExist(
        uint256 _projectId,
        uint256[] memory _milestoneIds
    ) external view returns (bool[] memory) {
        bool[] memory results = new bool[](_milestoneIds.length);
        for (uint256 i = 0; i < _milestoneIds.length; i++) {
            results[i] = projectMilestoneProofs[_projectId][_milestoneIds[i]].exists;
        }
        return results;
    }
}

