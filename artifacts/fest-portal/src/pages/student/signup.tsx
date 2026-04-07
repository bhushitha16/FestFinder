import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button, Select } from "@/components/ui-components";
import { useListColleges } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";
import { PhoneEmailButton } from "@/components/phone-email-button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  collegeId: z.coerce.number().min(1, "Please select a college"),
  collegeEmail: z.string().email("Valid college email required"),
  collegeIdNumber: z.string().min(2, "ID number is required"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function StudentSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch colleges safely
  const { data, isLoading: loadingColleges } = useListColleges();

  const { register: registerSignup, handleSubmit: handleSignupSubmit, formState: { errors: signupErrors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const { register: registerOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErrors } } = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema)
  });

  const collegeOptions = (() => {
    if (Array.isArray(data)) return data.map((c: any) => ({ value: c.id, label: c.name }));
    if (Array.isArray((data as any)?.data)) return (data as any).data.map((c: any) => ({ value: c.id, label: c.name }));
    if (Array.isArray((data as any)?.colleges)) return (data as any).colleges.map((c: any) => ({ value: c.id, label: c.name }));
    return [];
  })();

  const onSignupSubmit = async (data: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/student/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (response.ok) {
        toast({ title: "OTP Sent", description: resData.message });
        setEmail(data.collegeEmail);
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
      const response = await fetch("/api/auth/student/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: data.otp }),
      });
      const resData = await response.json();
      
      if (response.ok) {
        toast({ title: "Verification successful!", description: "Your account is active." });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/student/dashboard");
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
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative">
        <Card className="w-full max-w-xl p-8 glass-panel border-t-primary/30 relative z-10">

          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Create Account</h1>
            <p className="text-muted-foreground text-sm">Join the ultimate college fest network securely</p>
          </div>

          {step === "details" ? (
             <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
               <Input label="Full Name" placeholder="John Doe" {...registerSignup("fullName")} error={signupErrors.fullName?.message} />

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <Input label="Contact Number" placeholder="1234567890" {...registerSignup("contactNumber")} error={signupErrors.contactNumber?.message} />
                 <Select label="College" options={collegeOptions} disabled={loadingColleges} {...registerSignup("collegeId")} error={signupErrors.collegeId?.message} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <Input label="College Email" type="email" placeholder="student@college.edu" {...registerSignup("collegeEmail")} error={signupErrors.collegeEmail?.message} />
                 <Input label="College ID Number" placeholder="Ex: 2021ABC123" {...registerSignup("collegeIdNumber")} error={signupErrors.collegeIdNumber?.message} />
               </div>

               <Button type="submit" className="w-full mt-4" size="lg" isLoading={isLoading}>
                 Send Verification Code
               </Button>
               
               <PhoneEmailButton />
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
                Verify & Login
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            Already have an account?{" "}
            <Link href="/student/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>

        </Card>
      </div>
    </AppLayout>
  );
}