import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui-components";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-8xl font-display font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
