import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button, Select } from "@/components/ui-components";
import { useStudentSignup, useListColleges } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  collegeId: z.coerce.number().min(1, "Please select a college"),
  collegeEmail: z.string().email("Valid college email required"),
  collegeIdNumber: z.string().min(2, "ID number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function StudentSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: colleges = [], isLoading: loadingColleges } = useListColleges();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const signupMutation = useStudentSignup({
    mutation: {
      onSuccess: () => {
        toast({ 
          title: "Registration successful!", 
          description: "Please check your email to verify your account." 
        });
        setLocation("/student/login");
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

  const collegeOptions = colleges.map(c => ({ value: c.id, label: c.name }));

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05),transparent_50%)] pointer-events-none" />
        
        <Card className="w-full max-w-xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-semibold">Create Account</h1>
            <p className="text-muted-foreground mt-2">Join the ultimate college fest network</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input 
              label="Full Name" 
              placeholder="John Doe"
              {...register("fullName")}
              error={errors.fullName?.message}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Contact Number" 
                placeholder="+1 234 567 8900"
                {...register("contactNumber")}
                error={errors.contactNumber?.message}
              />
              
              <Select 
                label="College" 
                options={collegeOptions}
                disabled={loadingColleges}
                {...register("collegeId")}
                error={errors.collegeId?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="College Email" 
                type="email"
                placeholder="student@college.edu"
                {...register("collegeEmail")}
                error={errors.collegeEmail?.message}
              />
              
              <Input 
                label="College ID Number" 
                placeholder="Ex: 2021ABC123"
                {...register("collegeIdNumber")}
                error={errors.collegeIdNumber?.message}
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
              size="lg"
              isLoading={signupMutation.isPending}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
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
