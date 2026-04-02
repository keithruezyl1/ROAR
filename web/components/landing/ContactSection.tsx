"use client";

import { Mail, Phone, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function ContactSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', message: '' };

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Work email is required';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide details';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    if (errors[e.target.id as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    }
  };

  return (
    <section id="contact" className="bg-bg-base py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold text-text-primary mb-8 leading-[1.1] tracking-[-0.02em]">Ready to deploy?</h2>
            <p className="text-xl text-text-secondary leading-relaxed mb-12">
              Interested in seeing how ROAR Engine can process your specific dispute volume? Reach out to our technical sales team for a custom integration plan.
            </p>
            <div className="space-y-8 text-text-secondary">
              <div className="flex items-center gap-6 group cursor-pointer">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-bg-base border border-border-strong group-hover:border-primary group-hover:text-primary transition-colors duration-normal shadow-sm">
                  <Mail size={24} />
                </div>
                <span className="text-lg font-medium group-hover:text-text-primary transition-colors duration-normal">enterprise@roarengine.com</span>
              </div>
              <div className="flex items-center gap-6 group cursor-pointer">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-bg-base border border-border-strong group-hover:border-primary group-hover:text-primary transition-colors duration-normal shadow-sm">
                  <Phone size={24} />
                </div>
                <span className="text-lg font-medium group-hover:text-text-primary transition-colors duration-normal">+66 2 123 4567</span>
              </div>
              <div className="flex items-center gap-6 group cursor-pointer">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-bg-base border border-border-strong group-hover:border-primary group-hover:text-primary transition-colors duration-normal shadow-sm">
                  <MapPin size={24} />
                </div>
                <span className="text-lg font-medium group-hover:text-text-primary transition-colors duration-normal">Bangkok, Thailand</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-[24px] border border-border-default bg-bg-base p-10 shadow-lg relative overflow-hidden">
            <div className="absolute -top-px -left-px w-32 h-px bg-gradient-to-r from-transparent to-primary"></div>
            <div className="absolute -left-px -top-px h-32 w-px bg-gradient-to-b from-transparent to-primary"></div>
            
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in zoom-in duration-slow">
                <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center text-success mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-3">Request Received.</h3>
                <p className="text-text-secondary mb-8 max-w-sm">An integration architect will map out your data ingestion requirements shortly.</p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-primary font-bold hover:text-primary-hover transition-colors"
                >
                  Submit another request →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wide">Full Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full h-14 px-4 rounded-input border bg-bg-sunken text-lg text-text-primary focus:bg-bg-elevated outline-none transition-colors duration-normal placeholder-text-muted ${errors.name ? 'border-danger focus:border-danger' : 'border-border-strong focus:border-primary'}`} 
                    placeholder="Jane Doe" 
                  />
                  {errors.name && <p className="mt-2 text-sm text-danger font-medium">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wide">Work Email</label>
                  <input 
                    type="text" 
                    id="email" 
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full h-14 px-4 rounded-input border bg-bg-sunken text-lg text-text-primary focus:bg-bg-elevated outline-none transition-colors duration-normal placeholder-text-muted ${errors.email ? 'border-danger focus:border-danger' : 'border-border-strong focus:border-primary'}`} 
                    placeholder="jane@retailenterprise.com" 
                  />
                  {errors.email && <p className="mt-2 text-sm text-danger font-medium">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wide">How can we help?</label>
                  <textarea 
                    id="message" 
                    rows={4} 
                    value={formData.message}
                    onChange={handleChange}
                    className={`w-full p-4 rounded-input border bg-bg-sunken text-lg text-text-primary focus:bg-bg-elevated outline-none transition-colors duration-normal placeholder-text-muted resize-none ${errors.message ? 'border-danger focus:border-danger' : 'border-border-strong focus:border-primary'}`} 
                    placeholder="Tell us about your current dispute volume..." 
                  />
                  {errors.message && <p className="mt-2 text-sm text-danger font-medium">{errors.message}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-btn bg-primary px-8 text-lg font-bold text-text-inverse hover:bg-primary-hover active:scale-[0.98] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(212,88,26,0.25)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(212,88,26,0.35)] focus:outline-none w-full disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing Vector Space...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
