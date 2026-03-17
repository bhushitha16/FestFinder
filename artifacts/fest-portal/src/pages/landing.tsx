import { Link } from "wouter";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { GraduationCap, Building2, ChevronRight, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Luxurious dark gold background" 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md mb-8"
          >
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-widest">The Premier College Fest Network</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight max-w-4xl"
          >
            Elevate Your <br/>
            <span className="gold-gradient-text italic font-medium">College Experience</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-16"
          >
            Discover, register, and manage the most exclusive cultural and technical festivals across premier institutions.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl"
          >
            {/* Student Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />
              <div className="relative h-full bg-card/60 backdrop-blur-xl border border-white/10 hover:border-primary/50 transition-all duration-300 p-8 rounded-2xl flex flex-col items-start text-left">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-2 text-white group-hover:text-primary transition-colors">For Students</h3>
                <p className="text-muted-foreground text-sm mb-8 flex-1">
                  Discover events, register instantly, and track your participation across all participating colleges.
                </p>
                <div className="flex gap-4 w-full">
                  <Link href="/student/login" className="flex-1 inline-flex justify-center items-center px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]">
                    Login
                  </Link>
                  <Link href="/student/signup" className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-white/20 text-white font-medium rounded-lg hover:bg-white/5 transition-all">
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>

            {/* Admin Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-l from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />
              <div className="relative h-full bg-card/60 backdrop-blur-xl border border-white/10 hover:border-primary/50 transition-all duration-300 p-8 rounded-2xl flex flex-col items-start text-left">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-2 text-white">For Colleges</h3>
                <p className="text-muted-foreground text-sm mb-8 flex-1">
                  Host your festivals, manage events, and seamlessly handle thousands of student registrations.
                </p>
                <div className="flex gap-4 w-full">
                  <Link href="/admin/login" className="flex-1 inline-flex justify-center items-center px-4 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-all">
                    Admin Portal
                  </Link>
                  <Link href="/admin/signup" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors py-3">
                    Register College <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
