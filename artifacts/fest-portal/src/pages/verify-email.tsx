import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { MailCheck } from "lucide-react";

export default function VerifyEmail() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-10 glass-panel">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <MailCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Email Verified</h2>
          <p className="text-muted-foreground mb-8">
            Your email has been successfully verified. Your account is now active.
          </p>
          <Link href="/student/login" className="text-primary font-semibold hover:underline">
            Proceed to Login
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
