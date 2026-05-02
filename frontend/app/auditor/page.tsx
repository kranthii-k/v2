'use client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LogOut, ChevronRight, CheckCircle2, AlertCircle, FileText, Loader2, ExternalLink, Activity, FolderKanban, CheckSquare, XSquare } from 'lucide-react';
import {
  connectWallet,
  disconnectWallet,
  formatAddress,
  getPublicFundProjectContract,
  formatAmount,
  getMilestoneStatusLabel,
  getStatusColor
} from '@/utils/web3';
import { getIPFSUrl } from '@/utils/ipfs';

interface Milestone {
  milestoneId: number;
  title: string;
  description: string;
  fundAmount: bigint;
  status: number;
  proofHash: string;
  requestedAt: number;
  rejectionReason: string;
}

interface Project {
  projectId: number;
  title: string;
  description: string;
  contractorAddress: string;
  milestones: Milestone[];
}

export default function AuditorDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<{ project: Project, milestone: Milestone } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    initWallet();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('🔄 Wallet address changed, reloading projects...');
      loadMyProjects();
    }
  }, [walletAddress]);

  const initWallet = async () => {
    try {
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
      // loadMyProjects will be called by useEffect when walletAddress is set
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWalletAddress('');
  };

  const loadMyProjects = async () => {
    try {
      setLoading(true);

      if (!walletAddress) {
        console.log('⚠️ No wallet address - cannot load projects');
        setProjects([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Loading projects for auditor:', walletAddress);
      const contract = await getPublicFundProjectContract(false);
      const allProjects = await contract.getAllProjects();
      console.log(`📋 Found ${allProjects.length} total projects`);

      // Filter projects where connected wallet is auditor
      const auditorAddressLower = walletAddress.toLowerCase();
      console.log('🔍 Filtering for auditor address:', auditorAddressLower);

      const filteredProjects = allProjects.filter((p: any) => {
        const projectAuditor = p.auditorAddress.toLowerCase();
        const matches = projectAuditor === auditorAddressLower;
        console.log(`  Project ${p.projectId}: auditor=${projectAuditor}, matches=${matches}`);
        return matches;
      });

      console.log(`✅ Found ${filteredProjects.length} projects for this auditor`);

      const myProjects = await Promise.all(
        filteredProjects.map(async (p: any) => {
          try {
            console.log(`  Processing project ${p.projectId}...`);
            const milestones = await contract.getProjectMilestones(p.projectId);
            console.log(`    Found ${milestones.length} milestones`);
            return {
              projectId: Number(p.projectId),
              title: p.title,
              description: p.description,
              contractorAddress: p.contractorAddress,
              milestones: milestones.map((m: any) => ({
                milestoneId: Number(m.milestoneId),
                title: m.title,
                description: m.description,
                fundAmount: m.fundAmount,
                status: Number(m.status),
                proofHash: m.proofHash,
                requestedAt: Number(m.requestedAt),
                rejectionReason: m.rejectionReason,
              })),
            };
          } catch (error) {
            console.error(`Error processing project ${p.projectId}:`, error);
            return null;
          }
        })
      );

      const validProjects = myProjects.filter(p => p !== null);
      console.log(`✅ Loaded ${validProjects.length} valid projects`);
      setProjects(validProjects);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMilestone = async (projectId: number, milestoneId: number) => {
    if (!confirm('Are you sure you want to approve this milestone? Funds will be released to the contractor.')) {
      return;
    }

    try {
      setLoading(true);
      console.log(`✅ Approving milestone ${milestoneId} for project ${projectId}...`);

      // Ensure we're on the correct network
      const { ensureCorrectNetwork } = await import('@/utils/web3');
      await ensureCorrectNetwork();

      const contract = await getPublicFundProjectContract(true);

      console.log('⏳ Sending approval transaction...');
      const tx = await contract.approveMilestone(projectId, milestoneId);

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      // Clear loading state immediately after transaction
      console.log('🏁 Clearing loading state');
      setLoading(false);

      alert('Milestone approved successfully! Funds released and NFT minted.');

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects (don't wait for it - do it in background)
      console.log('🔄 Reloading projects after approval...');
      loadMyProjects().then(() => {
        console.log('✅ Projects reloaded successfully');
      }).catch((error) => {
        console.error('❌ Error reloading projects:', error);
        // Don't block - just log the error
      });
    } catch (error: any) {
      console.error('❌ Error approving milestone:', error);
      // Clear loading state on error too
      setLoading(false);
      alert('Failed to approve milestone: ' + (error.message || error.reason || 'Unknown error'));
    }
  };

  const handleRejectMilestone = async () => {
    if (!selectedMilestone) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      const projectId = selectedMilestone.project.projectId;
      const milestoneId = selectedMilestone.milestone.milestoneId;

      console.log(`❌ Rejecting milestone ${milestoneId} for project ${projectId}...`);
      console.log(`   Reason: ${rejectionReason}`);

      // Ensure we're on the correct network
      const { ensureCorrectNetwork } = await import('@/utils/web3');
      await ensureCorrectNetwork();

      const contract = await getPublicFundProjectContract(true);

      console.log('⏳ Sending rejection transaction...');
      const tx = await contract.rejectMilestone(
        projectId,
        milestoneId,
        rejectionReason
      );

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      // Clear loading state immediately after transaction
      console.log('🏁 Clearing loading state');
      setLoading(false);

      // Clear modal state immediately
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedMilestone(null);

      alert('Milestone rejected. Contractor can resubmit with corrections.');

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects (don't wait for it - do it in background)
      console.log('🔄 Reloading projects after rejection...');
      loadMyProjects().then(() => {
        console.log('✅ Projects reloaded successfully');
      }).catch((error) => {
        console.error('❌ Error reloading projects:', error);
        // Don't block - just log the error
      });
    } catch (error: any) {
      console.error('❌ Error rejecting milestone:', error);
      // Clear loading state on error too
      setLoading(false);
      alert('Failed to reject milestone: ' + (error.message || error.reason || 'Unknown error'));
    }
  };

  const openRejectModal = (project: Project, milestone: Milestone) => {
    setSelectedMilestone({ project, milestone });
    setShowRejectModal(true);
  };

  const getPendingReviews = () => {
    return projects.reduce((count, project) => {
      return count + project.milestones.filter(m => m.status === 2).length;
    }, 0);
  };

  const getTotalApproved = () => {
    return projects.reduce((count, project) => {
      return count + project.milestones.filter(m => m.status === 3).length;
    }, 0);
  };

  const getTotalRejected = () => {
    return projects.reduce((count, project) => {
      return count + project.milestones.filter(m => m.status === 4).length;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-main text-text-primary font-sans relative overflow-x-hidden">
      {/* Background blobs */}
      <div className="blob bg-[rgba(160,160,180,0.03)] w-[500px] h-[500px] top-[-100px] left-[-100px]" />

      {/* Header */}
      <nav className="glass-nav sticky top-0 z-[100] h-[var(--navbar-h)] flex items-center px-6">
        <div className="w-full max-w-[1200px] mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="font-display text-[22px] font-bold tracking-[-0.02em] text-text-primary">
              PF<span className="text-gradient">TUS</span>
            </Link>
            <span className="text-border-medium">|</span>
            <span className="text-sm font-semibold text-text-muted flex items-center">
              <ShieldCheck size={18} className="mr-2 text-accent-1" /> Auditor Dashboard
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="wallet-pill border-accent-1/20 bg-accent-1/10">
              <div className="w-2 h-2 rounded-full bg-accent-1 animate-pulse shadow-[0_0_8px_var(--accent-1)]"></div>
              <span className="text-accent-1">{formatAddress(walletAddress)}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDisconnect();
              }}
              className="btn-glass btn-ghost"
              title="Disconnect Wallet"
            >
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-6 py-12 relative z-10">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-b-2 border-b-border-medium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">Total Projects</p>
                <p className="font-display text-3xl font-bold text-text-primary">{projects.length}</p>
              </div>
              <div className="w-12 h-12 bg-[rgba(255,255,255,0.03)] border border-border-subtle rounded-xl flex items-center justify-center">
                <FolderKanban size={24} className="text-border-medium" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-b-2 border-b-accent-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">Pending Reviews</p>
                <p className="font-display text-3xl font-bold text-accent-3">{getPendingReviews()}</p>
              </div>
              <div className="w-12 h-12 bg-accent-3/10 border border-accent-3/20 rounded-xl flex items-center justify-center">
                <Loader2 size={24} className="text-accent-3 animate-spin-slow" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 border-b-2 border-b-[#4ade80]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">Approved</p>
                <p className="font-display text-3xl font-bold text-[#4ade80]">{getTotalApproved()}</p>
              </div>
              <div className="w-12 h-12 bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-xl flex items-center justify-center">
                <CheckSquare size={24} className="text-[#4ade80]" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 border-b-2 border-b-red-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">Rejected</p>
                <p className="font-display text-3xl font-bold text-red-400">{getTotalRejected()}</p>
              </div>
              <div className="w-12 h-12 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center justify-center">
                <XSquare size={24} className="text-red-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <h1 className="font-display text-3xl font-bold text-text-primary mb-8">Projects to Audit</h1>

        {loading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 size={32} className="animate-spin mb-4 text-accent-1" />
            <p className="text-text-muted">Loading projects from blockchain...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <ShieldCheck size={48} className="mx-auto mb-4 text-border-medium" strokeWidth={1} />
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">No Projects Assigned</h3>
            <p className="text-text-muted">You haven't been assigned as auditor for any projects yet.</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="space-y-6"
          >
            {projects.map((project) => (
              <motion.div 
                key={project.projectId} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
                }} 
                className="glass-card p-8"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-text-primary mb-2">{project.title}</h2>
                    <p className="text-sm text-text-muted mb-4 max-w-[80%]">{project.description}</p>
                    <div className="inline-flex items-center bg-[rgba(255,255,255,0.03)] border border-border-subtle rounded-lg px-3 py-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mr-2">Contractor:</span>
                      <span className="font-mono text-sm text-text-primary">{formatAddress(project.contractorAddress)}</span>
                    </div>
                  </div>
                  <Link
                    href={`/explorer/${project.projectId}`}
                    className="text-sm text-accent-1 hover:text-white flex items-center space-x-1 transition-colors bg-[rgba(255,255,255,0.03)] border border-border-subtle px-4 py-2 rounded-lg"
                  >
                    <span>View Public</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>

                {/* Milestones for Review */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center">
                    <Activity size={18} className="mr-2 text-accent-1" /> Milestones
                  </h3>
                  {project.milestones.map((milestone) => (
                    <div
                      key={milestone.milestoneId}
                      className={`rounded-lg p-5 border-l-2 transition-colors ${
                        milestone.status === 2 ? 'bg-accent-3/5 border-l-accent-3 hover:bg-accent-3/10' :
                        milestone.status === 3 ? 'bg-[#4ade80]/5 border-l-[#4ade80] hover:bg-[#4ade80]/10' :
                        milestone.status === 4 ? 'bg-red-900/10 border-l-red-500 hover:bg-red-900/20' :
                        'bg-[rgba(255,255,255,0.02)] border-l-border-subtle border border-border-subtle hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-text-primary">
                              <span className="text-accent-1 mr-1">#{milestone.milestoneId + 1}</span> {milestone.title}
                            </h4>
                            <span className={`tag ${getStatusColor(milestone.status, 'milestone')}`}>
                              {getMilestoneStatusLabel(milestone.status)}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mb-3">{milestone.description}</p>
                          <div className="flex items-center space-x-4 text-sm mb-4">
                            <span className="text-accent-2 font-medium bg-[rgba(255,255,255,0.03)] border border-border-subtle px-3 py-1 rounded-full">
                              {formatAmount(milestone.fundAmount)} ETH
                            </span>
                            {milestone.requestedAt > 0 && (
                              <span className="text-xs text-border-medium uppercase tracking-wider font-semibold">
                                Requested: {new Date(milestone.requestedAt * 1000).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Proof Document */}
                          {milestone.proofHash && (
                            <div className="bg-[rgba(0,0,0,0.2)] border border-border-subtle rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FileText size={16} className="text-accent-1" />
                                  <span className="text-sm font-medium text-text-primary">Proof Document</span>
                                </div>
                                <a
                                  href={getIPFSUrl(milestone.proofHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent-1 hover:text-white text-sm flex items-center space-x-1 transition-colors"
                                >
                                  <span>View Document</span>
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                              <p className="text-[11px] text-border-medium mt-2 font-mono break-all bg-[rgba(255,255,255,0.03)] p-1.5 rounded">
                                IPFS: {milestone.proofHash.slice(0, 30)}...
                              </p>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {milestone.rejectionReason && (
                            <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                              <p className="text-sm text-red-300 flex items-start">
                                <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
                                <span><strong className="text-red-400">Previous Rejection:</strong> {milestone.rejectionReason}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="ml-6 flex flex-col space-y-2 flex-shrink-0">
                          {milestone.status === 2 && (
                            <>
                              <button
                                onClick={() => handleApproveMilestone(project.projectId, milestone.milestoneId)}
                                disabled={loading}
                                className="btn-glass bg-[#4ade80]/10 border-[#4ade80]/30 hover:bg-[#4ade80]/20 text-[#4ade80] text-sm py-2 px-4 flex items-center space-x-1"
                              >
                                <CheckCircle2 size={16} className="mr-1" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => openRejectModal(project, milestone)}
                                disabled={loading}
                                className="btn-glass bg-red-900/20 border-red-500/30 hover:bg-red-900/40 text-red-400 text-sm py-2 px-4 flex items-center space-x-1"
                              >
                                <XSquare size={16} className="mr-1" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {milestone.status === 3 && (
                            <span className="text-sm text-[#4ade80] font-medium flex items-center bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-1.5 rounded-full">
                              <CheckCircle2 size={14} className="mr-1.5" />
                              Approved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-xl p-8 max-w-md w-full mx-4 border border-red-500/30 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
              
              <div className="flex items-center mb-6 text-red-400">
                <AlertCircle size={24} className="mr-3" />
                <h3 className="font-display text-xl font-bold">Reject Milestone</h3>
              </div>
              
              <p className="text-sm text-text-muted mb-6">
                Please provide a clear reason for rejection so the contractor can make corrections and resubmit.
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[rgba(0,0,0,0.3)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-6 text-sm"
                placeholder="E.g., Proof document is incomplete, measurements don't match specifications..."
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleRejectMilestone}
                  disabled={loading || !rejectionReason.trim()}
                  className="flex-1 btn-glass bg-red-600 border-red-500 hover:bg-red-700 text-white disabled:opacity-50 py-2.5"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin inline mr-2" /> Rejecting...</> : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedMilestone(null);
                  }}
                  disabled={loading}
                  className="flex-1 btn-glass btn-ghost py-2.5"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

