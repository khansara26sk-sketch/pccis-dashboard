import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ScanLine,
  FileSearch,
  CheckCircle2,
  FileCheck2,
  History,
  FileBarChart2,
  ArrowRight,
  Upload,
  Cpu,
  Scale,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Layers,
  ChevronRight,
  AlertTriangle,
  Lock,
  UserCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll handler
  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF7] dark:bg-[#101713] text-[#17211B] dark:text-[#F0FDF4] transition-colors duration-200 selection:bg-[#DCFCE7] dark:selection:bg-[#173D26] selection:text-[#15803D] dark:selection:text-[#4ADE80]">
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 dark:bg-[#141D17]/85 border-b border-[#E5EDE6] dark:border-[#29382D] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#15803D] to-[#166534] dark:from-[#22C55E] dark:to-[#15803D] flex items-center justify-center text-white dark:text-[#101713] shadow-md shadow-[#15803D]/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] leading-none">
                PCCIS
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#15803D] dark:text-[#4ADE80] tracking-wider mt-1 leading-none">
                Legal Metrology Suite
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[#17211B] dark:text-[#F0FDF4] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-[#647067] dark:text-[#A3B3A6] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-[#647067] dark:text-[#A3B3A6] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-[#647067] dark:text-[#A3B3A6] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors"
            >
              About
            </button>
          </nav>

          {/* Top-Right CTA Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] border border-[#E5EDE6] dark:border-[#29382D] transition-colors"
              aria-label="Toggle theme"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-[#4ADE80]" /> : <Moon className="w-4 h-4 text-[#15803D]" />}
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-bold shadow-md shadow-[#15803D]/20 transition-all hover:scale-[1.02]"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#17211B] dark:text-[#F0FDF4] hover:text-[#15803D] dark:hover:text-[#4ADE80] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-bold shadow-md shadow-[#15803D]/20 transition-all hover:scale-[1.02]"
                >
                  <span>Signup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] border border-[#E5EDE6] dark:border-[#29382D]"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#4ADE80]" /> : <Moon className="w-4 h-4 text-[#15803D]" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] border border-[#E5EDE6] dark:border-[#29382D]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#141D17] px-4 py-4 space-y-3">
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]"
            >
              About
            </button>
            <div className="pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] text-xs font-bold text-[#17211B] dark:text-[#F0FDF4]"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="w-full text-center py-2.5 rounded-xl bg-[#15803D] dark:bg-[#22C55E] text-white dark:text-[#101713] text-xs font-bold"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Soft emerald radial glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-linear-to-tr from-[#DCFCE7]/60 via-[#15803D]/10 to-transparent dark:from-[#173D26]/40 dark:via-[#22C55E]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              {/* Statutory Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCFCE7] dark:bg-[#173D26] border border-[#15803D]/20 dark:border-[#4ADE80]/20 text-[11px] font-semibold text-[#15803D] dark:text-[#4ADE80]">
                <Scale className="w-3.5 h-3.5" />
                <span>Statutory Compliance Architecture • PCR 2011</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] leading-[1.12]">
                Smarter Packaging.{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#15803D] via-[#16A34A] to-[#166534] dark:from-[#4ADE80] dark:via-[#22C55E] dark:to-[#86EFAC]">
                  Better Compliance.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#647067] dark:text-[#A3B3A6] leading-relaxed max-w-xl mx-auto lg:mx-0">
                AI-powered packaged commodity inspection to help inspectors identify declarations, review label information, and streamline compliance workflows.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-bold shadow-lg shadow-[#15803D]/25 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] text-[#17211B] dark:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40 hover:border-[#15803D]/40 text-xs font-bold shadow-xs transition-all"
                >
                  <UserCheck className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
                  <span>Login</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" />
                  <span>Zero Pre-Filled Mock Data</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" />
                  <span>Human-in-the-Loop Discretion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" />
                  <span>FastAPI Real-Time Verification</span>
                </div>
              </div>
            </div>

            {/* Right Product & Dashboard Preview Concept Card */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl p-1 bg-linear-to-b from-[#15803D]/20 via-[#E5EDE6] dark:via-[#29382D] to-transparent shadow-2xl">
                <div className="rounded-[22px] bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] overflow-hidden">
                  {/* Mock Window Title Bar */}
                  <div className="px-4 py-3 bg-[#F7FAF7] dark:bg-[#141D17] border-b border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#15803D] dark:bg-[#4ADE80]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#D97706]/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]/70" />
                      <span className="ml-2 font-mono text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                        pccis://inspection/scanner
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] font-semibold">
                      AI OCR LIVE READY
                    </span>
                  </div>

                  {/* Product Concept Layout */}
                  <div className="p-5 space-y-4">
                    {/* Simulated Inspection Workspace Specimen */}
                    <div className="relative rounded-2xl bg-[#101713] p-5 text-white overflow-hidden border border-[#29382D]">
                      {/* Scanning laser beam effect */}
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-linear-to-r from-transparent via-[#4ADE80] to-transparent shadow-[0_0_12px_#4ADE80]" />
                      
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#4ADE80]">
                            Active AI Inspection Matrix
                          </span>
                          <h4 className="text-sm font-bold font-['Plus_Jakarta_Sans'] mt-0.5">
                            Packaged Commodity Label Specimen
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#173D26] border border-[#4ADE80]/30 text-[10px] font-mono text-[#4ADE80]">
                          <Cpu className="w-3 h-3" />
                          <span>Neural Vision</span>
                        </div>
                      </div>

                      {/* Schematic Bounding Boxes Diagram */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="p-2 rounded-lg bg-white/5 border border-[#4ADE80]/50 relative">
                          <span className="absolute -top-1.5 left-2 px-1 text-[8px] bg-[#15803D] text-white rounded">
                            Rule 6(1)(a)
                          </span>
                          <p className="text-white/60 text-[9px]">Commodity Name</p>
                          <p className="text-[#4ADE80] font-semibold mt-0.5">Identified & Bounded</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-[#4ADE80]/50 relative">
                          <span className="absolute -top-1.5 left-2 px-1 text-[8px] bg-[#15803D] text-white rounded">
                            Rule 6(1)(e)
                          </span>
                          <p className="text-white/60 text-[9px]">MRP Declaration</p>
                          <p className="text-[#4ADE80] font-semibold mt-0.5">Inclusive Tax Syntax</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-[#4ADE80]/50 relative">
                          <span className="absolute -top-1.5 left-2 px-1 text-[8px] bg-[#15803D] text-white rounded">
                            Rule 6(1)(b)
                          </span>
                          <p className="text-white/60 text-[9px]">Net Quantity</p>
                          <p className="text-[#4ADE80] font-semibold mt-0.5">Metric Units Standard</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-[#4ADE80]/50 relative">
                          <span className="absolute -top-1.5 left-2 px-1 text-[8px] bg-[#15803D] text-white rounded">
                            Rule 6(1)(d)
                          </span>
                          <p className="text-white/60 text-[9px]">Packer / Mfg Address</p>
                          <p className="text-[#4ADE80] font-semibold mt-0.5">Complete Contact Info</p>
                        </div>
                      </div>
                    </div>

                    {/* Operational Feature Checklist Card */}
                    <div className="p-3.5 rounded-xl bg-[#F7FAF7] dark:bg-[#141D17] border border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                            Statutory Declaration Audit
                          </p>
                          <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                            Real-time verification against PCR 2011 regulations
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#15803D] dark:text-[#4ADE80] shrink-0">
                        Assisted Workflow
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. FEATURES SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white dark:bg-[#141D17] border-y border-[#E5EDE6] dark:border-[#29382D] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-[#173D26] px-3 py-1 rounded-full border border-[#15803D]/20">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-3">
              Precision Inspection Tools for Modern Regulators
            </h2>
            <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-2 leading-relaxed">
              Equip legal metrology officers and packaging auditors with advanced AI vision, standardized rule engines, and statutory audit logging.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. AI-Powered OCR */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ScanLine className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                AI-Powered OCR
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Optical character recognition engineered specifically for consumer packaging, detecting text on curved cans, glossy laminates, foil wraps, and irregular cartons.
              </p>
            </div>

            {/* 2. Smart Declaration Extraction */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileSearch className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                Smart Declaration Extraction
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Automatically identifies and maps statutory declarations: MRP, Net Quantity, Manufacturer / Packer Address, Consumer Care details, and Manufacturing Date.
              </p>
            </div>

            {/* 3. Compliance Rule Validation */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                Compliance Rule Validation
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Instantaneous heuristics validation against the Legal Metrology (Packaged Commodities) Rules, 2011, assessing inclusive tax phrasing and standard unit abbreviations.
              </p>
            </div>

            {/* 4. Inspector Review */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                Inspector Review
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Human-in-the-loop workspace enabling inspecting officers to zoom into high-res crops, verify bounding coordinates, edit extracted fields, and approve findings.
              </p>
            </div>

            {/* 5. Inspection History */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <History className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                Inspection History
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Centralized database ledger recording all authenticated inspections, searchable by product name, commodity category, or officer ID for complete statutory traceability.
              </p>
            </div>

            {/* 6. Report Generation */}
            <div className="p-6 rounded-2xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileBarChart2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                Report Generation
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Generate formal compliance certificates, infraction notices, and tabular summaries exportable to CSV or formatted for direct PDF printing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HOW IT WORKS SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-[#173D26] px-3 py-1 rounded-full border border-[#15803D]/20">
              Inspection Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-3">
              How PCCIS Works in 4 Steps
            </h2>
            <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-2">
              From packaging label photograph to legally formatted compliance records in seconds.
            </p>
          </div>

          {/* 4 Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center font-bold font-mono text-sm">
                    01
                  </div>
                  <Upload className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6]" />
                </div>
                <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                  Upload Package Image
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                  Inspector captures or uploads a high-resolution photograph of the product packaging or principal display panel.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] text-[11px] font-mono text-[#15803D] dark:text-[#4ADE80]">
                JPG • PNG • WEBP
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center font-bold font-mono text-sm">
                    02
                  </div>
                  <ScanLine className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6]" />
                </div>
                <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                  Extract Label Information
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                  Optical character recognition isolates textual bounding boxes and extracts declarations according to statutory keys.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] text-[11px] font-mono text-[#15803D] dark:text-[#4ADE80]">
                Neural OCR Pipeline
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center font-bold font-mono text-sm">
                    03
                  </div>
                  <Scale className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6]" />
                </div>
                <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                  Review Compliance Results
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                  Rule engine highlights deviations: missing mandatory statements, invalid tax syntax, or improper font dimensions.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] text-[11px] font-mono text-[#15803D] dark:text-[#4ADE80]">
                PCR 2011 Heuristics
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center font-bold font-mono text-sm">
                    04
                  </div>
                  <FileBarChart2 className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6]" />
                </div>
                <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-2">
                  Save & Generate Report
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                  The inspecting officer finalizes the audit record, commits it to the database, and exports certified reports.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] text-[11px] font-mono text-[#15803D] dark:text-[#4ADE80]">
                Audit Trail Recorded
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. ABOUT PCCIS & STATUTORY GOVERNANCE
      ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-20 bg-white dark:bg-[#141D17] border-y border-[#E5EDE6] dark:border-[#29382D] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Description */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-[#173D26] px-3 py-1 rounded-full border border-[#15803D]/20">
                About The Platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                Supporting Enforcement Officers with Intelligent Automation
              </h2>
              <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                PCCIS (Packaged Commodity Compliance Inspection System) was built to modernize legal metrology oversight across consumer retail sectors. By combining automated neural text extraction with statutory validation rules, the system reduces manual transcription bottlenecks while elevating inspection consistency.
              </p>

              {/* Explicit Human-in-the-Loop Governance Notice */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-[#17211B] dark:text-[#F0FDF4] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#D97706] dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Statutory Human Judgment Principle</span>
                </div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                  PCCIS operates strictly as an assistive intelligence platform. Automated optical character extraction and rule checking support authorized inspecting officers but <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">do not replace human legal judgment</span>. Statutory enforcement decisions, compounding determinations, and formal notices remain subject to authorized officer review under prevailing state and central gazetted acts.
                </p>
              </div>

              {/* Four Value Pillars */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#19241C]">
                  <h4 className="text-xs font-bold text-[#17211B] dark:text-[#F0FDF4]">Statutory Accuracy</h4>
                  <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-1">
                    Adheres directly to PCR 2011 rule clauses 6(1)(a) through 6(1)(f).
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#19241C]">
                  <h4 className="text-xs font-bold text-[#17211B] dark:text-[#F0FDF4]">Officer-Centric UI</h4>
                  <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-1">
                    Designed for field auditors, state directorates, and senior inspectors.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Schematic Card */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5EDE6] dark:border-[#29382D]">
                  <ShieldCheck className="w-5 h-5 text-[#15803D] dark:text-[#4ADE80]" />
                  <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
                    System Architecture Standard
                  </h3>
                </div>
                
                <ul className="space-y-3 text-xs text-[#647067] dark:text-[#A3B3A6]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0 mt-0.5" />
                    <span>Pure live backend queries without simulated fake fallbacks.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0 mt-0.5" />
                    <span>Real-time Google OAuth 2.0 token verification with JWT security.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0 mt-0.5" />
                    <span>White and emerald-green color palette designed for legal metrology.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0 mt-0.5" />
                    <span>Full responsive optimization across desktop, tablet, and mobile.</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    to="/signup"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-bold transition-all shadow-md shadow-[#15803D]/20"
                  >
                    <span>Request Inspector Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#101713] border-t border-[#E5EDE6] dark:border-[#29382D] py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Col 1: Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#15803D] dark:bg-[#22C55E] flex items-center justify-center text-white dark:text-[#101713]">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="font-extrabold text-base tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                  PCCIS
                </span>
              </div>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Packaged Commodity Compliance Inspection System. AI-assisted packaged goods declaration extraction and legal metrology verification.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#F0FDF4] mb-3">
                Navigation
              </h4>
              <ul className="space-y-2 text-xs text-[#647067] dark:text-[#A3B3A6]">
                <li>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('about')} className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    About PCCIS
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Portal Access */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#F0FDF4] mb-3">
                Inspector Portal
              </h4>
              <ul className="space-y-2 text-xs text-[#647067] dark:text-[#A3B3A6]">
                <li>
                  <Link to="/login" className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    Officer Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    Overview Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/new-inspection" className="hover:text-[#15803D] dark:hover:text-[#4ADE80]">
                    New Package Inspection
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Statutory Legal Notice */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#F0FDF4] mb-3">
                Statutory Standards
              </h4>
              <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                Standardized under the Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules, 2011. Assists statutory enforcement officers in label auditing.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E5EDE6] dark:border-[#29382D] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            <p>© 2026 PCCIS — Packaged Commodity Compliance Inspection System. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[#15803D] dark:text-[#4ADE80]">Version 1.2.0 (Emerald)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
