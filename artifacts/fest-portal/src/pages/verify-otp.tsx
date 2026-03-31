import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

export default function VerifyOtp() {
    const [, setLocation] = useLocation();
    const search = useSearch();
    const query = new URLSearchParams(search);
    const email = query.get("email") || "";
    const { toast } = useToast();

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast({ title: "Invalid OTP", description: "Please enter a 6-digit code.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Verification failed");
            }

            const redirectTo = query.get("redirect") || "/student/login";
            toast({ title: "Verified!", description: "Your email has been verified successfully." });
            setLocation(redirectTo);
        } catch (err) {
            toast({
                title: "Verification failed",
                description: err instanceof Error ? err.message : "Something went wrong",
                variant: "destructive"
            });
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
                            <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-display font-semibold mb-2">Verify OTP</h1>
                        <p className="text-muted-foreground text-sm">
                            We've sent a 6-digit code to <br />
                            <span className="text-foreground font-medium">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="One-Time Password"
                            placeholder="000000"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="text-center text-2xl tracking-[0.5em] font-mono"
                        />

                        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                            Verify & Complete
                        </Button>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            Didn't receive the code?
                            <button type="button" className="text-primary hover:underline ml-1" onClick={() => toast({ title: "Coming Soon", description: "Resend functionality is being implemented." })}>
                                Resend
                            </button>
                        </p>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
