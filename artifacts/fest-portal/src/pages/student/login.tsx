import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useStudentLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function StudentLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const loginMutation = useStudentLogin({
    mutation: {
      onSuccess: () => {
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/student/dashboard");
      },
      onError: (err) => toast({ title: "Login Failed", description: getErrorMessage(err), variant: "destructive" })
    }
  });

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

          <form onSubmit={handleSubmit((d) => loginMutation.mutate({ data: d }))} className="space-y-5">
            <Input 
              label="College Email" 
              type="email"
              placeholder="student@college.edu"
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

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={loginMutation.isPending}>
              Sign In
            </Button>
          </form>

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
