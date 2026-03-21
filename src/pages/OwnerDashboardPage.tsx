import { useEffect, useState } from "react";
import { Building2, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { getOwnerDashboard, type OwnerDashboardResponse } from "@/lib/ownerApi";

export default function OwnerDashboardPage() {
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await getOwnerDashboard();
        if (mounted) setData(response);
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load owner dashboard",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="module-container">
      <PageHeader title="Owner Dashboard" description="Global visibility across hospitals, operations, notifications, and SMS traffic." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Hospitals" value={data?.stats.hospitals ?? 0} icon={Building2} />
        <StatCard title="Active Users" value={data?.stats.users ?? 0} icon={Users} />
        <StatCard title="Queued SMS" value={data?.stats.queued_sms ?? 0} icon={MessageSquare} />
        <StatCard title="Audit Events" value={data?.stats.audit_events ?? 0} icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <h3 className="font-semibold">Hospital Tenants</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Hospital", "Code", "Branches", "Users", "Patients", "Status"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.hospitals.map((hospital) => (
                  <tr key={hospital.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{hospital.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{hospital.code}</td>
                    <td className="px-4 py-3">{hospital.branch_count}</td>
                    <td className="px-4 py-3">{hospital.user_count}</td>
                    <td className="px-4 py-3">{hospital.patient_count}</td>
                    <td className="px-4 py-3 capitalize">{hospital.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Recent SMS Queue</h3>
          <div className="mt-4 space-y-3">
            {data?.recent_sms.map((sms) => (
              <div key={sms.id} className="rounded-xl border border-border/70 p-4">
                <p className="font-medium">{sms.phone_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sms.context.replace("_", " ")}</p>
                <p className="mt-1 text-xs text-muted-foreground capitalize">{sms.status}</p>
              </div>
            ))}
            {!data?.recent_sms.length && <p className="text-sm text-muted-foreground">No SMS records yet.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">Recent Audit Trail</h3>
        <div className="mt-4 space-y-3">
          {data?.recent_audits.map((audit) => (
            <div key={audit.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">{audit.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(audit.created_at).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {audit.full_name || "System"} · {audit.user_role || "unknown role"} · {audit.hospital_name || "No hospital"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {audit.entity_type}{audit.entity_id ? ` #${audit.entity_id}` : ""}
              </p>
            </div>
          ))}
          {!data?.recent_audits.length && <p className="text-sm text-muted-foreground">No audit activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
