import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useStudentLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { GraduationCap, Mail, ArrowRight, RefreshCw, Edit2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PhoneEmailButton } from "@/components/phone-email-button";
import { useState } from "react";
import { customFetch } from "@/lib/api-client-wrapper"; // I'll create this wrapper

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function StudentLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/student/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (response.ok) {
        toast({ title: "OTP Sent", description: data.message });
        setStep("otp");
      } else {
        toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/student/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/student/dashboard");
      } else {
        toast({ title: "Error", description: data.error || "Invalid OTP", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md p-8 glass-panel border-t-primary/30">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Student Portal</h1>
            <p className="text-muted-foreground text-sm">Sign in to access your dashboard</p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2 group" size="lg" isLoading={isLoading}>
                Send OTP
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="space-y-2 text-center mb-4">
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  Sending OTP to <strong>{email}</strong>
                  <button type="button" onClick={() => setStep("email")} className="text-primary hover:text-primary/80">
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Enter 6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  className="flex h-12 w-full text-center text-xl tracking-[1em] font-mono rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
                Verify & Login
              </Button>

              <div className="text-center">
                <button 
                  type="button" 
                  onClick={handleSendOTP} 
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <PhoneEmailButton />

          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            New here?{" "}
            <Link href="/student/signup" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
