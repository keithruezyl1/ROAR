"use client";

import {
  Bot,
  Network,
  Layers,
  FileCheck,
  BookText,
  ClipboardList,
} from 'lucide-react';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: ROAR_EASE },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="bg-bg-alt py-28 lg:py-36 relative">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          className="text-center mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
            visible: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: { duration: 0.7, ease: ROAR_EASE },
            },
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted">
              The Pipeline
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold text-text-primary mb-6 leading-[1.1] tracking-[-0.02em]">
            A Deterministic AI Pipeline.
          </h2>
          <p className="mx-auto max-w-2xl text-[18px] text-text-secondary leading-[1.65]">
            Not a probabilistic chatbot. Six highly specialized agents
            engineered for operational safety and mathematical precision.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-auto md:auto-rows-[280px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Agent 1: Conversational Intake (Large Bento) */}
          <motion.div
            variants={fadeUp}
            className="md:col-span-2 rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col justify-between overflow-hidden relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="relative z-10 md:w-2/3">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                  <Bot size={20} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono">
                  Agent 01
                </span>
              </div>
              <h3 className="text-[20px] font-bold text-text-primary mb-3 leading-tight">
                Conversational Intake
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                Mathematically calculates follow-up questions to extract dispute
                intent instantly, mapping to specific policy variables.
              </p>
            </div>
            {/* Background image */}
            <div className="absolute right-0 md:right-[-10%] top-0 md:top-[-10%] w-full md:w-[60%] h-full md:h-[120%] opacity-30 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-bg-surface to-transparent z-10 pointer-events-none md:block hidden" />
              <Image
                src="/images/abstract_data_pipeline.png"
                alt="Data Pipeline"
                fill
                className="object-cover md:object-left"
              />
            </div>
          </motion.div>

          {/* Agent 2: Data Retrieval */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                <Network size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono">
                Agent 02
              </span>
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-3 leading-tight">
              Data Retrieval
            </h3>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              Synthesizes real-time metrics from your OMS, Payment gateway, and
              Logistics instantly. No manual lookups.
            </p>
            {/* Styled chips instead of plain text */}
            <div className="mt-auto pt-5">
              <div className="flex gap-2">
                <span className="inline-flex items-center bg-bg-sunken border border-border-default rounded-md px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wide">
                  OMS
                </span>
                <span className="inline-flex items-center bg-bg-sunken border border-border-default rounded-md px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wide">
                  PAY
                </span>
                <span className="inline-flex items-center bg-bg-sunken border border-border-default rounded-md px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wide">
                  LOG
                </span>
              </div>
            </div>
          </motion.div>

          {/* Agent 3: Triage */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                <Layers size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono">
                Agent 03
              </span>
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-3 leading-tight">
              Triage Agent
            </h3>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              Evaluates policies based on hard-coded deterministic logic. 100%
              auditable constraints — no LLM arithmetic.
            </p>
          </motion.div>

          {/* Agent 4: Supervised Resolution (Large Bento) */}
          <motion.div
            variants={fadeUp}
            className="md:col-span-2 rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col md:flex-row md:items-center overflow-hidden relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="flex-1 md:pr-8 relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-text-inverse shadow-[0_4px_14px_rgba(212,88,26,0.3)]">
                  <FileCheck size={20} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.15em] font-mono">
                  Agent 04
                </span>
              </div>
              <h3 className="text-[20px] font-bold text-text-primary mb-3 leading-tight">
                Supervised Resolution
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed border-l-2 border-primary pl-4">
                Agents draft a definitive resolution plan, but never execute
                financial transactions without strict human approval in the
                loop.
              </p>
            </div>
            {/* Approval micro-UI */}
            <div className="flex-1 h-full hidden md:flex items-center justify-end relative z-0 mt-8 md:mt-0">
              <div className="w-full max-w-[260px] rounded-xl border border-border-default bg-bg-base p-5 shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.12)] md:translate-x-4 group-hover:translate-x-0 transition-transform duration-500">
                <div className="text-[11px] font-mono text-text-muted mb-3 flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  Plan Drafted
                </div>
                <div className="space-y-1.5">
                  <motion.div
                    className="h-2.5 bg-bg-sunken rounded w-full"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: ROAR_EASE }}
                  />
                  <motion.div
                    className="h-2.5 bg-bg-sunken rounded w-full"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: ROAR_EASE }}
                  />
                  <motion.div
                    className="h-2.5 bg-bg-sunken rounded w-3/4"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.5, ease: ROAR_EASE }}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-5 overflow-hidden">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, ease: ROAR_EASE }}
                    className="px-3.5 py-1.5 rounded-btn bg-bg-sunken text-[11px] font-bold text-text-secondary cursor-pointer hover:bg-bg-base transition-colors"
                  >
                    Reject
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, ease: ROAR_EASE }}
                    className="px-3.5 py-1.5 rounded-btn bg-primary text-[11px] font-bold text-text-inverse shadow-sm cursor-pointer hover:bg-primary-hover transition-colors"
                  >
                    Approve
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Agent 5: Summarization (NEW) */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                <BookText size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono">
                Agent 05
              </span>
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-3 leading-tight">
              Summarization Agent
            </h3>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              Writes structured case briefs for escalation agents who need full
              context without reconstructing the situation from scratch.
            </p>
          </motion.div>

          {/* Agent 6: Case Report (NEW) */}
          <motion.div
            variants={fadeUp}
            className="md:col-span-2 rounded-2xl bg-bg-surface p-7 lg:p-8 border border-border-default/60 flex flex-col relative group hover:border-primary/30 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                <ClipboardList size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono">
                Agent 06
              </span>
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-3 leading-tight">
              Case Report Agent
            </h3>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-xl">
              Compiles a complete audit record on every conversation close —
              intent classification, data sources, policies applied, triage
              decisions, approval outcomes, and resolution actions. No manual
              documentation. Zero audit gaps.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
