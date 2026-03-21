import { useEffect, useState } from "react";
import { Activity, CalendarDays, CreditCard, Stethoscope, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { getDashboardOverview, type DashboardResponse } from "@/lib/dashboardApi";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await getDashboardOverview();
        if (mounted) {
          setData(response);
        }
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load dashboard",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = data?.stats;
  const recentNotifications = data?.notifications.slice(0, 4) ?? [];

  return (
    <div className="module-container">
      <PageHeader title="Dashboard" description="Operational overview of today's patient flow, queues, and billing." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Patients Today" value={loading ? "..." : stats?.patients_today ?? 0} icon={UserPlus} />
        <StatCard title="Appointments" value={loading ? "..." : stats?.appointments_today ?? 0} icon={CalendarDays} />
        <StatCard title="Waiting Triage" value={loading ? "..." : stats?.waiting_triage ?? 0} icon={Activity} />
        <StatCard title="Ready For Doctor" value={loading ? "..." : stats?.ready_for_consultation ?? 0} icon={Stethoscope} />
        <StatCard title="Revenue Today" value={loading ? "..." : `GHS ${(stats?.revenue_today ?? 0).toLocaleString()}`} icon={CreditCard} iconColor="bg-success/10" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Workflow Handoffs</h3>
            <p className="text-xs text-muted-foreground">Keep queues moving without opening every module.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <WorkflowCard
              title="Reception to Triage"
              value={stats?.waiting_triage ?? 0}
              description="Checked-in patients currently waiting for vitals and nursing review."
            />
            <WorkflowCard
              title="Triage to Doctor"
              value={stats?.ready_for_consultation ?? 0}
              description="Patients already triaged and now waiting for consultation."
            />
            <WorkflowCard
              title="Pending Bills"
              value={stats?.pending_bills ?? 0}
              description="Encounters that still need invoice follow-up or payment completion."
            />
            <WorkflowCard
              title="Automated Messages"
              value={data?.notifications.length ?? 0}
              description="Recent workflow alerts generated for the current role and branch."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">What Is Automated Now</h3>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Appointment booking can queue an SMS confirmation for the patient.</p>
            <p>Checking in a patient notifies the triage team that someone is waiting.</p>
            <p>Saving triage notifies doctors that a patient is ready for consultation.</p>
            <p>Completing consultation notifies billing and records for the next step.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Recent Notifications</h3>
          <p className="text-xs text-muted-foreground">Latest branch workflow alerts.</p>
        </div>
        <div className="mt-4 space-y-3">
          {!loading && recentNotifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No workflow notifications yet.</p>
          )}
          {recentNotifications.map((notification) => (
            <div key={notification.id} className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">{notification.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
