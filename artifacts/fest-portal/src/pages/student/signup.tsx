import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, Input, Button, Select } from "@/components/ui-components";
import { useStudentSignup, useListColleges } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { GraduationCap, Phone, CheckCircle2, XCircle } from "lucide-react";

// ─── phone.email widget ──────────────────────────────────────────────────────
// The widget script adds a "Sign in with Phone" button.  When the user
// completes OTP verification, it calls the global `phoneEmailListener`
// callback with a `user_json_url` that we then exchange (server-side) for
// the verified phone details.
declare global {
  interface Window {
    phoneEmailListener?: (userJsonUrl: string) => void;
  }
}

const PHONE_EMAIL_CLIENT_ID = import.meta.env.VITE_PHONE_EMAIL_CLIENT_ID as string | undefined;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "";

// ─── Form schema ─────────────────────────────────────────────────────────────
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  collegeId: z.coerce.number().min(1, "Please select a college"),
  collegeEmail: z.string().email("Valid college email required"),
  collegeIdNumber: z.string().min(2, "ID number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

interface PhoneVerificationState {
  status: "idle" | "pending" | "verified" | "error";
  phone?: string;
  error?: string;
}

export default function StudentSignup() {
  const [, setLocation] = useLocation();
  const toast = useToast().toast;
  const phoneButtonRef = useRef<HTMLDivElement>(null);
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerificationState>({ status: "idle" });
  const scriptLoadedRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Load the phone.email widget script once, and register the global listener
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!PHONE_EMAIL_CLIENT_ID || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    // Register the global callback that phone.email calls after OTP verification.
    window.phoneEmailListener = async (userJsonUrl: string) => {
      setPhoneVerification({ status: "pending" });
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/phone-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_json_url: userJsonUrl }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? "Phone verification failed");
        }

        const data = await res.json() as { fullPhone: string; countryCode: string; phoneNumber: string };
        setPhoneVerification({ status: "verified", phone: data.fullPhone });

        // Pre-fill the contact number field if it is empty
        if (!form.getValues("contactNumber")) {
          form.setValue("contactNumber", data.fullPhone);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Phone verification failed";
        setPhoneVerification({ status: "error", error: msg });
      }
    };

    // Inject the phone.email widget script.
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign-in-button-v1.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      delete window.phoneEmailListener;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Colleges + form setup
  // ──────────────────────────────────────────────────────────────────────────
  const { data, isLoading: loadingColleges } = useListColleges();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });
  const { register, handleSubmit, formState: { errors } } = form;

  const signupMutation = useStudentSignup({
    mutation: {
      onSuccess: (data: any) => {
        toast({
          title: "Registration successful!",
          description: "Please enter the OTP to verify your account.",
        });
        // The backend response now includes the email used during registration.
        const email = data?.email || form.getValues("collegeEmail");
        setLocation(`/verify-otp?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/student/login")}`);
      },
      onError: (err) =>
        toast({
          title: "Registration failed",
          description: getErrorMessage(err),
          variant: "destructive",
        }),
    },
  });

  const collegeOptions = (() => {
    if (Array.isArray(data)) return data.map((c: any) => ({ value: c.id, label: c.name }));
    if (Array.isArray((data as any)?.data)) return (data as any).data.map((c: any) => ({ value: c.id, label: c.name }));
    if (Array.isArray((data as any)?.colleges)) return (data as any).colleges.map((c: any) => ({ value: c.id, label: c.name }));
    return [];
  })();

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12 relative">
        <Card className="w-full max-w-xl p-8 glass-panel border-t-primary/30 relative z-10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join the ultimate college fest network
            </p>
          </div>

          {/* Phone.Email Verification */}
          {PHONE_EMAIL_CLIENT_ID && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Verify your phone number
              </p>

              {phoneVerification.status === "verified" ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Phone verified: <strong>{phoneVerification.phone}</strong></span>
                </div>
              ) : phoneVerification.status === "error" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{phoneVerification.error}</span>
                  </div>
                  {/* Render fresh widget button so user can retry */}
                  <div
                    ref={phoneButtonRef}
                    className="pe_signin_button"
                    data-client-id={PHONE_EMAIL_CLIENT_ID}
                  />
                </div>
              ) : phoneVerification.status === "pending" ? (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-muted-foreground text-sm animate-pulse">
                  Verifying your phone number…
                </div>
              ) : (
                /* Default: show the phone.email sign-in button */
                <div
                  ref={phoneButtonRef}
                  className="pe_signin_button"
                  data-client-id={PHONE_EMAIL_CLIENT_ID}
                />
              )}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit((d) =>
              signupMutation.mutate({ data: d })
            )}
            className="space-y-5"
          >
            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register("fullName")}
              error={errors.fullName?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Contact Number"
                placeholder="1234567890"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              className="w-full mt-4"
              size="lg"
              isLoading={signupMutation.isPending}
            >
              Create Account
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
            Already have an account?{" "}
            <Link
              href="/student/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>

        </Card>
      </div>
    </AppLayout>
  );
}