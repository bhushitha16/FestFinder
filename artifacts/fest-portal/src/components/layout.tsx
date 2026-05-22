import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Menu, X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "student": return "/student/dashboard";
      case "college_admin": return "/admin/dashboard";
      case "super_admin": return "/superadmin/dashboard";
      default: return "/";
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo.png`} 
              alt="Lumina Fests" 
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-display font-bold text-xl tracking-widest gold-gradient-text">
              LUMINA FESTS
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link 
                  href={getDashboardLink()}
                  className={cn("text-sm font-medium transition-colors hover:text-primary", location.includes("dashboard") ? "text-primary" : "text-muted-foreground")}
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <div className="flex items-center gap-3 text-sm text-foreground bg-secondary/50 py-1.5 px-3 rounded-full border border-white/5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      {user?.role === 'super_admin' ? <Crown className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex flex-col leading-none mr-1">
                      <span className="font-semibold text-xs">{user?.name}</span>
                      <span className="text-[9px] text-primary/80 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => logout()}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link href="/student/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                  Student Portal
                </Link>
                <Link href="/admin/login" className="text-sm font-medium px-5 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300">
                  College Admin
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground p-2 hover:bg-white/5 rounded-md"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-card border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.name}</span>
                      <span className="text-xs text-primary/80 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <Link href={getDashboardLink()} className="block px-4 py-3 text-sm font-medium bg-white/5 rounded-lg text-foreground hover:text-primary">Dashboard</Link>
                  <button 
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link href="/student/login" className="px-4 py-3 text-sm font-medium bg-secondary border border-white/10 rounded-lg text-center hover:bg-white/5 transition-colors">Student Login</Link>
                  <Link href="/admin/login" className="px-4 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg text-center shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]">College Admin Login</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>
      <footer className="border-t border-white/5 py-12 mt-auto z-10 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link href="/">
            <div className="flex items-center justify-center gap-2 mb-6 opacity-50 hover:opacity-100 transition-opacity">
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-6 h-6 grayscale brightness-200" />
              <span className="font-display font-bold tracking-widest text-white">LUMINA</span>
            </div>
          </Link>
          <p className="text-sm text-muted-foreground/80">© {new Date().getFullYear()} Lumina Fests. The Premier Network for College Experiences.</p>
          <div className="mt-8 flex justify-center">
            <Link href="/superadmin/login" className="text-xs text-muted-foreground/30 hover:text-primary transition-colors uppercase tracking-widest">Platform Administration</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
