import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useAdminSignup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid work email required"),
  collegeName: z.string().min(2, "College name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  designation: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function AdminSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const signupMutation = useAdminSignup({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application Submitted", description: "Your request is pending super admin approval." });
        setLocation("/admin/pending");
      },
      onError: (error: any) => {
        toast({ 
          title: "Registration failed", 
          description: error?.response?.data?.message || "An error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate({ data });
  };

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />
        
        <Card className="w-full max-w-xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Building2 className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-3xl font-display font-semibold">Register Institution</h1>
            <p className="text-muted-foreground mt-2">Apply for admin access to host your college fests</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Your Full Name" 
                placeholder="Jane Doe"
                {...register("fullName")}
                error={errors.fullName?.message}
              />
              <Input 
                label="Work Email" 
                type="email"
                placeholder="admin@college.edu"
                {...register("email")}
                error={errors.email?.message}
              />
            </div>

            <Input 
              label="College Name" 
              placeholder="Full official name of institution"
              {...register("collegeName")}
              error={errors.collegeName?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Contact Number" 
                placeholder="+1 234 567 8900"
                {...register("contactNumber")}
                error={errors.contactNumber?.message}
              />
              <Input 
                label="Designation (Optional)" 
                placeholder="e.g. Cultural Secretary"
                {...register("designation")}
                error={errors.designation?.message}
              />
            </div>
            
            <Input 
              label="Password" 
              type="password"
              placeholder="Create a strong password"
              {...register("password")}
              error={errors.password?.message}
            />

            <Button 
              type="submit" 
              className="w-full mt-6" 
              variant="secondary"
              size="lg"
              isLoading={signupMutation.isPending}
            >
              Submit Application
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/admin/login" className="text-foreground hover:text-primary transition-colors font-medium">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
