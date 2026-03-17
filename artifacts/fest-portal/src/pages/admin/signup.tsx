import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button } from "@/components/ui-components";
import { useAdminSignup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { Building2 } from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  collegeName: z.string().min(3, "College name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  designation: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AdminSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema)
  });

  const signupMutation = useAdminSignup({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application Submitted!", description: "Your request is pending Super Admin approval." });
        setLocation("/admin/pending");
      },
      onError: (err) => toast({ title: "Application failed", description: getErrorMessage(err), variant: "destructive" })
    }
  });

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-xl p-8 glass-panel border-t-primary/30">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Building2 className="w-6 h-6 text-foreground" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Apply as College Admin</h1>
            <p className="text-muted-foreground text-sm">Register your institution on Lumina Fests</p>
          </div>

          <form onSubmit={handleSubmit((d) => signupMutation.mutate({ data: d }))} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Full Name" placeholder="Jane Smith" {...register("fullName")} error={errors.fullName?.message} />
              <Input label="Official Email" type="email" placeholder="admin@college.edu" {...register("email")} error={errors.email?.message} />
            </div>
            <Input label="College / Institution Name" placeholder="e.g. National Institute of Technology" {...register("collegeName")} error={errors.collegeName?.message} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Contact Number" placeholder="1234567890" {...register("contactNumber")} error={errors.contactNumber?.message} />
              <Input label="Designation (Optional)" placeholder="e.g. Cultural Secretary" {...register("designation")} error={errors.designation?.message} />
            </div>
            
            <Input label="Password" type="password" placeholder="Create a strong password" {...register("password")} error={errors.password?.message} />

            <Button type="submit" variant="secondary" className="w-full mt-4" size="lg" isLoading={signupMutation.isPending}>
              Submit Application
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            Already registered?{" "}
            <Link href="/admin/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
