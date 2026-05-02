'use client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, LogOut, ChevronRight, Upload, Loader2, FileText, ExternalLink, Activity } from 'lucide-react';
import {
  connectWallet,
  disconnectWallet,
  formatAddress,
  getPublicFundProjectContract,
  formatAmount,
  getMilestoneStatusLabel,
  getStatusColor
} from '@/utils/web3';
import { uploadProofDocument } from '@/utils/ipfs';

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
  milestones: Milestone[];
}

export default function ContractorDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState<{ [key: string]: boolean }>({});

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

      console.log('🔍 Loading projects for contractor:', walletAddress);
      const contract = await getPublicFundProjectContract(false);
      const allProjects = await contract.getAllProjects();
      console.log(`📋 Found ${allProjects.length} total projects`);

      // Filter projects where connected wallet is contractor
      const contractorAddressLower = walletAddress.toLowerCase();
      console.log('🔍 Filtering for contractor address:', contractorAddressLower);

      const filteredProjects = allProjects.filter((p: any) => {
        const projectContractor = p.contractorAddress.toLowerCase();
        const matches = projectContractor === contractorAddressLower;
        console.log(`  Project ${p.projectId}: contractor=${projectContractor}, matches=${matches}`);
        return matches;
      });

      console.log(`✅ Found ${filteredProjects.length} projects for this contractor`);

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

  const handleRequestMilestone = async (projectId: number, milestoneId: number) => {
    try {
      setLoading(true);
      console.log(`📝 Requesting milestone ${milestoneId} for project ${projectId}...`);

      // Ensure we're on the correct network
      const { ensureCorrectNetwork } = await import('@/utils/web3');
      await ensureCorrectNetwork();

      const contract = await getPublicFundProjectContract(true);

      console.log('⏳ Sending transaction...');
      const tx = await contract.requestMilestoneRelease(projectId, milestoneId);

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      alert('Milestone requested successfully!');

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects
      console.log('🔄 Reloading projects after milestone request...');
      try {
        await loadMyProjects();
        console.log('✅ Projects reloaded successfully');
      } catch (error) {
        console.error('❌ Error reloading projects:', error);
        // Don't throw - just log the error
      }
    } catch (error: any) {
      console.error('❌ Error requesting milestone:', error);
      alert('Failed to request milestone: ' + (error.message || error.reason || 'Unknown error'));
    } finally {
      console.log('🏁 Finished milestone request, clearing loading state');
      setLoading(false);
    }
  };

  const handleSubmitProof = async (projectId: number, milestoneId: number, file: File, milestoneStatus?: number) => {
    const key = `${projectId}-${milestoneId}`;
    try {
      setUploadingProof({ ...uploadingProof, [key]: true });
      console.log(`📤 Uploading proof for milestone ${milestoneId} of project ${projectId}...`);

      // Upload to IPFS
      console.log('⏳ Uploading to IPFS...');
      const { ipfsHash, contentHash } = await uploadProofDocument(file);
      console.log('✅ IPFS upload complete. Hash:', ipfsHash);

      // Ensure we're on the correct network
      const { ensureCorrectNetwork } = await import('@/utils/web3');
      await ensureCorrectNetwork();

      // Submit proof hash to contract
      const contract = await getPublicFundProjectContract(true);

      // Check if milestone is rejected (status 4) - use resubmitMilestone instead
      const isRejected = milestoneStatus === 4;

      if (isRejected) {
        console.log('🔄 Milestone is rejected - using resubmitMilestone...');
      } else {
        console.log('⏳ Submitting proof to contract...');
      }

      const tx = isRejected
        ? await contract.resubmitMilestone(projectId, milestoneId, ipfsHash)
        : await contract.submitProof(projectId, milestoneId, ipfsHash);

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      // Clear uploading state immediately after transaction
      console.log('🏁 Clearing upload state');
      setUploadingProof((prev) => ({ ...prev, [key]: false }));

      alert(isRejected ? 'Proof resubmitted successfully!' : 'Proof submitted successfully!');

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects (don't wait for it - do it in background)
      console.log('🔄 Reloading projects after proof submission...');
      loadMyProjects().then(() => {
        console.log('✅ Projects reloaded successfully');
      }).catch((error) => {
        console.error('❌ Error reloading projects:', error);
        // Don't block - just log the error
      });
    } catch (error: any) {
      console.error('❌ Error submitting proof:', error);
      // Clear uploading state on error too
      setUploadingProof((prev) => ({ ...prev, [key]: false }));
      alert('Failed to submit proof: ' + (error.message || error.reason || 'Unknown error'));
    }
  };

  const handleFileUpload = (projectId: number, milestoneId: number, e: React.ChangeEvent<HTMLInputElement>, milestoneStatus?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSubmitProof(projectId, milestoneId, file, milestoneStatus);
    }
  };

  const getMilestoneActionButton = (project: Project, milestone: Milestone) => {
    const key = `${project.projectId}-${milestone.milestoneId}`;

    switch (milestone.status) {
      case 0: // Pending
        return (
          <button
            onClick={() => handleRequestMilestone(project.projectId, milestone.milestoneId)}
            disabled={loading}
            className="btn-glass btn-primary text-sm"
          >
            Request Release
          </button>
        );

      case 1: // In Progress
        return (
          <div>
            <input
              type="file"
              id={`file-${key}`}
              className="hidden"
              onChange={(e) => handleFileUpload(project.projectId, milestone.milestoneId, e, milestone.status)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <label
              htmlFor={`file-${key}`}
              className={`btn-glass bg-[rgba(255,255,255,0.08)] border-border-medium hover:bg-[rgba(255,255,255,0.12)] cursor-pointer text-sm ${uploadingProof[key] ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload size={14} className="mr-1" />
              {uploadingProof[key] ? 'Uploading...' : 'Upload Proof'}
            </label>
          </div>
        );

      case 2: // Under Review
        return (
          <span className="text-sm text-accent-3 font-medium flex items-center bg-[rgba(255,255,255,0.03)] border border-border-subtle px-3 py-1.5 rounded-full">
            <Loader2 size={14} className="mr-2 animate-spin" /> Awaiting Approval
          </span>
        );

      case 3: // Approved
        return (
          <span className="text-sm text-[#4ade80] font-medium flex items-center bg-[rgba(74,222,128,0.1)] border border-[#4ade80]/20 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={14} className="mr-2" />
            Approved & Paid
          </span>
        );

      case 4: // Rejected
        return (
          <div className="flex flex-col items-start space-y-2">
            <span className="text-sm text-red-400 font-medium flex items-center">
              <AlertCircle size={14} className="mr-2" /> Rejected
            </span>
            <input
              type="file"
              id={`file-resubmit-${key}`}
              className="hidden"
              onChange={(e) => handleFileUpload(project.projectId, milestone.milestoneId, e, milestone.status)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <label
              htmlFor={`file-resubmit-${key}`}
              className="btn-glass bg-red-900/30 border-red-500/30 hover:bg-red-900/50 text-red-300 text-xs py-1.5 cursor-pointer"
            >
              <Upload size={12} className="mr-1" />
              Resubmit
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  const getProjectProgress = (milestones: Milestone[]) => {
    const approved = milestones.filter(m => m.status === 3).length;
    return (approved / milestones.length) * 100;
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
              <HardHat size={18} className="mr-2" /> Contractor Dashboard
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="wallet-pill">
              <div className="wallet-dot"></div>
              <span>{formatAddress(walletAddress)}</span>
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
        <h1 className="font-display text-3xl font-bold text-text-primary mb-10">My Projects</h1>

        {loading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 size={32} className="animate-spin mb-4 text-accent-1" />
            <p className="text-text-muted">Loading assignments from blockchain...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <HardHat size={48} className="mx-auto mb-4 text-border-medium" strokeWidth={1} />
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">No Projects Assigned</h3>
            <p className="text-text-muted">You haven't been assigned to any projects yet.</p>
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
                    <p className="text-sm text-text-muted max-w-[80%]">{project.description}</p>
                  </div>
                  <Link
                    href={`/explorer/${project.projectId}`}
                    className="text-sm text-accent-2 hover:text-white flex items-center space-x-1 transition-colors bg-[rgba(255,255,255,0.03)] border border-border-subtle px-4 py-2 rounded-lg"
                  >
                    <span>View Public</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Project Progress</span>
                    <span className="text-sm font-bold text-text-primary">{getProjectProgress(project.milestones).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-2 border border-border-subtle">
                    <div
                      className="bg-grad-surface-1 h-full rounded-full transition-all duration-500 ease-in-out relative overflow-hidden"
                      style={{ width: `${getProjectProgress(project.milestones)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center">
                    <Activity size={18} className="mr-2 text-accent-1" /> Milestones
                  </h3>
                  {project.milestones.map((milestone) => (
                    <div key={milestone.milestoneId} className="bg-[rgba(255,255,255,0.02)] border border-border-subtle rounded-lg p-5 border-l-2 border-l-accent-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                      <div className="flex justify-between items-start mb-2">
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
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-accent-2 font-medium bg-[rgba(255,255,255,0.03)] border border-border-subtle px-3 py-1 rounded-full">
                              {formatAmount(milestone.fundAmount)} ETH
                            </span>
                            {milestone.proofHash && (
                              <span className="text-[#4ade80] flex items-center bg-[rgba(74,222,128,0.1)] border border-[#4ade80]/20 px-3 py-1 rounded-full">
                                <CheckCircle2 size={14} className="mr-1.5" />
                                Proof Submitted
                              </span>
                            )}
                          </div>
                          {milestone.rejectionReason && (
                            <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                              <p className="text-sm text-red-300 flex items-start">
                                <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
                                <span><strong className="text-red-400">Rejection Reason:</strong> {milestone.rejectionReason}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="ml-6 flex-shrink-0">
                          {getMilestoneActionButton(project, milestone)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-8 pt-8 border-t border-border-subtle">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-display font-bold text-text-primary mb-1">
                        {project.milestones.filter(m => m.status === 3).length}<span className="text-border-medium text-xl">/{project.milestones.length}</span>
                      </div>
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Milestones Completed</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-[#4ade80] mb-1">
                        {formatAmount(
                          project.milestones
                            .filter(m => m.status === 3)
                            .reduce((sum, m) => sum + m.fundAmount, BigInt(0))
                        )} <span className="text-base text-border-medium font-sans">ETH</span>
                      </div>
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Funds Received</div>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-accent-2 mb-1">
                        {formatAmount(
                          project.milestones.reduce((sum, m) => sum + m.fundAmount, BigInt(0))
                        )} <span className="text-base text-border-medium font-sans">ETH</span>
                      </div>
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total Budget</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

