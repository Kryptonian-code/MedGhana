import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BedDouble, Plus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { createAdmission, listAdmissions, updateAdmissionStatus, type AdmissionPayload } from "@/lib/admissionsApi";
import { listPatients } from "@/lib/patientsApi";
import type { Admission, Patient, Ward } from "@/types";

type AdmissionRow = Admission & { patient_name?: string; hospital_number?: string; ward_name?: string };

const defaultForm: AdmissionPayload = {
  patient_id: 0,
  ward_id: 0,
  bed_number: "",
  admission_date: "",
  reason: "",
};

export default function AdmissionsPage() {
  const [tab, setTab] = useState<"admissions" | "wards">("admissions");
  const [wards, setWards] = useState<Ward[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AdmissionPayload>(defaultForm);

  const loadData = async () => {
    const [admissionsResponse, patientsResponse] = await Promise.all([listAdmissions(), listPatients()]);
    setWards(admissionsResponse.wards);
    setAdmissions(admissionsResponse.admissions);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const [admissionsResponse, patientsResponse] = await Promise.all([listAdmissions(), listPatients()]);
        if (!mounted) return;
        setWards(admissionsResponse.wards);
        setAdmissions(admissionsResponse.admissions);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load admissions",
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
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const totalBeds = wards.reduce((sum, ward) => sum + Number(ward.total_beds || 0), 0);
  const occupiedBeds = wards.reduce((sum, ward) => sum + Number(ward.occupied_beds || 0), 0);

  const availableWards = useMemo(
    () => wards.filter((ward) => Number(ward.available_beds || 0) > 0),
    [wards]
  );

  const handleCreateAdmission = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createAdmission(form);
      await loadData();
      setOpen(false);
      setForm(defaultForm);
      toast({ title: "Admission recorded", description: "Ward occupancy has been updated." });
    } catch (error) {
      toast({
        title: "Unable to create admission",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (admission: any, status: "discharged" | "transferred") => {
    try {
      await updateAdmissionStatus(admission.id, status, new Date().toISOString().slice(0, 10));
      await loadData();
      toast({ title: "Admission updated", description: `${admission.patient_name} has been ${status}.` });
    } catch (error) {
      toast({
        title: "Unable to update admission",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Admissions & Wards" description="Bed management and inpatient workflow">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Admit Patient</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Admit Patient</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateAdmission}>
              <div>
                <Label>Patient</Label>
                <select
                  value={form.patient_id ? String(form.patient_id) : ""}
                  onChange={(e) => setForm((current) => ({ ...current, patient_id: Number(e.target.value) }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.hospital_number} - {patient.first_name} {patient.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Ward</Label>
                <select
                  value={form.ward_id ? String(form.ward_id) : ""}
                  onChange={(e) => setForm((current) => ({ ...current, ward_id: Number(e.target.value) }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select ward</option>
                  {availableWards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.name} ({ward.available_beds} beds free)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bed Number</Label><Input value={form.bed_number} onChange={(e) => setForm((current) => ({ ...current, bed_number: e.target.value }))} required /></div>
                <div><Label>Admission Date</Label><Input type="date" value={form.admission_date} onChange={(e) => setForm((current) => ({ ...current, admission_date: e.target.value }))} required /></div>
              </div>
              <div><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} required /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.patient_id || !form.ward_id}>{saving ? "Saving..." : "Admit Patient"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Beds" value={totalBeds} icon={BedDouble} />
        <StatCard title="Occupied" value={occupiedBeds} icon={BedDouble} iconColor="bg-warning/10" />
        <StatCard title="Available" value={Math.max(totalBeds - occupiedBeds, 0)} icon={BedDouble} iconColor="bg-success/10" />
        <StatCard title="Occupancy Rate" value={`${totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%`} icon={BedDouble} iconColor="bg-info/10" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "admissions" ? "default" : "outline"} size="sm" onClick={() => setTab("admissions")}>Current Admissions</Button>
        <Button variant={tab === "wards" ? "default" : "outline"} size="sm" onClick={() => setTab("wards")}>Ward Overview</Button>
      </div>

      {tab === "admissions" ? (
        <DataTableShell>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {["Patient", "Ward", "Bed", "Reason", "Admitted", "Status", "Actions"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
            </tr></thead>
            <tbody>
              {!loading && admissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No active admissions yet. Admit a patient to start bed tracking.
                  </td>
                </tr>
              )}
              {admissions.map((admission) => (
                <tr key={admission.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3"><p className="font-medium">{admission.patient_name}</p><p className="text-xs text-muted-foreground">{admission.hospital_number}</p></td>
                    <td className="px-4 py-3">{admission.ward_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{admission.bed_number}</td>
                    <td className="px-4 py-3">{admission.reason}</td>
                    <td className="px-4 py-3 text-xs">{admission.admission_date}</td>
                    <td className="px-4 py-3"><Badge variant={admission.status === "admitted" ? "default" : "secondary"}>{admission.status}</Badge></td>
                    <td className="px-4 py-3">
                      {admission.status === "admitted" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(admission, "discharged")}>Discharge</Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(admission, "transferred")}>Transfer</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTableShell>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {!loading && wards.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground xl:col-span-3">
              No wards are available yet. Default wards are created automatically when the admissions API is first loaded.
            </div>
          )}
          {wards.map((ward) => (
            <div key={ward.id} className="stat-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{ward.name}</h3>
                <Badge variant="outline" className="text-[10px] capitalize">{ward.type}</Badge>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Number(ward.total_beds) > 0 ? (Number(ward.occupied_beds) / Number(ward.total_beds)) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-medium">{ward.occupied_beds}/{ward.total_beds}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ward.available_beds} beds available</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
