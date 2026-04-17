import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (response.ok) {
        toast({ title: "Authorized", description: "Super Admin access granted." });
        queryClient.setQueryData(["/api/auth/me"], resData.user);
        setLocation("/superadmin/dashboard");
      } else {
        toast({ title: "Access Denied", description: resData.error || "Login Failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <Card className="w-full max-w-sm p-8 glass-panel border-t-primary/50 relative z-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-widest text-white">System Admin</h1>
            <p className="text-muted-foreground text-xs mt-2 uppercase tracking-widest">Restricted Access</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input label="Master Email" type="email" placeholder="admin@system.local" {...register("email")} error={errors.email?.message} />
            <Input label="Master Password" type="password" placeholder="••••••••" {...register("password")} error={errors.password?.message} />
            <Button type="submit" className="w-full mt-2 tracking-widest uppercase" size="lg" isLoading={isLoading}>
              Authenticate
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
