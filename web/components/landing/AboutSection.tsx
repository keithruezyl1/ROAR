"use client";

import { Shield, Lock, Server, FileCheck } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const slideIn: Variants = {
  hidden: { opacity: 0, x: -40, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: ROAR_EASE },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: ROAR_EASE },
  },
};

const trustLayers = [
  {
    icon: Shield,
    title: 'Deterministic Sandbox',
    description:
      'Agents operate strictly within a confined policy space. They cannot hallucinate refunds or bend SOPs. Every decision traces to a source document.',
  },
  {
    icon: FileCheck,
    title: 'Auditable Logic Trails',
    description:
      'Every token evaluation is logged. Escalated disputes show the exact policy vector that triggered the hold state.',
  },
  {
    icon: Server,
    title: 'Stateless Architecture',
    description:
      'Customer PII and financial tokens are never stored in models. Data is ingested, evaluated, drafted, and purged from active memory.',
  },
  {
    icon: Lock,
    title: 'SOC2 & GDPR Ready',
    description:
      'Infrastructure designed to clear rigorous retail procurement boards. Your legal team stays comfortable while you deploy next-gen efficiency.',
  },
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="bg-bg-base py-28 lg:py-36 relative overflow-hidden"
    >
      {/* Subtle structural divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[0.4fr_0.6fr] gap-16 lg:gap-24 items-start">
          {/* Right text — appears first on mobile, sticky on desktop */}
          <motion.div
            className="lg:sticky lg:top-32 order-1 lg:order-none"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted">
                The Trust Stack
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold text-text-primary mb-6 leading-[1.1] tracking-[-0.02em]">
              Built for compliance.
              <br />
              <span className="text-primary">Governed by humans.</span>
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.65] max-w-[440px]">
              Enterprise customer care isn&apos;t about letting AI run wild.
              It&apos;s about deterministic policy execution mapped directly to
              your internal compliance standards.
            </p>
          </motion.div>

          {/* Left — Trust Stack layers */}
          <motion.div
            className="space-y-4 order-2 lg:order-none"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15, delayChildren: 0.1 },
              },
            }}
          >
            {trustLayers.map((layer, i) => (
              <motion.div
                key={i}
                variants={slideIn}
                className="relative rounded-2xl bg-bg-surface p-6 lg:p-7 border border-border-default/60 group hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {/* Left accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-200 rounded-r-full" />

                <div className="flex items-start gap-5 pl-3">
                  <div className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-bg-base border border-border-default text-primary group-hover:bg-primary/10 transition-colors duration-200">
                    <layer.icon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-[17px] font-bold text-text-primary leading-tight">
                        {layer.title}
                      </h4>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] hidden sm:block">
                        Layer {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-[14px] text-text-secondary leading-relaxed">
                      {layer.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
