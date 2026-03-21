import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard, HeartPulse, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getPatient } from "@/lib/patientsApi";
import type { PatientDetailResponse } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) return;
      try {
        const response = await getPatient(id);
        if (mounted) setData(response);
      } catch (error) {
        toast({
          title: "Unable to load patient",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="module-container text-sm text-muted-foreground">Loading patient details...</div>;
  }

  if (!data) {
    return (
      <div className="module-container">
        <EmptyState
          icon={<UserRound className="h-10 w-10" />}
          title="Patient not found"
          description="The requested patient record could not be loaded."
          action={<Button asChild><Link to="/patients">Back to Patients</Link></Button>}
        />
      </div>
    );
  }

  const { patient, appointments, visits, invoices } = data;

  return (
    <div className="module-container">
      <PageHeader
        title={`${patient.first_name} ${patient.last_name}`}
        description={`Hospital No. ${patient.hospital_number}`}
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/patients"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Patients</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Phone" value={patient.phone} />
            <Info label="Email" value={patient.email || "-"} />
            <Info label="Gender" value={patient.gender} />
            <Info label="Date of Birth" value={patient.date_of_birth} />
            <Info label="Town / Region" value={[patient.town, patient.region].filter(Boolean).join(", ") || "-"} />
            <Info label="Insurance" value={patient.insurance_type || "none"} />
            <Info label="Blood Group" value={patient.blood_group || "-"} />
            <Info label="Genotype" value={patient.genotype || "-"} />
            <Info label="NHIS Number" value={patient.nhis_number || "-"} />
            <Info label="Emergency Contact" value={patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || "-"})` : "-"} />
          </div>
        </div>
        <div className="space-y-4">
          <SummaryCard icon={CalendarDays} label="Appointments" value={appointments.length.toString()} />
          <SummaryCard icon={HeartPulse} label="Visits" value={visits.length.toString()} />
          <SummaryCard icon={CreditCard} label="Invoices" value={invoices.length.toString()} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Recent Appointments">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments recorded yet.</p>
          ) : (
            appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{appointment.doctor_name || "Assigned doctor"}</p>
                    <p className="text-xs text-muted-foreground">{appointment.appointment_date} at {appointment.appointment_time}</p>
                  </div>
                  <Badge variant="outline">{appointment.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Visits">
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visit workflow recorded yet.</p>
          ) : (
            visits.map((visit) => (
              <div key={visit.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{visit.visit_date} at {visit.visit_time}</p>
                    <p className="text-xs text-muted-foreground">{visit.source.replace("_", " ")} | queue #{visit.queue_number || "-"}</p>
                  </div>
                  <Badge variant="outline">{visit.status.replace("_", " ")}</Badge>
                </div>
                {(visit.temperature || visit.pulse || visit.bmi) && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Temp: {visit.temperature ?? "-"} | Pulse: {visit.pulse ?? "-"} | BMI: {visit.bmi ?? "-"}
                  </p>
                )}
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Billing">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices have been raised for this patient yet.</p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{invoice.created_at?.slice(0, 10)}</p>
                  </div>
                  <Badge variant="outline">{invoice.status}</Badge>
                </div>
                <p className="mt-3 text-sm">Total: GHS {Number(invoice.total_amount).toLocaleString()} | Paid: GHS {Number(invoice.paid_amount).toLocaleString()}</p>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="w-5 h-5 text-primary" />
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}
