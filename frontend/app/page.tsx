'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { connectWallet, disconnectWallet, formatAddress } from '@/utils/web3';
import {
  Shield,
  Key,
  BadgeCheck,
  Activity,
  Building,
  HardHat,
  ClipboardCheck,
  Globe,
  Wallet
} from 'lucide-react';

/* ── Step data ──────────────────────────────────────────── */
const steps = [
  { n: '01', title: 'Fund Allocation', body: 'Government deploys a smart contract, defines project milestones, and deposits funds into an on-chain escrow — immutably locked until conditions are met.' },
  { n: '02', title: 'Milestone Request', body: 'Assigned contractor submits a milestone completion request with cryptographic proof of work (IPFS-linked document hash) to the blockchain.' },
  { n: '03', title: 'ZK-Lite Verification', body: 'An independent auditor verifies the proof via the ZKVerifier contract — spending is confirmed without exposing sensitive invoice data.' },
  { n: '04', title: 'NFT Approval Seal', body: 'On approval, the ApprovalNFT contract mints a unique ERC-721 token as an immutable, on-chain record of verification.' },
  { n: '05', title: 'Fund Release & Score', body: 'Funds are released to the contractor. The ImpactScore contract updates the Public Trust Index in real time for citizen visibility.' },
];

const features = [
  { icon: <Shield size={20} strokeWidth={1.5} />, title: 'Milestone-Based Escrow', body: 'Smart contracts hold funds in escrow and release them only when auditor-verified milestones are met — eliminating premature withdrawal.' },
  { icon: <Key size={20} strokeWidth={1.5} />, title: 'Zero-Knowledge Proofs', body: 'Citizens verify that spending occurred and is valid without ever seeing sensitive invoice data. Privacy and transparency coexist.' },
  { icon: <BadgeCheck size={20} strokeWidth={1.5} />, title: 'NFT Approval Stamps', body: 'Each auditor approval mints a unique ERC-721 Public Audit Seal — a permanent, tamper-proof record stored on Polygon.' },
  { icon: <Activity size={20} strokeWidth={1.5} />, title: 'Public Trust Index', body: 'An on-chain impact score (0–100) computed from milestone timing, budget adherence, and audit pass rate. Fully transparent.' },
];

const portals = [
  { href: '/government', icon: <Building size={22} strokeWidth={1.5} />, label: 'Government', sub: 'Create projects and allocate funds' },
  { href: '/contractor', icon: <HardHat size={22} strokeWidth={1.5} />, label: 'Contractor', sub: 'Request milestone fund releases' },
  { href: '/auditor', icon: <ClipboardCheck size={22} strokeWidth={1.5} />, label: 'Auditor', sub: 'Verify and approve milestones' },
  { href: '/explorer', icon: <Globe size={22} strokeWidth={1.5} />, label: 'Public Explorer', sub: 'View transparent fund flow' },
];

const stats = [
  { value: '100%', label: 'On-chain Transparency' },
  { value: 'Real-time', label: 'Fund Tracking' },
  { value: 'Immutable', label: 'Audit Records' },
  { value: 'Zero', label: 'Misappropriation' },
];

/* ── Animation Variants ──────────────────────────────────── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } }
};

/* ── Component ──────────────────────────────────────────── */
export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect wallet. Please install MetaMask.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWalletAddress('');
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      });
    }
  }, []);

  return (
    <main className="relative min-h-screen bg-main overflow-x-hidden text-text-primary">

      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="glass-nav sticky top-0 z-[100] flex h-[72px] items-center px-6">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
          <span className="font-display text-[22px] font-bold tracking-[-0.02em] text-text-primary">
            PF<span className="text-gradient">TUS</span>
          </span>

          <div className="flex items-center gap-2.5">
            {walletAddress ? (
              <>
                <div className="wallet-pill">
                  <div className="wallet-dot" />
                  <span>{formatAddress(walletAddress)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDisconnect(); }}
                  className="btn-glass btn-ghost"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-glass btn-primary"
              >
                <Wallet size={16} strokeWidth={1.8} />
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] items-center justify-center px-6 py-20">
        {/* Ambient blobs */}
        <div className="blob bg-[rgba(160,160,180,0.055)] w-[520px] h-[520px] top-[-80px] left-[-120px]" />
        <div className="blob bg-[rgba(140,140,160,0.04)] w-[400px] h-[400px] bottom-[40px] right-[-80px]" />

        <motion.div 
          className="relative z-10 max-w-[780px] text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUpVariant} className="mb-5">
            <span className="tag">Polygon Blockchain · Open Source</span>
          </motion.div>

          <motion.h1 
            variants={fadeUpVariant}
            className="mb-6 font-display text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary"
          >
            Public Funds,{' '}
            <span className="text-gradient">Radically Transparent</span>
          </motion.h1>

          <motion.p 
            variants={fadeUpVariant}
            className="mx-auto mb-10 max-w-[580px] text-[clamp(1rem,2vw,1.2rem)] font-normal leading-[1.7] text-text-muted"
          >
            A blockchain platform that makes every rupee of government spending traceable, auditable, and publicly verifiable — in real time.
          </motion.p>

          <motion.div variants={fadeUpVariant} className="flex flex-wrap justify-center gap-3">
            <Link href="/explorer">
              <button className="btn-glass btn-primary px-7 py-3 text-[15px] font-semibold">
                Explore Fund Flow
              </button>
            </Link>
            <Link href="#portals">
              <button className="btn-glass btn-ghost px-7 py-3 text-[15px]">
                Dashboard
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="mb-14 text-center"
        >
          <h2 className="mb-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.025em] text-text-primary">
            Built for <span className="text-gradient">Accountability</span>
          </h2>
          <p className="mx-auto max-w-[480px] text-[1.05rem] text-text-muted">
            Four novel mechanisms that eliminate misuse before it can happen.
          </p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5"
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUpVariant} className="glass-card p-7">
              <div className="icon-box mb-[18px] text-accent-2">{f.icon}</div>
              <h3 className="mb-2.5 font-display text-[1.05rem] font-semibold text-text-primary">{f.title}</h3>
              <p className="text-[0.92rem] leading-[1.65] text-text-muted">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <div className="divider mx-auto max-w-[1200px]" />

      {/* ── Dashboard Portals ───────────────────────────── */}
      <section id="portals" className="mx-auto my-20 max-w-[1200px]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="glass-card border-t border-accent-1 bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-[rgba(255,255,255,0.01)] px-10 py-20"
        >
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-display text-[clamp(1.8rem,4vw,2.5rem)] font-bold tracking-[-0.025em] text-text-primary">
              Access <span className="text-gradient">Your Dashboard</span>
            </h2>
            <p className="text-[1rem] text-text-muted">
              Role-based portals — each with precisely scoped permissions on-chain.
            </p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]"
          >
            {portals.map((p, i) => (
              <motion.div key={i} variants={fadeUpVariant}>
                <Link href={p.href} className="block no-underline">
                  <div className="glass-card cursor-pointer px-6 py-7">
                    <div className="icon-box mb-[18px] text-accent-1">{p.icon}</div>
                    <h3 className="mb-1.5 font-display text-[1rem] font-semibold text-text-primary">{p.label}</h3>
                    <p className="text-[0.88rem] leading-[1.55] text-text-muted">{p.sub}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-20 pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[1px] overflow-hidden rounded-[var(--radius)] border border-border-subtle"
        >
          {stats.map((s, i) => (
            <div key={i} className="bg-card px-6 py-9 text-center border-r border-border-subtle last:border-r-0">
              <div className="text-gradient mb-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold">{s.value}</div>
              <div className="text-[0.85rem] tracking-[0.02em] text-text-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border-subtle px-6 py-8 text-center">
        <p className="mb-1.5 text-[0.85rem] text-text-muted">
          &copy; 2026 PFTUS — Blockchain-based Public Fund Tracking & Utilization System
        </p>
        <p className="text-[0.8rem] text-accent-3">
          Built for transparency, accountability, and public trust in governance
        </p>
      </footer>
    </main>
  );
}
