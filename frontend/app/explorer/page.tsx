'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Globe, Search, Filter, FolderKanban, Banknote, CreditCard, CheckSquare, ChevronRight, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  getPublicFundProjectContract,
  formatAmount,
  getProjectStatusLabel,
  getStatusColor,
  formatTimestamp
} from '@/utils/web3';

interface Project {
  projectId: number;
  title: string;
  description: string;
  allocatedFunds: bigint;
  spentFunds: bigint;
  remainingFunds: bigint;
  status: number;
  createdAt: number;
}

export default function PublicExplorer() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const contract = await getPublicFundProjectContract(false);
      const allProjects = await contract.getAllProjects();

      setProjects(allProjects.map((p: any) => ({
        projectId: Number(p.projectId),
        title: p.title,
        description: p.description,
        allocatedFunds: p.allocatedFunds,
        spentFunds: p.spentFunds,
        remainingFunds: p.remainingFunds,
        status: Number(p.status),
        createdAt: Number(p.createdAt),
      })));
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTotalAllocated = () => {
    return projects.reduce((sum, p) => sum + p.allocatedFunds, BigInt(0));
  };

  const getTotalSpent = () => {
    return projects.reduce((sum, p) => sum + p.spentFunds, BigInt(0));
  };

  const getCompletedProjects = () => {
    return projects.filter(p => p.status === 2).length;
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
            <div className="flex items-center space-x-2">
              <Globe size={18} className="text-accent-1" />
              <span className="text-sm font-semibold text-text-primary">Public Explorer</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-text-muted">Open & Transparent</span>
            <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse shadow-[0_0_8px_#4ade80]"></div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border-subtle bg-grad-surface-1 py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-accent-1 to-transparent opacity-30" />
        <div className="w-full max-w-[1200px] mx-auto px-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-4"
          >
            Public Fund <span className="text-gradient">Transparency Portal</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-text-muted max-w-2xl mx-auto"
          >
            Track government projects, fund utilization, and milestone progress in real-time on the blockchain.
          </motion.p>
        </div>
      </div>

      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 relative z-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-b-2 border-b-border-medium">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total Projects</p>
              <div className="w-10 h-10 bg-[rgba(255,255,255,0.03)] border border-border-subtle rounded-lg flex items-center justify-center">
                <FolderKanban size={20} className="text-border-medium" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-text-primary">{projects.length}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-b-2 border-b-[#4ade80]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total Allocated</p>
              <div className="w-10 h-10 bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-lg flex items-center justify-center">
                <Banknote size={20} className="text-[#4ade80]" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-[#4ade80]">{formatAmount(getTotalAllocated())} <span className="text-base text-border-medium font-sans">ETH</span></p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 border-b-2 border-b-accent-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Total Spent</p>
              <div className="w-10 h-10 bg-accent-2/10 border border-accent-2/20 rounded-lg flex items-center justify-center">
                <CreditCard size={20} className="text-accent-2" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-accent-2">{formatAmount(getTotalSpent())} <span className="text-base text-border-medium font-sans">ETH</span></p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 border-b-2 border-b-accent-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Completed</p>
              <div className="w-10 h-10 bg-accent-3/10 border border-accent-3/20 rounded-lg flex items-center justify-center">
                <CheckSquare size={20} className="text-accent-3" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-accent-3">{getCompletedProjects()}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2 flex items-center">
                <Search size={14} className="mr-2" />
                Search Projects
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-4 py-3 bg-[rgba(0,0,0,0.3)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2 flex items-center">
                <Filter size={14} className="mr-2" />
                Filter by Status
              </label>
              <select
                value={statusFilter === null ? '' : statusFilter}
                onChange={(e) => setStatusFilter(e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-[rgba(0,0,0,0.3)] text-text-primary border border-border-subtle rounded-lg focus:ring-1 focus:ring-accent-1 focus:border-accent-1 outline-none transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#0a0a0a]">All Statuses</option>
                <option value="0" className="bg-[#0a0a0a]">Pending Allocation</option>
                <option value="1" className="bg-[#0a0a0a]">Active</option>
                <option value="2" className="bg-[#0a0a0a]">Completed</option>
                <option value="3" className="bg-[#0a0a0a]">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-10 h-10 border-2 border-transparent border-t-accent-1 rounded-full animate-spin mb-4" />
            <p className="text-text-muted">Loading projects from blockchain...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Search size={48} className="mx-auto mb-4 text-border-medium" strokeWidth={1} />
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">No Projects Found</h3>
            <p className="text-text-muted">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project) => (
              <Link
                key={project.projectId}
                href={`/explorer/${project.projectId}`}
                className="block outline-none"
              >
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
                  }}
                  className="glass-card p-6 h-full flex flex-col card-hover"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-display text-lg font-bold text-text-primary pr-4 line-clamp-2">{project.title}</h3>
                    <span className={`tag flex-shrink-0 ${getStatusColor(project.status, 'project')}`}>
                      {getProjectStatusLabel(project.status)}
                    </span>
                  </div>

                  <p className="text-sm text-text-muted mb-6 flex-1 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  <div className="bg-[rgba(255,255,255,0.02)] border border-border-subtle rounded-lg p-4 mb-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Allocated</span>
                      <span className="font-semibold text-accent-1">{formatAmount(project.allocatedFunds)} ETH</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Spent</span>
                      <span className="font-semibold text-[#4ade80]">{formatAmount(project.spentFunds)} ETH</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Remaining</span>
                      <span className="font-semibold text-accent-2">{formatAmount(project.remainingFunds)} ETH</span>
                    </div>
                  </div>

                  {project.allocatedFunds > BigInt(0) && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2 text-xs">
                        <span className="text-text-muted uppercase tracking-wider font-semibold">Utilization</span>
                        <span className="font-bold text-text-primary">
                          {((Number(project.spentFunds) / Number(project.allocatedFunds)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden border border-border-subtle">
                        <div
                          className="h-full bg-gradient-to-r from-accent-3 to-accent-2 rounded-full"
                          style={{ width: `${(Number(project.spentFunds) / Number(project.allocatedFunds)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-border-subtle mt-auto">
                    <div className="flex items-center space-x-3 text-[11px] uppercase tracking-wider font-semibold text-border-medium">
                      <span>ID: #{project.projectId}</span>
                      <span>•</span>
                      <span>{formatTimestamp(project.createdAt)}</span>
                    </div>
                    <span className="flex items-center text-xs font-semibold text-accent-1">
                      Details <ArrowRight size={14} className="ml-1" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-grad-surface-1 py-16 mt-20 relative z-10">
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-4 flex items-center">
                PF<span className="text-gradient">TUS</span>
              </h3>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm">
                Blockchain-based Public Fund Tracking & Utilization System. Built for absolute transparency and accountability.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-text-primary uppercase tracking-widest mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/" className="text-sm text-text-muted hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/explorer" className="text-sm text-accent-1 transition-colors">Public Explorer</Link></li>
                <li><Link href="/government" className="text-sm text-text-muted hover:text-white transition-colors">Government Portal</Link></li>
                <li><Link href="/contractor" className="text-sm text-text-muted hover:text-white transition-colors">Contractor Portal</Link></li>
                <li><Link href="/auditor" className="text-sm text-text-muted hover:text-white transition-colors">Auditor Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-text-primary uppercase tracking-widest mb-6">Transparency Protocol</h4>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm mb-4">
                All transactions, fund allocations, and milestone approvals are permanently recorded on the blockchain and publicly verifiable.
              </p>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#4ade80]">
                <CheckCircle2 size={14} className="mr-1" />
                <span>Smart Contract Verified</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-border-medium font-semibold uppercase tracking-wider">
            <p>© {new Date().getFullYear()} PFTUS. All rights reserved.</p>
            <p className="mt-4 md:mt-0 flex items-center">
              <Activity size={14} className="mr-2 text-accent-1" /> System Operational
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
