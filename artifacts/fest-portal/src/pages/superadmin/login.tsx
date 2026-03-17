import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, Input, Button } from "@/components/ui-components";
import { useSuperAdminLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useSuperAdminLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/superadmin/dashboard");
      },
      onError: () => toast({ title: "Access Denied", variant: "destructive" })
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm border-primary/20 shadow-[0_0_50px_-12px_hsl(var(--primary)/0.15)]">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold">System Administration</h1>
        </div>
        <form onSubmit={handleSubmit((d) => loginMutation.mutate({ data: d }))} className="space-y-4">
          <Input label="Admin Email" type="email" {...register("email")} />
          <Input label="Security Key" type="password" {...register("password")} />
          <Button type="submit" className="w-full mt-4" isLoading={loginMutation.isPending}>Authenticate</Button>
        </form>
      </Card>
    </div>
  );
}
