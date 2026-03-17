import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { Link } from "wouter";
import { Clock } from "lucide-react";

export default function AdminPending() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-semibold mb-4">Application Under Review</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for registering your institution. Your application is currently pending approval from our super admins. We will notify you once your account is active.
          </p>
          <Link href="/" className="text-primary hover:underline font-medium">
            Return to Home
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
