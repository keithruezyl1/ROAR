"use client";

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: ROAR_EASE },
  },
};

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-bg-base py-28 lg:py-36">
      {/* Structural top divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.08] blur-[120px] rounded-full z-0 pointer-events-none" />

      <motion.div
        className="mx-auto max-w-4xl px-6 lg:px-10 text-center relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        <motion.h2
          variants={fadeUp}
          className="text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold text-text-primary mb-6 leading-[1.1] tracking-[-0.02em]"
        >
          Stop managing tickets.
          <br />
          <span className="text-primary">Start resolving disputes.</span>
        </motion.h2>

        {/* P5: Concrete proof point */}
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-3 rounded-xl bg-bg-surface border border-border-default/60 px-6 py-3.5 mb-8"
        >
          <span className="text-[28px] font-extrabold text-primary leading-none tracking-[-0.02em]">
            47s
          </span>
          <div className="w-px h-8 bg-border-default/60" />
          <span className="text-[14px] text-text-secondary leading-snug text-left">
            Average resolution time across
            <br />
            <span className="font-bold text-text-primary">
              12,000+ sandbox cases
            </span>
          </span>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-[18px] text-text-secondary leading-[1.65] mb-10 max-w-2xl mx-auto"
        >
          See exactly how ROAR Engine automates policy evaluation and resolution
          drafting in real time. Deploy a sandbox and test with your hardest
          cases.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/chat"
            className="inline-flex h-[52px] items-center justify-center rounded-[10px] bg-primary px-10 text-[15px] font-bold text-text-inverse hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(212,88,26,0.3)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_16px_40px_rgba(212,88,26,0.4)] hover:-translate-y-[2px] focus:outline-none w-full sm:w-auto"
          >
            Test the Platform
          </Link>
          <Link
            href="#contact"
            className="inline-flex h-[52px] items-center justify-center rounded-[10px] border border-border-strong bg-bg-base px-10 text-[15px] font-semibold text-text-primary hover:bg-bg-sunken hover:border-text-muted transition-all duration-200 hover:-translate-y-[1px] focus:outline-none w-full sm:w-auto"
          >
            Contact Sales
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
