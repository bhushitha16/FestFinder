import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneEmailButton } from "@/components/phone-email-button";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // We override the window.phoneEmailReceiver for this specific page if we want special logic
  // but better to handle it in the PhoneEmailButton or a similar custom component.
  
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      const resp = await fetch("/api/auth/reset-password-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: password }),
      });

      if (resp.ok) {
        toast({ title: "Success", description: "Password has been reset successfully." });
        setLocation("/student/login");
      } else {
        const err = await resp.json();
        toast({ title: "Error", description: err.error || "Failed to reset password", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {step === "verify" 
              ? "Verify your email using OTP to reset your password." 
              : "Set your new password below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "verify" ? (
            <div className="space-y-4">
              <PhoneEmailButton onSuccess={(email) => {
                setEmail(email);
                setStep("reset");
                toast({ title: "Email Verified", description: "You can now set a new password." });
              }} />
              <div className="text-center mt-4 text-sm">
                <Link href="/student/login" className="text-primary hover:underline">Back to Login</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full">Reset Password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
