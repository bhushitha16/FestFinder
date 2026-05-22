import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui-components";
import { Clock } from "lucide-react";

export default function AdminPending() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-10 glass-panel">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Approval Pending</h2>
          <p className="text-muted-foreground mb-8">
            Thank you for registering your institution. Your application is currently under review by our super admins. We will notify you once your account is activated.
          </p>
          <Link href="/" className="text-primary font-semibold hover:underline">
            Return to Home
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
