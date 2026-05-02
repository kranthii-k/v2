'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  getPublicFundProjectContract,
  getImpactScoreContract,
  getApprovalNFTContract,
  formatAmount,
  formatAddress,
  formatTimestamp,
  getMilestoneStatusLabel,
  getStatusColor,
  getProjectStatusLabel
} from '@/utils/web3';
import { getIPFSUrl } from '@/utils/ipfs';

interface Milestone {
  milestoneId: number;
  title: string;
  description: string;
  fundAmount: bigint;
  status: number;
  proofHash: string;
  approvedAt: number;
  nftTokenId: number;
  estimatedCompletionDate: number;
  actualCompletionDate: number;
}

interface AuditEntry {
  timestamp: number;
  actor: string;
  action: string;
  milestoneId: number;
  amount: bigint;
}

interface Project {
  projectId: number;
  title: string;
  description: string;
  allocatedFunds: bigint;
  spentFunds: bigint;
  remainingFunds: bigint;
  governmentAddress: string;
  contractorAddress: string;
  auditorAddress: string;
  status: number;
  createdAt: number;
  currentMilestoneIndex: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id as string) : 0;
  
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [impactScore, setImpactScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'audit' | 'nfts'>('overview');

  useEffect(() => {
    if (projectId && !isNaN(projectId)) {
      loadProjectData();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      const contract = await getPublicFundProjectContract(false);
      const projectData = await contract.getProjectDetails(projectId);
      const milestonesData = await contract.getProjectMilestones(projectId);
      const auditData = await contract.getAuditTrail(projectId);
      
      setProject({
        projectId: Number(projectData.projectId),
        title: projectData.title,
        description: projectData.description,
        allocatedFunds: projectData.allocatedFunds,
        spentFunds: projectData.spentFunds,
        remainingFunds: projectData.remainingFunds,
        governmentAddress: projectData.governmentAddress,
        contractorAddress: projectData.contractorAddress,
        auditorAddress: projectData.auditorAddress,
        status: Number(projectData.status),
        createdAt: Number(projectData.createdAt),
        currentMilestoneIndex: Number(projectData.currentMilestoneIndex),
      });

      setMilestones(milestonesData.map((m: any) => ({
        milestoneId: Number(m.milestoneId),
        title: m.title,
        description: m.description,
        fundAmount: m.fundAmount,
        status: Number(m.status),
        proofHash: m.proofHash,
        approvedAt: Number(m.approvedAt),
        nftTokenId: Number(m.nftTokenId),
        estimatedCompletionDate: Number(m.estimatedCompletionDate),
        actualCompletionDate: Number(m.actualCompletionDate),
      })));

      setAuditTrail(auditData.map((a: any) => ({
        timestamp: Number(a.timestamp),
        actor: a.actor,
        action: a.action,
        milestoneId: Number(a.milestoneId),
        amount: a.amount,
      })));

      // Load impact score
      try {
        const scoreContract = await getImpactScoreContract();
        const scoreData = await scoreContract.calculateDetailedScore(projectId);
        setImpactScore({
          onTimeScore: Number(scoreData.onTimeScore),
          budgetScore: Number(scoreData.budgetScore),
          approvalScore: Number(scoreData.approvalScore),
          transparencyScore: Number(scoreData.transparencyScore),
          totalScore: Number(scoreData.totalScore),
          rating: scoreData.rating,
        });
      } catch (error) {
        console.error('Error loading impact score:', error);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getProgressPercentage = () => {
    if (!project) return 0;
    const approved = milestones.filter(m => m.status === 3).length;
    return milestones.length > 0 ? (approved / milestones.length) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-6">The NGO request you're looking for does not exist.</p>
          <Link href="/explorer" className="text-primary-600 hover:text-primary-700">
            ← Back to Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-primary-600">PFTUS</Link>
              <span className="text-gray-400">|</span>
              <Link href="/explorer" className="text-gray-600 hover:text-gray-900">Public Explorer</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Request #{projectId}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                <span className={`px-4 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(project.status, 'project')}`}>
                  {getProjectStatusLabel(project.status)}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{project.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Request ID: <strong>#{projectId}</strong></span>
                <span>Created: <strong>{formatTimestamp(project.createdAt)}</strong></span>
                <span>Progress: <strong>{getProgressPercentage().toFixed(0)}%</strong></span>
              </div>
            </div>
            
            {/* Impact Score */}
            {impactScore && (
              <div className={`rounded-xl p-6 text-center min-w-[180px] ${getScoreColor(impactScore.totalScore)}`}>
                <div className="text-5xl font-bold mb-2">{impactScore.totalScore}</div>
                <div className="text-sm font-medium mb-1">Public Trust Index</div>
                <div className="text-xs font-semibold uppercase">{impactScore.rating}</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Request Completion</span>
              <span className="text-sm font-bold text-gray-900">{getProgressPercentage().toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full progress-bar flex items-center justify-end pr-2"
                style={{ width: `${getProgressPercentage()}%` }}
              >
                {getProgressPercentage() > 10 && (
                  <span className="text-xs text-white font-medium">{getProgressPercentage().toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Released Funds</div>
              <div className="text-2xl font-bold text-blue-600">{formatAmount(project.allocatedFunds)} ETH</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Paid to NGO</div>
              <div className="text-2xl font-bold text-green-600">{formatAmount(project.spentFunds)} ETH</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Request Balance</div>
              <div className="text-2xl font-bold text-purple-600">{formatAmount(project.remainingFunds)} ETH</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'milestones'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Receipts ({milestones.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Audit Trail ({auditTrail.length})
              </button>
              <button
                onClick={() => setActiveTab('nfts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'nfts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                NFT Approvals
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Stakeholders</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Government/Donor</div>
                      <div className="font-mono text-sm font-medium">{formatAddress(project.governmentAddress)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">NGO</div>
                      <div className="font-mono text-sm font-medium">{formatAddress(project.contractorAddress)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Auditor</div>
                      <div className="font-mono text-sm font-medium">{formatAddress(project.auditorAddress)}</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={milestone.milestoneId} className={`rounded-lg p-4 border-l-4 ${
                    milestone.status === 3 ? 'bg-green-50 border-green-500' :
                    milestone.status === 2 ? 'bg-orange-50 border-orange-500' :
                    milestone.status === 1 ? 'bg-yellow-50 border-yellow-500' :
                    milestone.status === 4 ? 'bg-red-50 border-red-500' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <h4 className="font-bold text-gray-900">{milestone.title}</h4>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white mt-1 ${getStatusColor(milestone.status, 'milestone')}`}>
                              {getMilestoneStatusLabel(milestone.status)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-gray-700">
                            <strong>Amount:</strong> {formatAmount(milestone.fundAmount)} ETH
                          </span>
                          {milestone.estimatedCompletionDate > 0 && (
                            <span className="text-gray-700">
                              <strong>Est. Completion:</strong> {formatTimestamp(milestone.estimatedCompletionDate)}
                            </span>
                          )}
                          {milestone.actualCompletionDate > 0 && (
                            <span className="text-gray-700">
                              <strong>Completed:</strong> {formatTimestamp(milestone.actualCompletionDate)}
                            </span>
                          )}
                          {milestone.approvedAt > 0 && (
                            <span className="text-green-600">
                              <strong>✓ Approved:</strong> {formatTimestamp(milestone.approvedAt)}
                            </span>
                          )}
                        </div>
                        {milestone.proofHash && (
                          <div className="mt-3">
                            <a
                              href={getIPFSUrl(milestone.proofHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                              </svg>
                              <span>View Receipt</span>
                            </a>
                          </div>
                        )}
                      </div>
                      {milestone.nftTokenId > 0 && (
                        <div className="ml-4">
                          <div className="bg-purple-100 rounded-lg p-3 text-center">
                            <div className="text-3xl mb-1">🏅</div>
                            <div className="text-xs text-purple-700 font-medium">NFT #{milestone.nftTokenId}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="relative">
                  {auditTrail.map((entry, index) => (
                    <div key={index} className="flex items-start space-x-4 pb-6 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        {index < auditTrail.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{entry.action}</h4>
                            <p className="text-sm text-gray-600">
                              By: <span className="font-mono">{formatAddress(entry.actor)}</span>
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        {entry.amount > BigInt(0) && (
                          <div className="text-sm text-gray-700">
                            <strong>Amount:</strong> {formatAmount(entry.amount)} ETH
                          </div>
                        )}
                        {entry.milestoneId > 0 && (
                          <div className="text-sm text-gray-700">
                            <strong>Milestone:</strong> #{entry.milestoneId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NFTs Tab */}
            {activeTab === 'nfts' && (
              <div>
                <div className="grid md:grid-cols-3 gap-6">
                  {milestones
                    .filter(m => m.nftTokenId > 0)
                    .map((milestone) => (
                      <div key={milestone.nftTokenId} className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="text-5xl text-center mb-4">🏅</div>
                        <h4 className="font-bold text-center mb-2">Approval Seal #{milestone.nftTokenId}</h4>
                        <div className="text-center text-sm mb-4 text-purple-100">
                          {milestone.title}
                        </div>
                        <div className="bg-white/20 rounded-lg p-3 text-xs space-y-1">
                          <div><strong>Milestone:</strong> #{milestone.milestoneId + 1}</div>
                          <div><strong>Amount:</strong> {formatAmount(milestone.fundAmount)} ETH</div>
                          <div><strong>Approved:</strong> {formatTimestamp(milestone.approvedAt)}</div>
                        </div>
                      </div>
                    ))}
                </div>
                {milestones.filter(m => m.nftTokenId > 0).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏅</div>
                    <p className="text-gray-600">No NFT approval stamps issued yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
