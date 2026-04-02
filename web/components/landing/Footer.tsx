import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  Product: [
    { label: 'Platform', href: '#features' },
    { label: 'Security', href: '#about' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Sandbox', href: '/chat' },
  ],
  Company: [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
  Legal: [
    { label: 'Policies', href: '/policies' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-bg-alt border-t border-border-default">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16 py-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <Image
                src="/images/ROAR_Logo.png"
                alt="ROAR Logo"
                width={28}
                height={28}
                className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="flex flex-col">
                <span className="text-[15px] font-extrabold tracking-tight text-text-primary leading-tight">
                  ROAR Engine
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-muted leading-none">
                  Enterprise Resolution
                </span>
              </div>
            </Link>
            <p className="text-[13px] text-text-muted leading-relaxed max-w-[240px]">
              Supervised agentic dispute resolution for retail enterprises.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-border-default/40">
          <span className="text-[12px] text-text-muted">
            &copy; {new Date().getFullYear()} ROAR Engine. Gosoft Retail
            Hackathon 2026.
          </span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted border border-border-default/60 rounded-md px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              SOC2 Ready
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted border border-border-default/60 rounded-md px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              GDPR Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
