"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

/* ─── Standardized Animation Physics ─── */

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const ROAR_SPRING: [number, number, number, number] = [0.16, 1, 0.3, 1];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: ROAR_EASE },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: ROAR_SPRING, delay: 0.25 },
  },
};

/* ─── Trust Metrics ─── */

const trustMetrics = [
  { icon: Zap, value: '<60s', label: 'Avg Resolution' },
  { icon: Shield, value: '100%', label: 'Auditable' },
  { icon: CheckCircle2, value: '99.9%', label: 'Uptime SLA' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-72px)] flex items-center overflow-x-clip bg-bg-base">
      {/* ── Z-0: Multi-Layer Background System ── */}

      {/* Layer 1: Mesh background image — low opacity, full bleed */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/images/hero_bg_mesh.png"
          alt=""
          fill
          className="object-cover opacity-[0.35]"
          priority
          sizes="100vw"
          aria-hidden="true"
        />
      </div>

      {/* Layer 2: Radial gradient overlays for warmth and depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 75% 40%, rgba(212,88,26,0.07) 0%, transparent 65%), radial-gradient(ellipse 90% 70% at 20% 80%, rgba(212,88,26,0.04) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 50% 0%, rgba(255,255,255,0.8) 0%, transparent 50%)',
        }}
      />

      {/* Layer 3: Soft vignette to contain the eye */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(244,245,247,0.7) 100%)',
        }}
      />

      {/* Layer 4: Fine dot grid — mathematical precision feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #111 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Structural bottom divider */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-default/80 to-transparent" />

      {/* ── Z-10: Content ── */}
      <div className="mx-auto max-w-[1400px] w-full px-6 lg:px-10 pt-32 pb-16 lg:pt-12 lg:pb-20 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 xl:gap-20 items-center">
          {/* ── Left Column: Messaging ── */}
          <motion.div
            className="flex flex-col items-start"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-2.5 mb-7"
            >
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
                <div className="absolute inset-0 rounded-full bg-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Enterprise Resolution Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold text-text-primary tracking-[-0.035em] leading-[1.05] mb-7"
            >
              Resolve customer
              <br />
              disputes in{' '}
              <span className="relative inline-block text-primary">
                60 seconds
                <svg
                  className="absolute -bottom-1.5 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M1 5.5C30 2 70 1 100 3.5C130 6 170 4 199 2"
                    stroke="#D4581A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 1.2,
                      delay: 0.7,
                      ease: 'easeInOut',
                    }}
                  />
                </svg>
              </span>
              <span className="text-text-primary">.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              className="text-[17px] lg:text-[19px] text-text-secondary leading-[1.7] mb-10 max-w-[520px]"
            >
              ROAR Engine uses deterministic AI agents to intake, evaluate, and
              draft resolution plans — bridging your OMS, payments, and
              logistics in a single, auditable pipeline.
            </motion.p>

            {/* CTA Group */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-10"
            >
              <Link
                href="#contact"
                className="group inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[10px] bg-primary px-7 text-[15px] font-bold text-text-inverse hover:bg-primary-hover active:bg-primary-active transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_24px_rgba(212,88,26,0.3)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.12),0_16px_40px_rgba(212,88,26,0.4)] hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.98]"
              >
                Book Enterprise Demo
                <ArrowRight
                  size={16}
                  strokeWidth={2.5}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/chat"
                className="group inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[10px] border border-border-strong bg-bg-base/80 backdrop-blur-sm px-7 text-[15px] font-semibold text-text-primary hover:bg-bg-sunken hover:border-text-muted transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
              >
                <Play
                  size={14}
                  strokeWidth={2.5}
                  className="text-primary"
                />
                Try Sandbox
              </Link>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-5 lg:gap-7"
            >
              {trustMetrics.map((metric, i) => (
                <div key={i} className="flex items-center gap-2.5 group">
                  <div className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-bg-surface/80 backdrop-blur-sm border border-border-default/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] group-hover:border-primary/30 transition-colors duration-200">
                    <metric.icon
                      size={15}
                      className="text-primary"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-extrabold text-text-primary leading-none tracking-[-0.01em]">
                      {metric.value}
                    </span>
                    <span className="text-[10px] font-semibold text-text-muted leading-none mt-1 uppercase tracking-[0.05em]">
                      {metric.label}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Right Column: Product Visual ── */}
          <motion.div
            className="relative w-full"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            {/* Glow halo behind the frame */}
            <div className="absolute -inset-6 lg:-inset-10 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-primary/[0.05] rounded-[40px] blur-3xl" />
            </div>

            {/* Browser Chrome Frame */}
            <div className="relative rounded-2xl overflow-hidden border border-border-default/70 bg-[#1A1A1A] shadow-[0_4px_8px_rgba(0,0,0,0.06),0_24px_64px_-12px_rgba(0,0,0,0.18)] transition-all duration-700 hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),0_32px_80px_-12px_rgba(212,88,26,0.14)] hover:-translate-y-1">
              {/* macOS Chrome Bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#252525] border-b border-[#333]">
                <div className="flex items-center gap-[6px]">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#27CA40]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-md border border-[#333] px-4 py-1 max-w-[280px] w-full">
                    <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#D4581A]/50" />
                    <span className="text-[11px] font-medium text-[#888] truncate font-mono">
                      app.roarengine.com/dashboard
                    </span>
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              {/* Dashboard Screenshot */}
              <div className="relative aspect-[16/10]">
                <Image
                  src="/images/roar_dashboard_dark.png"
                  alt="ROAR Engine – Dispute Resolution Dashboard showing Case #4821 resolved in 42s with 6-agent pipeline"
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              </div>
            </div>

            {/* Floating Card: Case Resolved */}
            <motion.div
              className="absolute -bottom-5 left-2 lg:-left-3 bg-white rounded-xl border border-border-default shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_48px_-8px_rgba(0,0,0,0.16)] px-4 py-3.5 flex items-center gap-3.5 z-20"
              initial={{ opacity: 0, x: -24, y: 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.65, delay: 1.1, ease: ROAR_SPRING }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-[#E8F5E9]">
                <CheckCircle2 size={20} className="text-[#2E7D32]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#111] leading-tight">
                  Case #4821 Resolved
                </span>
                <span className="text-[11px] font-semibold text-[#666] leading-tight mt-1 font-mono">
                  Refund $42.50 · 47s total
                </span>
              </div>
            </motion.div>

            {/* Floating Card: Agents Active */}
            <motion.div
              className="absolute -top-4 right-2 lg:-right-3 bg-white rounded-xl border border-border-default shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_48px_-8px_rgba(0,0,0,0.16)] px-4 py-3.5 flex items-center gap-3.5 z-20"
              initial={{ opacity: 0, x: 24, y: -12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.65, delay: 1.4, ease: ROAR_SPRING }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-primary/10">
                <Zap size={20} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#111] leading-tight">
                  6 Agents Active
                </span>
                <span className="text-[11px] font-semibold text-[#666] leading-tight mt-1 font-mono">
                  Pipeline: healthy
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
