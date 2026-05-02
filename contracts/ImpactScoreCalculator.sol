// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PublicFundProject.sol";

/**
 * @title ImpactScoreCalculator
 * @dev Calculates Public Trust Index (0-100) for projects
 * @notice Scoring based on: on-time completion, budget adherence, audit approval rate, transparency
 */
contract ImpactScoreCalculator {
    
    // ============ State Variables ============
    address public publicFundProjectAddress;
    
    // Scoring weights (total = 100)
    uint256 public constant ON_TIME_WEIGHT = 40;
    uint256 public constant BUDGET_WEIGHT = 30;
    uint256 public constant APPROVAL_WEIGHT = 20;
    uint256 public constant TRANSPARENCY_WEIGHT = 10;
    
    // ============ Structs ============
    struct ScoreBreakdown {
        uint256 onTimeScore;
        uint256 budgetScore;
        uint256 approvalScore;
        uint256 transparencyScore;
        uint256 totalScore;
        string rating;
    }
    
    // ============ Events ============
    event ScoreCalculated(
        uint256 indexed projectId,
        uint256 totalScore,
        string rating
    );
    
    // ============ Constructor ============
    constructor(address _publicFundProjectAddress) {
        publicFundProjectAddress = _publicFundProjectAddress;
    }
    
    // ============ Main Functions ============
    
    /**
     * @dev Calculate overall impact score for a project
     * @return Total score (0-100)
     */
    function calculateScore(uint256 _projectId) external view returns (uint256) {
        ScoreBreakdown memory breakdown = calculateDetailedScore(_projectId);
        return breakdown.totalScore;
    }
    
    /**
     * @dev Calculate detailed score breakdown
     */
    function calculateDetailedScore(uint256 _projectId) 
        public 
        view 
        returns (ScoreBreakdown memory) 
    {
        PublicFundProject pfp = PublicFundProject(publicFundProjectAddress);
        
        // Get project details
        PublicFundProject.Project memory project = pfp.getProjectDetails(_projectId);
        PublicFundProject.Milestone[] memory milestones = pfp.getProjectMilestones(_projectId);
        
        uint256 totalMilestones = milestones.length;
        require(totalMilestones > 0, "Project has no milestones");
        
        // Calculate individual scores
        uint256 onTimeScore = _calculateOnTimeScore(milestones);
        uint256 budgetScore = _calculateBudgetScore(project);
        uint256 approvalScore = _calculateApprovalScore(milestones);
        uint256 transparencyScore = _calculateTransparencyScore(milestones);
        
        // Calculate total
        uint256 totalScore = onTimeScore + budgetScore + approvalScore + transparencyScore;
        
        // Determine rating
        string memory rating = _getRating(totalScore);
        
        return ScoreBreakdown({
            onTimeScore: onTimeScore,
            budgetScore: budgetScore,
            approvalScore: approvalScore,
            transparencyScore: transparencyScore,
            totalScore: totalScore,
            rating: rating
        });
    }
    
    // ============ Score Calculation Functions ============
    
    /**
     * @dev Calculate on-time completion score (0-40 points)
     * Based on percentage of milestones completed on or before estimated date
     */
    function _calculateOnTimeScore(PublicFundProject.Milestone[] memory _milestones) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 totalMilestones = _milestones.length;
        uint256 onTimeMilestones = 0;
        uint256 completedMilestones = 0;
        
        for (uint256 i = 0; i < totalMilestones; i++) {
            if (_milestones[i].status == PublicFundProject.MilestoneStatus.Approved) {
                completedMilestones++;
                
                // Check if completed on time
                if (_milestones[i].actualCompletionDate <= _milestones[i].estimatedCompletionDate) {
                    onTimeMilestones++;
                }
            }
        }
        
        if (completedMilestones == 0) return 0;
        
        // Calculate score
        return (onTimeMilestones * ON_TIME_WEIGHT) / completedMilestones;
    }
    
    /**
     * @dev Calculate budget adherence score (0-30 points)
     * Based on how close actual spending is to allocated budget
     */
    function _calculateBudgetScore(PublicFundProject.Project memory _project) 
        internal 
        pure 
        returns (uint256) 
    {
        if (_project.allocatedFunds == 0) return 0;
        
        uint256 spentFunds = _project.spentFunds;
        uint256 allocatedFunds = _project.allocatedFunds;
        
        // Perfect score if within budget
        if (spentFunds <= allocatedFunds) {
            return BUDGET_WEIGHT;
        }
        
        // Penalty for overspending
        uint256 overspend = spentFunds - allocatedFunds;
        uint256 overspendPercentage = (overspend * 100) / allocatedFunds;
        
        // Reduce score based on overspend percentage
        if (overspendPercentage >= 100) return 0; // 100%+ overspend = 0 points
        
        uint256 penalty = (BUDGET_WEIGHT * overspendPercentage) / 100;
        return BUDGET_WEIGHT - penalty;
    }
    
    /**
     * @dev Calculate audit approval rate score (0-20 points)
     * Based on percentage of submitted milestones that were approved (not rejected)
     */
    function _calculateApprovalScore(PublicFundProject.Milestone[] memory _milestones) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 totalMilestones = _milestones.length;
        uint256 submittedMilestones = 0;
        uint256 approvedMilestones = 0;
        
        for (uint256 i = 0; i < totalMilestones; i++) {
            PublicFundProject.MilestoneStatus status = _milestones[i].status;
            
            // Count submitted milestones (under review, approved, or rejected)
            if (status == PublicFundProject.MilestoneStatus.UnderReview ||
                status == PublicFundProject.MilestoneStatus.Approved ||
                status == PublicFundProject.MilestoneStatus.Rejected) {
                submittedMilestones++;
            }
            
            // Count approved milestones
            if (status == PublicFundProject.MilestoneStatus.Approved) {
                approvedMilestones++;
            }
        }
        
        if (submittedMilestones == 0) return 0;
        
        // Calculate score
        return (approvedMilestones * APPROVAL_WEIGHT) / submittedMilestones;
    }
    
    /**
     * @dev Calculate transparency score (0-10 points)
     * Based on percentage of milestones with proof documents submitted
     */
    function _calculateTransparencyScore(PublicFundProject.Milestone[] memory _milestones) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 totalMilestones = _milestones.length;
        uint256 milestonesWithProof = 0;
        
        for (uint256 i = 0; i < totalMilestones; i++) {
            // Count milestones with proof submitted
            if (bytes(_milestones[i].proofHash).length > 0) {
                milestonesWithProof++;
            }
        }
        
        if (totalMilestones == 0) return 0;
        
        // Calculate score
        return (milestonesWithProof * TRANSPARENCY_WEIGHT) / totalMilestones;
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Get rating based on total score
     */
    function _getRating(uint256 _score) internal pure returns (string memory) {
        if (_score >= 85) return "Excellent";
        if (_score >= 70) return "Good";
        if (_score >= 50) return "Average";
        return "Poor";
    }
    
    /**
     * @dev Get color code for UI display
     */
    function getColorCode(uint256 _score) external pure returns (string memory) {
        if (_score >= 85) return "green";
        if (_score >= 70) return "yellow";
        if (_score >= 50) return "orange";
        return "red";
    }
    
    /**
     * @dev Get score interpretation
     */
    function getScoreInterpretation(uint256 _score) 
        external 
        pure 
        returns (string memory) 
    {
        if (_score >= 85) {
            return "Exceptional performance. High public trust and transparency.";
        }
        if (_score >= 70) {
            return "Good performance. Demonstrates accountability and progress.";
        }
        if (_score >= 50) {
            return "Average performance. Room for improvement in execution.";
        }
        return "Poor performance. Significant concerns about transparency and efficiency.";
    }
    
    /**
     * @dev Update PublicFundProject contract address (admin function)
     */
    function updateProjectAddress(address _newAddress) external {
        require(_newAddress != address(0), "Invalid address");
        publicFundProjectAddress = _newAddress;
    }
}

