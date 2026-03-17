import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useAdminLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Welcome back!", description: "Successfully logged in as Admin." });
        setLocation("/admin/dashboard");
      },
      onError: (error: any) => {
        toast({ 
          title: "Login failed", 
          description: error?.response?.data?.message || "Invalid credentials or account pending",
          variant: "destructive"
        });
      }
    }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data });
  };

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />
        
        <Card className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Building2 className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-3xl font-display font-semibold">College Admin</h1>
            <p className="text-muted-foreground mt-2">Manage your institution's events</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input 
              label="Work Email" 
              type="email"
              placeholder="admin@college.edu"
              {...register("email")}
              error={errors.email?.message}
            />
            
            <Input 
              label="Password" 
              type="password"
              placeholder="••••••••"
              {...register("password")}
              error={errors.password?.message}
            />

            <Button 
              type="submit" 
              className="w-full mt-8" 
              variant="secondary"
              isLoading={loginMutation.isPending}
            >
              Sign In to Admin Portal
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Want to register your college?{" "}
            <Link href="/admin/signup" className="text-foreground hover:text-primary transition-colors font-medium">
              Apply here
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
