// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ApprovalNFT.sol";
import "./ImpactScoreCalculator.sol";

/**
 * @title PublicFundProject
 * @dev Blockchain-based Public Fund Tracking & Utilization System
 * @notice This contract manages public fund allocation, milestone-based releases, and transparent tracking
 */
contract PublicFundProject is ReentrancyGuard, Pausable, AccessControl {
    
    // ============ Roles ============
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");
    bytes32 public constant CONTRACTOR_ROLE = keccak256("CONTRACTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // ============ Enums ============
    enum ProjectStatus { Pending, Active, Completed, Suspended }
    enum MilestoneStatus { Pending, InProgress, UnderReview, Approved, Rejected }
    
    // ============ Structs ============
    struct Milestone {
        uint256 milestoneId;
        string title;
        string description;
        uint256 fundAmount;
        MilestoneStatus status;
        string proofHash; // IPFS hash of proof documents
        uint256 requestedAt;
        uint256 approvedAt;
        address approvedBy;
        uint256 nftTokenId;
        string rejectionReason;
        uint256 estimatedCompletionDate;
        uint256 actualCompletionDate;
    }
    
    struct Project {
        uint256 projectId;
        string title;
        string description;
        uint256 allocatedFunds;
        uint256 spentFunds;
        uint256 remainingFunds;
        address governmentAddress;
        address contractorAddress;
        address auditorAddress;
        ProjectStatus status;
        uint256 createdAt;
        uint256 lastUpdated;
        uint256 currentMilestoneIndex;
    }
    
    struct AuditTrailEntry {
        uint256 timestamp;
        address actor;
        string action;
        uint256 milestoneId;
        uint256 amount;
        string txHash;
    }

    struct AnomalyFlag {
        bool active;
        bool cleared;
        uint256 score;
        uint256 approvals;
        string reason;
        uint256 raisedAt;
    }
    
    // ============ State Variables ============
    uint256 private projectCounter;
    uint256 public donationPool;
    uint256 public constant ANOMALY_MULTISIG_THRESHOLD = 2;
    ApprovalNFT public approvalNFT;
    ImpactScoreCalculator public impactScoreCalculator;
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone[]) public projectMilestones;
    mapping(uint256 => AuditTrailEntry[]) public projectAuditTrail;
    mapping(uint256 => mapping(address => bool)) public projectParticipants;
    mapping(bytes32 => AnomalyFlag) public anomalyFlags;
    mapping(bytes32 => mapping(address => bool)) public anomalyMultiSigApprovals;
    
    // ============ Events ============
    event ProjectCreated(
        uint256 indexed projectId,
        string title,
        uint256 budget,
        address contractor,
        address auditor
    );
    
    event FundsAllocated(
        uint256 indexed projectId,
        uint256 amount,
        address by
    );

    event DonationReceived(
        address indexed donor,
        uint256 amount
    );
    
    event MilestoneCreated(
        uint256 indexed projectId,
        uint256 milestoneId,
        string title,
        uint256 amount
    );
    
    event MilestoneRequested(
        uint256 indexed projectId,
        uint256 milestoneId,
        address contractor
    );
    
    event ProofSubmitted(
        uint256 indexed projectId,
        uint256 milestoneId,
        string proofHash
    );
    
    event MilestoneApproved(
        uint256 indexed projectId,
        uint256 milestoneId,
        uint256 nftTokenId,
        address auditor
    );
    
    event MilestoneRejected(
        uint256 indexed projectId,
        uint256 milestoneId,
        string reason,
        address auditor
    );
    
    event FundsReleased(
        uint256 indexed projectId,
        uint256 milestoneId,
        uint256 amount,
        address to
    );
    
    event ProjectCompleted(
        uint256 indexed projectId,
        uint256 totalSpent
    );
    
    event ProjectPaused(
        uint256 indexed projectId,
        address by
    );
    
    event ProjectResumed(
        uint256 indexed projectId,
        address by
    );

    event AnomalyFlagRaised(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        uint256 score,
        string reason,
        address raisedBy
    );

    event AnomalyFlagApproved(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address approver,
        uint256 approvals
    );

    event AnomalyFlagCleared(
        uint256 indexed projectId,
        uint256 indexed milestoneId
    );
    
    // ============ Constructor ============
    constructor(address _approvalNFTAddress, address _impactScoreCalculatorAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNMENT_ROLE, msg.sender);
        approvalNFT = ApprovalNFT(_approvalNFTAddress);
        impactScoreCalculator = ImpactScoreCalculator(_impactScoreCalculatorAddress);
    }
    
    // ============ Modifiers ============
    modifier onlyGovernment() {
        require(hasRole(GOVERNMENT_ROLE, msg.sender), "Caller is not government");
        _;
    }
    
    modifier onlyContractor(uint256 _projectId) {
        require(hasRole(CONTRACTOR_ROLE, msg.sender), "Caller is not contractor");
        require(projects[_projectId].contractorAddress == msg.sender, "Not assigned contractor");
        _;
    }
    
    modifier onlyAuditor(uint256 _projectId) {
        require(hasRole(AUDITOR_ROLE, msg.sender), "Caller is not auditor");
        require(projects[_projectId].auditorAddress == msg.sender, "Not assigned auditor");
        _;
    }

    modifier onlyAnomalyApprover(uint256 _projectId) {
        require(
            hasRole(GOVERNMENT_ROLE, msg.sender) || projects[_projectId].auditorAddress == msg.sender,
            "Not anomaly approver"
        );
        _;
    }

    modifier onlyAnomalyReporter(uint256 _projectId) {
        require(
            hasRole(GOVERNMENT_ROLE, msg.sender) || projects[_projectId].auditorAddress == msg.sender,
            "Not anomaly reporter"
        );
        _;
    }
    
    modifier projectExists(uint256 _projectId) {
        require(_projectId > 0 && _projectId <= projectCounter, "Project does not exist");
        _;
    }
    
    modifier projectActive(uint256 _projectId) {
        require(projects[_projectId].status == ProjectStatus.Active, "Project is not active");
        _;
    }
    
    // ============ Main Functions ============
    
    /**
     * @dev Donate funds into the shared digital wallet.
     */
    function donateToWallet()
        external
        payable
        onlyGovernment
        whenNotPaused
    {
        require(msg.value > 0, "Must send funds");

        donationPool += msg.value;

        emit DonationReceived(msg.sender, msg.value);
    }

    /**
     * @dev Create a new NGO funding request
     */
    function createProject(
        string memory _title,
        string memory _description,
        address _contractor,
        address _auditor,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts,
        uint256[] memory _milestoneEstimatedDates
    ) external whenNotPaused returns (uint256) {
        require(_milestoneTitles.length == _milestoneAmounts.length, "Milestone data mismatch");
        require(_milestoneTitles.length == _milestoneDescriptions.length, "Milestone data mismatch");
        require(_milestoneTitles.length == _milestoneEstimatedDates.length, "Milestone data mismatch");
        require(_milestoneTitles.length > 0, "At least one milestone required");
        require(_contractor == msg.sender, "NGO must create its own request");
        require(_auditor != address(0), "Invalid auditor");
        
        projectCounter++;
        uint256 projectId = projectCounter;
        
        uint256 totalBudget = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            totalBudget += _milestoneAmounts[i];
        }
        
        projects[projectId] = Project({
            projectId: projectId,
            title: _title,
            description: _description,
            allocatedFunds: 0,
            spentFunds: 0,
            remainingFunds: 0,
            governmentAddress: address(0),
            contractorAddress: _contractor,
            auditorAddress: _auditor,
            status: ProjectStatus.Active,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            currentMilestoneIndex: 0
        });
        
        // Create milestones
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            projectMilestones[projectId].push(Milestone({
                milestoneId: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                fundAmount: _milestoneAmounts[i],
                status: MilestoneStatus.Pending,
                proofHash: "",
                requestedAt: 0,
                approvedAt: 0,
                approvedBy: address(0),
                nftTokenId: 0,
                rejectionReason: "",
                estimatedCompletionDate: _milestoneEstimatedDates[i],
                actualCompletionDate: 0
            }));
            
            emit MilestoneCreated(projectId, i, _milestoneTitles[i], _milestoneAmounts[i]);
        }
        
        // Grant roles
        _grantRole(CONTRACTOR_ROLE, _contractor);
        _grantRole(AUDITOR_ROLE, _auditor);
        
        projectParticipants[projectId][_contractor] = true;
        projectParticipants[projectId][_auditor] = true;
        
        // Add to audit trail
        _addAuditEntry(projectId, msg.sender, "NGO Funding Request Created", 0, 0);
        
        emit ProjectCreated(projectId, _title, totalBudget, _contractor, _auditor);
        
        return projectId;
    }
    
    /**
     * @dev Allocate funds to project (Government deposits funds into contract)
     */
    function allocateFunds(uint256 _projectId) 
        external 
        payable 
        onlyGovernment 
        projectExists(_projectId) 
    {
        require(msg.value > 0, "Must send funds");
        
        Project storage project = projects[_projectId];
        project.allocatedFunds += msg.value;
        project.remainingFunds += msg.value;
        project.status = ProjectStatus.Active;
        project.lastUpdated = block.timestamp;
        
        _addAuditEntry(_projectId, msg.sender, "Funds Allocated", 0, msg.value);
        
        emit FundsAllocated(_projectId, msg.value, msg.sender);
    }
    
    /**
     * @dev NGO requests milestone fund release
     */
    function requestMilestoneRelease(uint256 _projectId, uint256 _milestoneId)
        external
        onlyContractor(_projectId)
        projectActive(_projectId)
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        
        Milestone storage milestone = projectMilestones[_projectId][_milestoneId];
        require(milestone.status == MilestoneStatus.Pending, "Milestone not in pending state");
        
        // Check if previous milestone is approved (sequential release)
        if (_milestoneId > 0) {
            require(
                projectMilestones[_projectId][_milestoneId - 1].status == MilestoneStatus.Approved,
                "Previous milestone not approved"
            );
        }
        
        milestone.status = MilestoneStatus.InProgress;
        milestone.requestedAt = block.timestamp;
        
        _addAuditEntry(_projectId, msg.sender, "Milestone Requested", _milestoneId, milestone.fundAmount);
        
        emit MilestoneRequested(_projectId, _milestoneId, msg.sender);
    }
    
    /**
     * @dev NGO submits a receipt/proof of use
     */
    function submitProof(uint256 _projectId, uint256 _milestoneId, string memory _proofHash)
        external
        onlyContractor(_projectId)
        projectActive(_projectId)
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        
        Milestone storage milestone = projectMilestones[_projectId][_milestoneId];
        require(milestone.status == MilestoneStatus.InProgress, "Milestone not in progress");
        
        milestone.proofHash = _proofHash;
        milestone.status = MilestoneStatus.UnderReview;
        milestone.actualCompletionDate = block.timestamp;
        
        _addAuditEntry(_projectId, msg.sender, "Proof Submitted", _milestoneId, 0);
        
        emit ProofSubmitted(_projectId, _milestoneId, _proofHash);
    }
    
    /**
     * @dev Auditor verifies and approves milestone
     */
    function approveMilestone(uint256 _projectId, uint256 _milestoneId)
        external
        onlyAuditor(_projectId)
        projectActive(_projectId)
        nonReentrant
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        
        Milestone storage milestone = projectMilestones[_projectId][_milestoneId];
        require(milestone.status == MilestoneStatus.UnderReview, "Milestone not under review");
        require(bytes(milestone.proofHash).length > 0, "No proof submitted");
        
        Project storage project = projects[_projectId];
        bytes32 anomalyKey = _anomalyKey(_projectId, _milestoneId);
        require(!anomalyFlags[anomalyKey].active, "Anomaly requires multi-sig clearance");
        require(donationPool >= milestone.fundAmount, "Insufficient digital wallet funds");
        
        // Mint NFT Approval Stamp
        uint256 nftTokenId = approvalNFT.mintApprovalStamp(
            _projectId,
            _milestoneId,
            milestone.title,
            msg.sender
        );
        
        // Update milestone
        milestone.status = MilestoneStatus.Approved;
        milestone.approvedAt = block.timestamp;
        milestone.approvedBy = msg.sender;
        milestone.nftTokenId = nftTokenId;
        
        // Release funds to contractor
        donationPool -= milestone.fundAmount;
        project.allocatedFunds += milestone.fundAmount;
        project.spentFunds += milestone.fundAmount;
        project.currentMilestoneIndex++;
        project.lastUpdated = block.timestamp;
        
        // Transfer funds
        payable(project.contractorAddress).transfer(milestone.fundAmount);
        
        _addAuditEntry(_projectId, msg.sender, "Milestone Approved", _milestoneId, milestone.fundAmount);
        
        emit MilestoneApproved(_projectId, _milestoneId, nftTokenId, msg.sender);
        emit FundsReleased(_projectId, _milestoneId, milestone.fundAmount, project.contractorAddress);
        
        // Check if project is completed
        if (project.currentMilestoneIndex == projectMilestones[_projectId].length) {
            project.status = ProjectStatus.Completed;
            emit ProjectCompleted(_projectId, project.spentFunds);
        }
    }
    
    /**
     * @dev Auditor rejects milestone
     */
    function rejectMilestone(uint256 _projectId, uint256 _milestoneId, string memory _reason)
        external
        onlyAuditor(_projectId)
        projectActive(_projectId)
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        
        Milestone storage milestone = projectMilestones[_projectId][_milestoneId];
        require(milestone.status == MilestoneStatus.UnderReview, "Milestone not under review");
        
        milestone.status = MilestoneStatus.Rejected;
        milestone.rejectionReason = _reason;

        bytes32 key = _anomalyKey(_projectId, _milestoneId);
        AnomalyFlag storage flag = anomalyFlags[key];
        if (flag.active) {
            flag.active = false;
            flag.cleared = false;
        }
        
        _addAuditEntry(_projectId, msg.sender, "Milestone Rejected", _milestoneId, 0);
        
        emit MilestoneRejected(_projectId, _milestoneId, _reason, msg.sender);
    }

    /**
     * @dev Called by the anomaly detection service signer when a suspicious release is detected.
     * The active flag blocks fund release until the donor/government and auditor both approve clearance.
     */
    function raiseAnomalyFlag(
        uint256 _projectId,
        uint256 _milestoneId,
        uint256 _score,
        string memory _reason
    )
        external
        projectExists(_projectId)
        onlyAnomalyReporter(_projectId)
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        require(
            projectMilestones[_projectId][_milestoneId].status == MilestoneStatus.UnderReview,
            "Milestone not under review"
        );
        bytes32 key = _anomalyKey(_projectId, _milestoneId);
        AnomalyFlag storage flag = anomalyFlags[key];

        flag.active = true;
        flag.cleared = false;
        flag.score = _score;
        flag.approvals = 0;
        flag.reason = _reason;
        flag.raisedAt = block.timestamp;

        anomalyMultiSigApprovals[key][projects[_projectId].auditorAddress] = false;
        anomalyMultiSigApprovals[key][msg.sender] = false;

        _addAuditEntry(_projectId, msg.sender, "Anomaly Flag Raised", _milestoneId, 0);

        emit AnomalyFlagRaised(_projectId, _milestoneId, _score, _reason, msg.sender);
    }

    /**
     * @dev Donor/government and assigned auditor approve anomaly clearance.
     * Once the threshold is reached, auditor approval can release the funds.
     */
    function approveAnomalyClearance(uint256 _projectId, uint256 _milestoneId)
        external
        projectExists(_projectId)
        onlyAnomalyApprover(_projectId)
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        require(
            projectMilestones[_projectId][_milestoneId].status == MilestoneStatus.UnderReview,
            "Milestone not under review"
        );
        bytes32 key = _anomalyKey(_projectId, _milestoneId);
        AnomalyFlag storage flag = anomalyFlags[key];

        require(flag.active, "No active anomaly");
        require(!anomalyMultiSigApprovals[key][msg.sender], "Already approved");

        anomalyMultiSigApprovals[key][msg.sender] = true;
        flag.approvals++;

        emit AnomalyFlagApproved(_projectId, _milestoneId, msg.sender, flag.approvals);

        if (flag.approvals >= ANOMALY_MULTISIG_THRESHOLD) {
            flag.active = false;
            flag.cleared = true;
            _addAuditEntry(_projectId, msg.sender, "Anomaly Cleared", _milestoneId, 0);
            emit AnomalyFlagCleared(_projectId, _milestoneId);
        }
    }
    
    /**
     * @dev Rejected requests are final. Keep this legacy selector as a clear revert.
     */
    function resubmitMilestone(uint256 _projectId, uint256, string memory)
        external
        onlyContractor(_projectId)
        projectActive(_projectId)
        view
    {
        revert("Rejected requests are final");
    }
    
    /**
     * @dev Emergency pause project
     */
    function pauseProject(uint256 _projectId) 
        external 
        onlyGovernment 
        projectExists(_projectId) 
    {
        projects[_projectId].status = ProjectStatus.Suspended;
        _addAuditEntry(_projectId, msg.sender, "Project Paused", 0, 0);
        emit ProjectPaused(_projectId, msg.sender);
    }
    
    /**
     * @dev Resume paused project
     */
    function resumeProject(uint256 _projectId) 
        external 
        onlyGovernment 
        projectExists(_projectId) 
    {
        require(projects[_projectId].status == ProjectStatus.Suspended, "Project not suspended");
        projects[_projectId].status = ProjectStatus.Active;
        _addAuditEntry(_projectId, msg.sender, "Project Resumed", 0, 0);
        emit ProjectResumed(_projectId, msg.sender);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get project details
     */
    function getProjectDetails(uint256 _projectId) 
        external 
        view 
        projectExists(_projectId) 
        returns (Project memory) 
    {
        return projects[_projectId];
    }
    
    /**
     * @dev Get all milestones for a project
     */
    function getProjectMilestones(uint256 _projectId) 
        external 
        view 
        projectExists(_projectId) 
        returns (Milestone[] memory) 
    {
        return projectMilestones[_projectId];
    }
    
    /**
     * @dev Get specific milestone
     */
    function getMilestone(uint256 _projectId, uint256 _milestoneId) 
        external 
        view 
        returns (Milestone memory) 
    {
        require(_milestoneId < projectMilestones[_projectId].length, "Invalid milestone");
        return projectMilestones[_projectId][_milestoneId];
    }
    
    /**
     * @dev Get project progress percentage
     */
    function getProjectProgress(uint256 _projectId) 
        external 
        view 
        projectExists(_projectId) 
        returns (uint256) 
    {
        uint256 totalMilestones = projectMilestones[_projectId].length;
        if (totalMilestones == 0) return 0;
        
        uint256 completedMilestones = 0;
        for (uint256 i = 0; i < totalMilestones; i++) {
            if (projectMilestones[_projectId][i].status == MilestoneStatus.Approved) {
                completedMilestones++;
            }
        }
        
        return (completedMilestones * 100) / totalMilestones;
    }
    
    /**
     * @dev Get audit trail for project
     */
    function getAuditTrail(uint256 _projectId) 
        external 
        view 
        projectExists(_projectId) 
        returns (AuditTrailEntry[] memory) 
    {
        return projectAuditTrail[_projectId];
    }
    
    /**
     * @dev Get project impact score
     */
    function getImpactScore(uint256 _projectId) 
        external 
        view 
        projectExists(_projectId) 
        returns (uint256) 
    {
        return impactScoreCalculator.calculateScore(_projectId);
    }
    
    /**
     * @dev Get total number of projects
     */
    function getTotalProjects() external view returns (uint256) {
        return projectCounter;
    }
    
    /**
     * @dev Get all projects (for listing)
     */
    function getAllProjects() external view returns (Project[] memory) {
        Project[] memory allProjects = new Project[](projectCounter);
        for (uint256 i = 1; i <= projectCounter; i++) {
            allProjects[i - 1] = projects[i];
        }
        return allProjects;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Add entry to audit trail
     */
    function _addAuditEntry(
        uint256 _projectId,
        address _actor,
        string memory _action,
        uint256 _milestoneId,
        uint256 _amount
    ) internal {
        projectAuditTrail[_projectId].push(AuditTrailEntry({
            timestamp: block.timestamp,
            actor: _actor,
            action: _action,
            milestoneId: _milestoneId,
            amount: _amount,
            txHash: "" // Can be populated off-chain
        }));
    }

    function _anomalyKey(uint256 _projectId, uint256 _milestoneId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_projectId, _milestoneId));
    }
    
    /**
     * @dev Withdraw remaining funds (only after project completion)
     */
    function withdrawRemainingFunds(uint256 _projectId) 
        external 
        onlyGovernment 
        projectExists(_projectId) 
    {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Completed, "Project not completed");
        require(project.remainingFunds > 0, "No remaining funds");
        
        uint256 amount = project.remainingFunds;
        project.remainingFunds = 0;
        
        payable(msg.sender).transfer(amount);
        
        _addAuditEntry(_projectId, msg.sender, "Remaining Funds Withdrawn", 0, amount);
    }
}
