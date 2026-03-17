import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogOut, User, Menu, X } from "lucide-react";

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
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.includes("dashboard") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-primary/20">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="font-semibold">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
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
              <div className="flex items-center gap-4">
                <Link href="/student/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                  Student Portal
                </Link>
                <Link href="/admin/login" className="text-sm font-medium px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300">
                  College Admin
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-card border-b border-white/5 px-4 pt-2 pb-6 space-y-4"
        >
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
              </div>
              <Link href={getDashboardLink()} className="block px-4 py-2 text-sm text-foreground hover:text-primary">Dashboard</Link>
              <button 
                onClick={() => logout()}
                className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/student/login" className="px-4 py-3 text-sm font-medium bg-secondary rounded-md text-center">Student Login</Link>
              <Link href="/admin/login" className="px-4 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-md text-center">College Admin Login</Link>
            </div>
          )}
        </motion.div>
      )}
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
      <footer className="border-t border-white/5 py-8 mt-auto z-10 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Lumina Fests. Elevating College Experiences.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/superadmin/login" className="text-xs opacity-50 hover:opacity-100 transition-opacity hover:text-primary">Platform Administration</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
