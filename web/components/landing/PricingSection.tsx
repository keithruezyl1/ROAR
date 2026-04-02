"use client";

import { Check } from 'lucide-react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { useState } from 'react';

const ROAR_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: ROAR_EASE },
  },
};

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');

  return (
    <section id="pricing" className="bg-bg-alt py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
            visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ROAR_EASE } }
          }}
        >
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold text-text-primary mb-6 leading-[1.1] tracking-[-0.02em]">Scale without headcount.</h2>
          <p className="mx-auto max-w-2xl text-xl text-text-secondary mb-10">
            Enterprise-grade pricing model tied directly to successful resolutions. 
          </p>

          {/* Billing Toggle for Logic Demonstration */}
          <div className="inline-flex bg-bg-sunken p-1.5 rounded-full border border-border-strong mx-auto shadow-inner">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-normal ${billingCycle === 'monthly' ? 'bg-bg-surface text-text-primary shadow-sm border border-border-default' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('annually')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-normal flex items-center gap-2 ${billingCycle === 'annually' ? 'bg-bg-surface text-text-primary shadow-sm border border-border-default' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Annually <span className="inline-flex items-center justify-center bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-pill leading-none font-extrabold uppercase">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <motion.div 
          className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8 lg:gap-12 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {/* Core Tier */}
          <motion.div variants={fadeUpVariants} className="rounded-[24px] border border-border-default bg-bg-surface p-10 shadow-sm hover:shadow-xl transition-shadow duration-normal">
            <h3 className="text-2xl font-bold text-text-primary mb-2">Platform Core</h3>
            <p className="text-text-secondary mb-8 text-lg">Perfect for regional retailers automating standard tier-1 support logic.</p>
            <div className="mb-8 pb-8 border-b border-border-default">
              <span className="text-5xl font-extrabold text-text-primary">Contact Us</span>
            </div>
            <ul className="space-y-5 mb-10">
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-success/20 p-1 mt-0.5"><Check className="text-success" size={14} /></div>
                <span className="text-text-primary">Up to 10,000 resolved cases per month</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-success/20 p-1 mt-0.5"><Check className="text-success" size={14} /></div>
                <span className="text-text-primary">Standard OMS Integrations (Shopify, Magento)</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-success/20 p-1 mt-0.5"><Check className="text-success" size={14} /></div>
                <span className="text-text-primary">Full 6-Agent Evaluation Pipeline</span>
              </li>
            </ul>
            <Link href="/chat" className="flex h-14 items-center justify-center rounded-btn border-2 border-border-strong bg-transparent px-8 text-lg font-bold text-text-primary hover:bg-bg-sunken hover:border-text-secondary transition-all duration-normal focus:outline-none w-full">
              Deploy Sandbox Environment
            </Link>
          </motion.div>

          {/* Enterprise Tier */}
          <motion.div variants={fadeUpVariants} className="rounded-[24px] border border-primary bg-bg-elevated p-10 shadow-2xl relative transform md:-translate-y-4 hover:-translate-y-6 transition-transform duration-normal">
            <div className="absolute top-0 right-10 -translate-y-1/2">
              <span className="inline-flex rounded-pill bg-primary px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-text-inverse shadow-lg shadow-primary/40">Enterprise</span>
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">High Volume</h3>
            <p className="text-text-secondary mb-8 text-lg">For national retailers managing multi-brand ecosystems and extreme latency requirements.</p>
            <div className="mb-8 pb-8 border-b border-border-strong">
              <span className="text-5xl font-extrabold text-text-primary">Custom</span>
            </div>
            <ul className="space-y-5 mb-10">
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5"><Check className="text-primary" size={14} /></div>
                <span className="text-text-primary font-medium">Unlimited case volume throughput</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5"><Check className="text-primary" size={14} /></div>
                <span className="text-text-primary font-medium">Proprietary legacy system API proxying</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5"><Check className="text-primary" size={14} /></div>
                <span className="text-text-primary font-medium">Custom fine-tuned policy embeddings</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5"><Check className="text-primary" size={14} /></div>
                <span className="text-text-primary font-medium">Dedicated Slack channel & 24/7 SLA</span>
              </li>
            </ul>
            <Link href="#contact" className="flex h-14 items-center justify-center rounded-btn bg-primary px-8 text-lg font-bold text-text-inverse hover:bg-primary-hover active:bg-primary-active transition-all duration-normal shadow-primary/20 hover:shadow-[0_8px_20px_-6px_rgba(212,88,26,0.6)] focus:outline-none w-full">
              Speak to Sales Architects
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
