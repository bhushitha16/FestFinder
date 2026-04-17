import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api-client";

declare global {
  interface Window {
    phoneEmailReceiver: (userObj: { user_json_url: string }) => void;
  }
}

export function PhoneEmailButton({ onSuccess }: { onSuccess?: (email: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Define the receiver function on the window object
    window.phoneEmailReceiver = async (userObj) => {
      const user_json_url = userObj.user_json_url;
      
      try {
        const response = await fetch("/api/auth/phone-email/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_json_url }),
        });

        const result = await response.json();

        if (response.ok) {
          if (onSuccess) {
            onSuccess(result.user.email);
          } else {
            toast({ title: "Welcome back!", description: "Successfully logged in with phone.email." });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            setLocation("/student/dashboard");
          }
        } else {
          toast({ title: "Login Failed", description: result.error || "Failed to verify", variant: "destructive" });
        }
      } catch (err) {
        toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      }
    };

    // Load the script for email verification
    const emailScript = document.createElement("script");
    emailScript.src = "https://www.phone.email/verify_email_v1.js";
    emailScript.async = true;
    document.body.appendChild(emailScript);

    return () => {
      document.body.removeChild(emailScript);
      delete (window as any).phoneEmailReceiver;
    };
  }, [toast, queryClient, setLocation]);

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full">
      <div className="relative w-full flex items-center gap-3 py-2">
        <div className="h-[1px] flex-1 bg-white/10"></div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Or continue with</span>
        <div className="h-[1px] flex-1 bg-white/10"></div>
      </div>
      <div className="w-full">
        <div 
          className="pe_verify_email w-full flex justify-center" 
          data-client-id="11119395947404653194"
        ></div>
      </div>
    </div>
  );
}
