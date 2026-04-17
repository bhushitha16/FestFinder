import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid admin email"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema)
  });

  const { register: registerOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErrors } } = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema)
  });

  const onEmailSubmit = async (data: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/admin/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const resData = await response.json();
      if (response.ok) {
        toast({ title: "OTP Sent", description: resData.message });
        setEmail(data.email);
        setStep("otp");
      } else {
        toast({ title: "Error", description: resData.error || "Failed to send OTP", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: data.otp }),
      });
      const resData = await response.json();
      
      // If 401 but indicates "pending Super Admin approval", we should tell them and maybe redirect or wait
      if (response.status === 401 && resData.error.includes("pending Super Admin approval")) {
         toast({ title: "Account Pending", description: resData.error });
         setLocation("/");
      }
      else if (response.ok) {
        toast({ title: "Welcome back!", description: resData.message });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/admin/dashboard");
      } else {
        toast({ title: "Login Failed", description: resData.error || "Invalid OTP", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md p-8 glass-panel border-t-primary/30">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Building2 className="w-6 h-6 text-foreground" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">College Admin</h1>
            <p className="text-muted-foreground text-sm">Manage your institution's events without a password</p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <Input 
                label="Admin Email" 
                type="email" 
                placeholder="admin@college.edu" 
                icon={<Mail className="w-4 h-4" />}
                {...registerEmail("email")} 
                error={emailErrors.email?.message} 
              />
              <Button type="submit" className="w-full mt-2 group" size="lg" variant="secondary" isLoading={isLoading}>
                Continue <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                 <p className="text-sm font-medium text-center">Enter the 6-digit code sent to</p>
                 <p className="text-primary font-bold text-center mt-1">{email}</p>
                 <button 
                  type="button" 
                  onClick={() => setStep("email")}
                  className="text-xs text-muted-foreground hover:text-white mx-auto block mt-2 underline"
                 >Change email</button>
              </div>

              <Input 
                autoFocus
                label="Security Code" 
                placeholder="123456" 
                maxLength={6}
                className="text-center letter-spacing-[0.5em] text-2xl font-display font-bold py-6"
                {...registerOtp("otp")} 
                error={otpErrors.otp?.message} 
              />
              
              <Button type="submit" className="w-full mt-4" size="lg" variant="secondary" isLoading={isLoading}>
                Verify & Login
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            New institution?{" "}
            <Link href="/admin/signup" className="text-primary hover:underline font-medium">
              Apply as Admin
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
