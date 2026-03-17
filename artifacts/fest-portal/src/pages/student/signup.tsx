import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button, Select } from "@/components/ui-components";
import { useStudentSignup, useListColleges } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
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
        toast({ title: "Registration successful!", description: "Your account is ready. Please log in." });
        setLocation("/student/login");
      },
      onError: (err) => toast({ title: "Registration failed", description: getErrorMessage(err), variant: "destructive" })
    }
  });

  const collegeOptions = colleges.map(c => ({ value: c.id, label: c.name }));

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative">
        <Card className="w-full max-w-xl p-8 glass-panel border-t-primary/30 relative z-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Create Account</h1>
            <p className="text-muted-foreground text-sm">Join the ultimate college fest network</p>
          </div>

          <form onSubmit={handleSubmit((d) => signupMutation.mutate({ data: d }))} className="space-y-5">
            <Input label="Full Name" placeholder="John Doe" {...register("fullName")} error={errors.fullName?.message} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Contact Number" placeholder="1234567890" {...register("contactNumber")} error={errors.contactNumber?.message} />
              <Select label="College" options={collegeOptions} disabled={loadingColleges} {...register("collegeId")} error={errors.collegeId?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="College Email" type="email" placeholder="student@college.edu" {...register("collegeEmail")} error={errors.collegeEmail?.message} />
              <Input label="College ID Number" placeholder="Ex: 2021ABC123" {...register("collegeIdNumber")} error={errors.collegeIdNumber?.message} />
            </div>
            
            <Input label="Password" type="password" placeholder="Create a strong password" {...register("password")} error={errors.password?.message} />

            <Button type="submit" className="w-full mt-4" size="lg" isLoading={signupMutation.isPending}>
              Create Account
            </Button>
          </form>

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
