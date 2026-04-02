"use client";

import { AlertCircle, Clock, FileWarning, SearchX, ArrowRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

const solutionCard: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, delay: 0.4, ease: ROAR_EASE },
  },
};

const painPoints = [
  {
    icon: SearchX,
    stat: "4.2m",
    label: "Avg Intake Waste",
    description:
      "Spent purely on manual context extraction and reading unstructured complaints.",
  },
  {
    icon: FileWarning,
    stat: "3+",
    label: "System Contexts",
    description:
      "Required cross-referencing between OMS, logistics networks, and payment gateways.",
  },
  {
    icon: AlertCircle,
    stat: "18%",
    label: "SLA Violations",
    description:
      "Inconsistent outcomes caused by agent fatigue and unverified policy misinterpretations.",
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="bg-bg-base py-28 lg:py-36">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-20"
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
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted">
              The Status Quo
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold text-text-primary mb-6 leading-[1.1] tracking-[-0.02em]">
            Customer service isn&apos;t broken.
            <br />
            <span className="text-text-muted">Your infrastructure is.</span>
          </h2>
          <p className="text-[18px] lg:text-[20px] text-text-secondary leading-[1.65]">
            Investigating a standard retail dispute shouldn&apos;t require
            opening four different systems. Agents are forced to act like API
            middlewares instead of problem solvers.
          </p>
        </motion.div>

        {/* Cards: 3 problems + 1 solution */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          {/* Problem Cards 1-3 */}
          {painPoints.map((point, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="rounded-2xl bg-bg-base p-7 lg:p-8 border border-border-default/60 group hover:border-border-strong transition-colors duration-200"
            >
              <div className="mb-5 h-10 w-10 rounded-xl bg-bg-sunken border border-border-default flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors duration-200">
                <point.icon size={20} strokeWidth={1.8} />
              </div>
              <h4 className="text-[clamp(2rem,3.5vw,2.5rem)] font-extrabold text-text-primary mb-1 tracking-[-0.02em] leading-none">
                {point.stat}
              </h4>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3">
                {point.label}
              </div>
              <p className="text-[14px] text-text-muted leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}

          {/* Solution Card — visually differentiated */}
          <motion.div
            variants={solutionCard}
            className="rounded-2xl bg-primary/[0.04] p-7 lg:p-8 border border-primary/20 group hover:border-primary/40 transition-all duration-200 relative overflow-hidden"
          >
            {/* Subtle brand accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-r-full" />

            <div className="mb-5 h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Clock size={20} strokeWidth={1.8} />
            </div>
            <h4 className="text-[clamp(2rem,3.5vw,2.5rem)] font-extrabold text-primary mb-1 tracking-[-0.02em] leading-none">
              &lt;60s
            </h4>
            <div className="text-[11px] font-bold text-primary/70 uppercase tracking-[0.12em] mb-3">
              With ROAR Engine
            </div>
            <p className="text-[14px] text-text-secondary leading-relaxed mb-5">
              What takes a human 6 minutes, ROAR&apos;s deterministic agent
              pipeline completes instantly.
            </p>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary group-hover:gap-2.5 transition-all duration-200">
              See the pipeline
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
