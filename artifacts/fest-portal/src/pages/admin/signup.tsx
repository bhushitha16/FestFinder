import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { useState } from "react";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  collegeName: z.string().min(3, "College name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  designation: z.string().optional(),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export default function AdminSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register: registerSignup, handleSubmit: handleSignupSubmit, formState: { errors: signupErrors } } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema)
  });

  const { register: registerOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErrors } } = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema)
  });

  const onSignupSubmit = async (data: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (response.ok) {
        toast({ title: "OTP Sent", description: resData.message });
        setEmail(data.email);
        setStep("otp");
      } else {
        toast({ title: "Registration failed", description: resData.error || "Failed", variant: "destructive" });
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
      
      if (response.status === 401 && resData.error.includes("pending Super Admin approval")) {
         toast({ title: "Application Submitted!", description: "Your email is verified. Your request is pending Super Admin approval." });
         setLocation("/admin/pending");
      } else if (response.ok) {
        toast({ title: "Application verified", description: "Your account is activated." });
        setLocation("/admin/dashboard");
      } else {
        toast({ title: "Verification Failed", description: resData.error || "Invalid OTP", variant: "destructive" });
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
        <Card className="w-full max-w-xl p-8 glass-panel border-t-primary/30">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Building2 className="w-6 h-6 text-foreground" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Apply as College Admin</h1>
            <p className="text-muted-foreground text-sm">Register your institution securely with Email OTP</p>
          </div>

          {step === "details" ? (
             <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <Input label="Full Name" placeholder="Jane Smith" {...registerSignup("fullName")} error={signupErrors.fullName?.message} />
                 <Input label="Official Email" type="email" placeholder="admin@college.edu" {...registerSignup("email")} error={signupErrors.email?.message} />
               </div>
               <Input label="College / Institution Name" placeholder="e.g. National Institute of Technology" {...registerSignup("collegeName")} error={signupErrors.collegeName?.message} />
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <Input label="Contact Number" placeholder="1234567890" {...registerSignup("contactNumber")} error={signupErrors.contactNumber?.message} />
                 <Input label="Designation (Optional)" placeholder="e.g. Cultural Secretary" {...registerSignup("designation")} error={signupErrors.designation?.message} />
               </div>
               
               <Button type="submit" variant="secondary" className="w-full mt-4" size="lg" isLoading={isLoading}>
                 Send Verification Code
               </Button>
             </form>
          ) : (
            <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                 <p className="text-sm font-medium text-center">Enter the verification code sent to</p>
                 <p className="text-primary font-bold text-center mt-1">{email}</p>
                 <button 
                  type="button" 
                  onClick={() => setStep("details")}
                  className="text-xs text-muted-foreground hover:text-white mx-auto block mt-2 underline"
                 >Change details</button>
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
                Verify & Submit Application
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            Already registered?{" "}
            <Link href="/admin/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
