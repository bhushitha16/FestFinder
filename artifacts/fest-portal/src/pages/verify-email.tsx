import { Link, useSearch } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { MailCheck, Loader2, XCircle } from "lucide-react";
import { useVerifyEmail } from "@workspace/api-client-react";
import { useEffect, useState } from "react";

export default function VerifyEmail() {
  const search = useSearch();
  const query = new URLSearchParams(search);
  const token = query.get("token");
  const [isVerifying, setIsVerifying] = useState(!!token);

  const { data, error, isLoading } = useVerifyEmail(
    { token: token! },
    { query: { enabled: !!token } }
  );

  useEffect(() => {
    if (data || error) {
      setIsVerifying(false);
    }
  }, [data, error]);

  if (isVerifying || isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-10 glass-panel">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-display font-bold mb-4">Verifying...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your email.</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error || !token) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-10 glass-panel border-red-500/20">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-4">Verification Failed</h2>
            <p className="text-muted-foreground mb-8">
              {error ? (error as any).message || "Invalid or expired token." : "No verification token provided."}
            </p>
            <Link href="/" className="text-primary font-semibold hover:underline">
              Return Home
            </Link>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-10 glass-panel border-emerald-500/20">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <MailCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Email Verified</h2>
          <p className="text-muted-foreground mb-8">
            Your email has been successfully verified. You can now access your account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/student/login" className="text-primary font-semibold hover:underline">
              Student Login
            </Link>
            <Link href="/admin/login" className="text-primary font-semibold hover:underline">
              College Admin Login
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
