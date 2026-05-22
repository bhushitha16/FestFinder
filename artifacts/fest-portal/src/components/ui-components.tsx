import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive", size?: "sm" | "md" | "lg", isLoading?: boolean }
>(({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_20px_0px_hsl(var(--primary)/0.6)]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-primary/50 text-primary hover:bg-primary/10",
    ghost: "text-foreground hover:bg-white/5 hover:text-primary",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  };

  const sizes = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-14 px-8 text-base font-semibold"
  };

  return (
    <button 
      ref={ref} 
      disabled={isLoading || disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className = "", label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full bg-black/50 border border-white/10 rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all",
          error && "border-destructive focus:border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(({ className = "", label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-black/50 border border-white/10 rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px] resize-y",
          error && "border-destructive focus:border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: {value: string | number, label: string}[] }
>(({ className = "", label, error, options, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      <select
        ref={ref}
        className={cn(
          "w-full bg-black/50 border border-white/10 rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none",
          error && "border-destructive",
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)} className="bg-card text-foreground">{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";

export const Card = ({ children, className = "", hover = false, onClick }: { children: React.ReactNode, className?: string, hover?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-card/50 backdrop-blur-sm border border-white/5 rounded-xl p-6 shadow-xl",
      hover && "hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 cursor-pointer",
      className
    )}
  >
    {children}
  </div>
);

export const Badge = ({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "success" | "warning" | "destructive" | "outline" | "primary" }) => {
  const variants = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/20 text-primary border border-primary/30",
    success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
    destructive: "bg-destructive/10 text-destructive border border-destructive/20",
    outline: "border border-white/10 text-muted-foreground"
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Dialog = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-card border border-white/10 rounded-xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
              <h2 className="text-xl font-display font-semibold text-foreground">{title}</h2>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export function StarRating({ rating, onChange, readonly = false }: { rating: number, onChange?: (r: number) => void, readonly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => { e.preventDefault(); onChange?.(star); }}
          className={cn("transition-colors", readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110', star <= rating ? 'text-primary' : 'text-white/20 hover:text-primary/50')}
        >
          <svg className={cn("w-6 h-6", star <= rating ? 'fill-primary' : 'fill-transparent')} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}
