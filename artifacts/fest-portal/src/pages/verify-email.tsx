import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useVerifyEmail } from "@workspace/api-client-react";
import { Card, Button } from "@/components/ui-components";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";

  const { data, error, isLoading } = useVerifyEmail({ token }, { query: { enabled: !!token, retry: false }});

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md text-center py-12">
        {!token ? (
          <div><p className="text-destructive">Invalid verification link.</p></div>
        ) : isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p>Verifying your email...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{(error as any)?.response?.data?.message || "Link expired or invalid."}</p>
            <Link href="/student/login"><Button>Go to Login</Button></Link>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-6">Your account is now active.</p>
            <Link href="/student/login"><Button>Login Now</Button></Link>
          </div>
        )}
      </Card>
    </div>
  );
}
