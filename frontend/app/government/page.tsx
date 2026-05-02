'use client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, LogOut, Plus, X, ChevronRight, AlertCircle, Info, Loader2, FileText, CheckCircle2, CircleDot } from 'lucide-react';
import { ethers } from 'ethers';
import {
  connectWallet,
  disconnectWallet,
  formatAddress,
  getPublicFundProjectContract,
  parseAmount,
  formatAmount,
  getProjectStatusLabel,
  getStatusColor,
  ensureCorrectNetwork
} from '@/utils/web3';

interface Project {
  projectId: number;
  title: string;
  description: string;
  allocatedFunds: bigint;
  spentFunds: bigint;
  remainingFunds: bigint;
  status: number;
  contractorAddress: string;
  auditorAddress: string;
  createdAt: number;
}

export default function GovernmentDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [contractorAddress, setContractorAddress] = useState('');
  const [auditorAddress, setAuditorAddress] = useState('');
  const [milestones, setMilestones] = useState([
    { title: '', description: '', amount: '', estimatedDate: '' }
  ]);
  const [allocateFunds, setAllocateFunds] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    initWallet();
  }, []);

  const initWallet = async () => {
    try {
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
      await loadProjects();
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    console.log('🔌 Disconnect button clicked');
    try {
      disconnectWallet();
      setWalletAddress('');
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);

      // First test RPC connection
      try {
        const { getProvider } = await import('@/utils/web3');
        const provider = getProvider();
        await provider.getBlockNumber();
        console.log('✅ RPC connection OK');
      } catch (rpcError: any) {
        console.error('RPC connection error:', rpcError);
        alert('⚠️ Cannot connect to Hardhat node.\n\nPlease ensure Hardhat node is running:\n1. Run: npm run node\n2. Then refresh this page.');
        setProjects([]);
        setLoading(false);
        return;
      }

      const contract = await getPublicFundProjectContract(false);

      // Verify contract address
      const contractAddress = await contract.getAddress();
      console.log('Contract address:', contractAddress);

      // Check if contract is accessible
      try {
        // First verify contract has code
        const { getProvider } = await import('@/utils/web3');
        const provider = getProvider();
        const code = await provider.getCode(contractAddress);
        console.log('Contract code length:', code.length);

        if (code.length < 10) {
          throw new Error(`Contract has no code at ${contractAddress}. Please deploy contracts first.`);
        }

        const totalProjects = await contract.getTotalProjects();
        console.log('Total projects in contract:', totalProjects.toString());

        if (Number(totalProjects) === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('Error checking total projects:', error);

        // More helpful error message
        let errorMsg = '⚠️ Cannot access contract.\n\n';
        if (error.message?.includes('RPC') || error.message?.includes('network')) {
          errorMsg += 'Hardhat node may not be running.\n';
          errorMsg += '1. Check if node is running: npm run node\n';
          errorMsg += '2. If not, start it in a separate terminal\n';
        } else {
          errorMsg += 'Contract may not be deployed.\n';
          errorMsg += 'Run: npm run deploy:local\n';
        }
        errorMsg += '\nThen refresh this page.';

        alert(errorMsg);
        setProjects([]);
        setLoading(false);
        return;
      }

      const allProjects = await contract.getAllProjects();
      console.log('Raw projects from contract:', allProjects);

      if (!allProjects || allProjects.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      console.log(`Processing ${allProjects.length} projects...`);
      const projectsList = await Promise.all(
        allProjects.map(async (p: any, index: number) => {
          try {
            const projectId = Number(p.projectId);
            console.log(`  Processing project ${index + 1}/${allProjects.length}: ID ${projectId}`);

            // Get milestones to calculate total budget
            const milestones = await contract.getProjectMilestones(projectId);
            console.log(`    Found ${milestones.length} milestones`);

            let totalBudget = 0;
            for (let i = 0; i < milestones.length; i++) {
              totalBudget += parseFloat(formatAmount(milestones[i].fundAmount));
            }

            // Store budget for this project
            setProjectBudgets(prev => ({ ...prev, [projectId]: totalBudget }));

            // Auto-fill allocation field with total budget if not allocated yet
            if (Number(p.status) === 0 && !allocateFunds[projectId] && totalBudget > 0) {
              setAllocateFunds(prev => ({ ...prev, [projectId]: totalBudget.toString() }));
            }

            return {
              projectId,
              title: p.title,
              description: p.description,
              allocatedFunds: p.allocatedFunds,
              spentFunds: p.spentFunds,
              remainingFunds: p.remainingFunds,
              status: Number(p.status),
              contractorAddress: p.contractorAddress,
              auditorAddress: p.auditorAddress,
              createdAt: Number(p.createdAt),
            };
          } catch (error: any) {
            console.error(`❌ Error processing project ${p.projectId}:`, error);
            // Return a basic project object even if milestones fail
            return {
              projectId: Number(p.projectId),
              title: p.title || 'Unknown',
              description: p.description || '',
              allocatedFunds: p.allocatedFunds || BigInt(0),
              spentFunds: p.spentFunds || BigInt(0),
              remainingFunds: p.remainingFunds || BigInt(0),
              status: Number(p.status || 0),
              contractorAddress: p.contractorAddress || '',
              auditorAddress: p.auditorAddress || '',
              createdAt: Number(p.createdAt || 0),
            };
          }
        })
      );

      // Filter out null values
      const validProjects = projectsList.filter(p => p !== null);
      setProjects(validProjects);
      console.log(`✅ Loaded ${validProjects.length} projects successfully`);
    } catch (error: any) {
      console.error('❌ Error loading projects:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // Don't show alert on every error - just log it
      // alert('Error loading projects: ' + (error.message || 'Unknown error') + '\n\nMake sure Hardhat node is running.');
      setProjects([]);
    } finally {
      console.log('🏁 Finished loading projects, clearing loading state');
      setLoading(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', amount: '', estimatedDate: '' }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Ensure we're on the correct network
      await ensureCorrectNetwork();

      const contract = await getPublicFundProjectContract(true);

      const milestoneTitles = milestones.map(m => m.title);
      const milestoneDescriptions = milestones.map(m => m.description);
      const milestoneAmounts = milestones.map(m => parseAmount(m.amount));
      const milestoneEstimatedDates = milestones.map(m =>
        Math.floor(new Date(m.estimatedDate).getTime() / 1000)
      );

      // Ensure addresses are checksummed (not ENS names)
      const contractorAddr = ethers.getAddress(contractorAddress.trim());
      const auditorAddr = ethers.getAddress(auditorAddress.trim());

      console.log('Creating project with:', {
        title: projectTitle,
        contractor: contractorAddr,
        auditor: auditorAddr,
        milestones: milestoneTitles.length
      });

      const tx = await contract.createProject(
        projectTitle,
        projectDescription,
        contractorAddr,
        auditorAddr,
        milestoneTitles,
        milestoneDescriptions,
        milestoneAmounts,
        milestoneEstimatedDates
      );

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // Get the project ID from the transaction
      const projectCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'ProjectCreated';
        } catch {
          return false;
        }
      });

      let projectId = null;
      if (projectCreatedEvent) {
        const parsed = contract.interface.parseLog(projectCreatedEvent);
        projectId = parsed?.args.projectId;
        console.log('Project created with ID:', projectId?.toString());
      }

      alert(`Project created successfully!${projectId ? ` Project ID: ${projectId}` : ''}`);
      setShowCreateForm(false);

      // Reset form
      setProjectTitle('');
      setProjectDescription('');
      setContractorAddress('');
      setAuditorAddress('');
      setMilestones([{ title: '', description: '', amount: '', estimatedDate: '' }]);

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects
      console.log('🔄 Reloading projects...');
      try {
        await loadProjects();
        console.log('✅ Projects reloaded successfully');
      } catch (error) {
        console.error('❌ Error reloading projects:', error);
        // Don't throw - just log the error, projects will load on next page refresh
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert('Failed to create project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateFunds = async (projectId: number) => {
    try {
      const amount = allocateFunds[projectId];
      if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter valid amount');
        return;
      }

      const allocationAmount = parseFloat(amount);

      // Get project details to calculate total budget
      setLoading(true);
      const contract = await getPublicFundProjectContract(false);
      const projectDetails = await contract.getProjectDetails(projectId);
      const milestones = await contract.getProjectMilestones(projectId);

      // Calculate total budget from milestones
      let totalBudget = 0;
      for (let i = 0; i < milestones.length; i++) {
        totalBudget += parseFloat(formatAmount(milestones[i].fundAmount));
      }

      // Validate allocation amount
      if (allocationAmount !== totalBudget) {
        alert(`Allocation amount (${allocationAmount} ETH) must match total budget (${totalBudget} ETH).\n\nPlease allocate exactly ${totalBudget} ETH.`);
        setLoading(false);
        return;
      }

      // Check if already allocated
      const alreadyAllocated = parseFloat(formatAmount(projectDetails.allocatedFunds));
      if (alreadyAllocated > 0) {
        alert(`Project already has ${alreadyAllocated} ETH allocated. Cannot allocate more.`);
        setLoading(false);
        return;
      }

      // Ensure we're on the correct network
      await ensureCorrectNetwork();

      // Get contract with signer for transaction
      const contractWithSigner = await getPublicFundProjectContract(true);

      // Convert amount to wei
      const amountInWei = parseAmount(amount);

      console.log(`Allocating ${amount} ETH (${amountInWei.toString()} wei) to project ${projectId}`);

      const tx = await contractWithSigner.allocateFunds(projectId, {
        value: amountInWei
      });

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      alert(`Successfully allocated ${amount} ETH to project!`);
      setAllocateFunds({ ...allocateFunds, [projectId]: '' });

      // Wait a moment for blockchain state to update
      console.log('⏳ Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload projects
      console.log('🔄 Reloading projects after allocation...');
      try {
        await loadProjects();
        console.log('✅ Projects reloaded successfully');
      } catch (error) {
        console.error('❌ Error reloading projects:', error);
        // Don't throw - just log the error
      }
    } catch (error: any) {
      console.error('Error allocating funds:', error);
      alert('Failed to allocate funds: ' + (error.message || error.reason || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getTotalBudget = () => {
    return milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
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
              <Building size={18} className="mr-2" /> Government Dashboard
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
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="font-display text-3xl font-bold text-text-primary">My Projects</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-glass btn-primary"
          >
            {showCreateForm ? <X size={18} /> : <Plus size={18} />}
            <span>{showCreateForm ? 'Cancel' : 'Create New Project'}</span>
          </button>
        </div>

        <AnimatePresence>
          {/* Create Project Form */}
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-8 mb-10 overflow-hidden"
            >
              <h2 className="font-display text-xl font-bold mb-6">Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Project Title *</label>
                    <input
                      type="text"
                      required
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none transition-all"
                      placeholder="e.g., City Road Construction"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Total Budget (ETH)</label>
                    <div className="text-2xl font-bold text-gradient">
                      {getTotalBudget()} ETH
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-muted mb-2">Project Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none transition-all"
                    placeholder="Detailed project description..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Contractor Address *</label>
                    <input
                      type="text"
                      required
                      value={contractorAddress}
                      onChange={(e) => setContractorAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none font-mono text-sm transition-all"
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Auditor Address *</label>
                    <input
                      type="text"
                      required
                      value={auditorAddress}
                      onChange={(e) => setAuditorAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none font-mono text-sm transition-all"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                {/* Milestones */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-display text-lg font-semibold">Milestones</h3>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-accent-1 flex items-center space-x-1 text-sm font-medium hover:text-white transition-colors"
                    >
                      <Plus size={16} />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="bg-[rgba(255,255,255,0.02)] border border-border-subtle p-5 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium text-sm text-accent-1">Milestone #{index + 1}</span>
                          {milestones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMilestone(index)}
                              className="text-text-muted hover:text-red-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            required
                            value={milestone.title}
                            onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none text-sm transition-all"
                            placeholder="Milestone title"
                          />
                          <input
                            type="number"
                            step="0.001"
                            required
                            value={milestone.amount}
                            onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none text-sm transition-all"
                            placeholder="Amount (ETH)"
                          />
                          <input
                            type="date"
                            required
                            value={milestone.estimatedDate}
                            onChange={(e) => updateMilestone(index, 'estimatedDate', e.target.value)}
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none text-sm transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                          />
                          <input
                            type="text"
                            required
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.02)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none text-sm transition-all"
                            placeholder="Brief description"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-glass btn-primary px-8"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating...</> : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-glass btn-ghost px-8"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Projects List */}
        {loading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 size={32} className="animate-spin mb-4 text-accent-1" />
            <p className="text-text-muted">Loading projects from blockchain...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <FileText size={48} className="mx-auto mb-4 text-border-medium" strokeWidth={1} />
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">No Projects Found</h3>
            <p className="text-text-muted">Create your first public fund allocation project to get started.</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid gap-6"
          >
            {projects.map((project) => (
              <motion.div 
                key={project.projectId} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
                }} 
                className="glass-card p-7"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-display text-xl font-bold text-text-primary">{project.title}</h3>
                      <span className={`tag ${getStatusColor(project.status, 'project')}`}>
                        {getProjectStatusLabel(project.status)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted max-w-[80%]">{project.description}</p>
                  </div>
                  <Link
                    href={`/explorer/${project.projectId}`}
                    className="text-sm text-accent-1 flex items-center space-x-1 hover:text-white transition-colors"
                  >
                    <span>View Details</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[rgba(255,255,255,0.02)] border border-border-subtle p-4 rounded-lg">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Allocated</div>
                    <div className="text-lg font-bold text-accent-1">{formatAmount(project.allocatedFunds)} ETH</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.02)] border border-border-subtle p-4 rounded-lg">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Spent</div>
                    <div className="text-lg font-bold text-[#4ade80]">{formatAmount(project.spentFunds)} ETH</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.02)] border border-border-subtle p-4 rounded-lg">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Remaining</div>
                    <div className="text-lg font-bold text-accent-2">{formatAmount(project.remainingFunds)} ETH</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.02)] border border-border-subtle p-4 rounded-lg">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Project ID</div>
                    <div className="text-lg font-bold font-mono text-[#fbbf24]">#{project.projectId}</div>
                  </div>
                </div>

                {/* Allocate Funds */}
                {project.status === 0 && (
                  <div className="bg-[rgba(255,255,255,0.03)] border border-border-medium rounded-lg p-5">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-text-primary mb-1 flex items-center">
                        <AlertCircle size={14} className="mr-2 text-accent-1" />
                        Allocate Escrow Funds
                        {projectBudgets[project.projectId] && (
                          <span className="text-text-muted ml-2 font-normal">
                            (Total Budget: {projectBudgets[project.projectId]} ETH)
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          step="0.001"
                          value={allocateFunds[project.projectId] || ''}
                          onChange={(e) => setAllocateFunds({ ...allocateFunds, [project.projectId]: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[rgba(0,0,0,0.3)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none transition-all"
                          placeholder={`Amount to allocate (ETH)${projectBudgets[project.projectId] ? ` - Should be ${projectBudgets[project.projectId]} ETH` : ''}`}
                        />
                        {projectBudgets[project.projectId] && (
                          <p className="text-[11px] text-accent-2 mt-2 flex items-center">
                            <Info size={12} className="mr-1" />
                            Enter exactly {projectBudgets[project.projectId]} ETH to match total milestone budget
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAllocateFunds(project.projectId)}
                        disabled={loading}
                        className="btn-glass btn-primary whitespace-nowrap self-start mt-0 py-2.5 h-[46px]"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Allocate Funds'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-border-medium mt-6 uppercase tracking-wider font-semibold">
                  Created: {new Date(project.createdAt * 1000).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
