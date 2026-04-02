"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'Platform', href: '#features' },
  { label: 'Security', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg-base/80 backdrop-blur-2xl border-b border-border-default/60 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-6 lg:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none group">
            <div className="relative">
              <Image
                src="/images/ROAR_Logo.png"
                alt="ROAR Logo"
                width={36}
                height={36}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-extrabold tracking-tight text-text-primary leading-tight">
                ROAR Engine
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted leading-none hidden sm:block">
                Enterprise Resolution
              </span>
            </div>
          </Link>

          {/* Desktop Navigation — center-aligned */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors duration-200 rounded-lg hover:bg-bg-sunken/60 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary rounded-full transition-all duration-300 group-hover:w-5" />
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:inline-flex items-center h-9 px-4 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors duration-200 rounded-lg hover:bg-bg-sunken/60"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center h-10 gap-1.5 px-5 text-[13px] font-bold text-text-inverse bg-primary rounded-lg hover:bg-primary-hover active:bg-primary-active transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(212,88,26,0.25)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(212,88,26,0.35)] hover:-translate-y-[1px] active:translate-y-0"
            >
              Start Dispute
              <ChevronRight size={14} strokeWidth={2.5} />
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:bg-bg-sunken/60 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[72px] z-40 bg-bg-base/95 backdrop-blur-2xl border-b border-border-default/50 shadow-xl lg:hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold text-text-secondary hover:text-text-primary rounded-xl hover:bg-bg-sunken/60 transition-colors"
                >
                  {link.label}
                  <ChevronRight size={16} className="text-text-muted" />
                </Link>
              ))}
              <div className="border-t border-border-default/50 mt-2 pt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center h-12 text-[15px] font-semibold text-text-secondary rounded-xl border border-border-strong hover:bg-bg-sunken transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/chat"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center h-12 text-[15px] font-bold text-text-inverse bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-[0_4px_12px_rgba(212,88,26,0.25)]"
                >
                  Start Dispute
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
