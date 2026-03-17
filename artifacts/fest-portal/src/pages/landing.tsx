import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { GraduationCap, Building2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Luxury abstract background" 
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 w-full relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-widest uppercase mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> The Premier Fest Network
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Elevate Your <br />
              <span className="gold-gradient-text">College Experience</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Discover, register, and manage the most exclusive cultural and technical festivals across premier institutions.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card hover className="h-full bg-card/40 backdrop-blur-xl border-white/10 group cursor-default">
                <div className="p-8 flex flex-col h-full items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 group-hover:border-primary/30">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-semibold mb-3">For Students</h2>
                  <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                    Explore top-tier events, secure your spot, and curate your personal festival calendar with ease.
                  </p>
                  <div className="mt-auto flex flex-col w-full gap-3">
                    <Link href="/student/signup" className="w-full block bg-primary text-primary-foreground py-3.5 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
                      Create Account
                    </Link>
                    <Link href="/student/login" className="w-full block bg-secondary text-foreground py-3.5 rounded-lg font-medium hover:bg-white/5 transition-all flex items-center justify-center gap-2 group/link">
                      Sign In <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card hover className="h-full bg-card/40 backdrop-blur-xl border-white/10 group cursor-default">
                <div className="p-8 flex flex-col h-full items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 group-hover:border-primary/30">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-semibold mb-3">For Colleges</h2>
                  <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                    Manage your institution's premier events, oversee registrations, and showcase your cultural legacy.
                  </p>
                  <div className="mt-auto flex flex-col w-full gap-3">
                    <Link href="/admin/signup" className="w-full block bg-white/5 border border-white/10 text-foreground py-3.5 rounded-lg font-semibold hover:bg-white/10 transition-all">
                      Apply as Admin
                    </Link>
                    <Link href="/admin/login" className="w-full block bg-transparent text-primary py-3.5 rounded-lg font-medium hover:bg-primary/10 transition-all flex items-center justify-center gap-2 group/link border border-transparent hover:border-primary/20">
                      Admin Sign In <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
