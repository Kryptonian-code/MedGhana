import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="module-container">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center rounded-3xl border border-border/70 bg-card px-8 py-12 text-center shadow-sm">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Access Restricted</h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          Your current role does not have permission to open this section. If you need access, ask a hospital
          administrator or super admin to update your role policy.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/profile">View Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
