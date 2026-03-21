import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createTriageRecord, createWalkInVisit, listVisitsForTriage, type TriagePayload, type WalkInVisitPayload } from "@/lib/triageApi";
import { listPatients } from "@/lib/patientsApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { Patient, Visit } from "@/types";

const defaultForm: TriagePayload = {
  visit_id: 0,
  patient_id: 0,
  temperature: "",
  pulse: "",
  respiratory_rate: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  oxygen_saturation: "",
  weight: "",
  height: "",
  notes: "",
};

const defaultWalkInForm: WalkInVisitPayload = {
  patient_id: 0,
  visit_date: new Date().toISOString().slice(0, 10),
  visit_time: new Date().toTimeString().slice(0, 5),
  complaint: "",
};

export default function TriagePage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWalkIn, setSavingWalkIn] = useState(false);
  const [form, setForm] = useState<TriagePayload>(defaultForm);
  const [walkInForm, setWalkInForm] = useState<WalkInVisitPayload>(defaultWalkInForm);

  const loadVisits = async () => {
    const [visitsResponse, patientsResponse] = await Promise.all([listVisitsForTriage(), listPatients()]);
    setVisits(visitsResponse.visits);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [visitsResponse, patientsResponse] = await Promise.all([listVisitsForTriage(), listPatients()]);
        if (!mounted) return;

        setVisits(visitsResponse.visits);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (!mounted) return;

        toast({
          title: "Unable to load triage queue",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
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

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) =>
        `${visit.patient_name ?? ""} ${visit.hospital_number ?? ""} ${visit.status} ${visit.complaint ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, visits]
  );

  const triageQueue = visits.filter((visit) => ["waiting_triage", "in_triage"].includes(visit.status));
  const latestBmi =
    form.height && form.weight && Number(form.height) > 0
      ? (Number(form.weight) / ((Number(form.height) / 100) * (Number(form.height) / 100))).toFixed(2)
      : "";

  const updateField = <K extends keyof TriagePayload>(key: K, value: TriagePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSelectVisit = (value: string) => {
    const selected = triageQueue.find((visit) => String(visit.id) === value);
    if (!selected) return;

    setForm((current) => ({
      ...current,
      visit_id: Number(selected.id),
      patient_id: Number(selected.patient_id),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createTriageRecord(form);
      await loadVisits();
      setOpen(false);
      setForm(defaultForm);
      toast({
        title: "Triage saved",
        description: "The visit has been updated with vital signs.",
      });
    } catch (error) {
      toast({
        title: "Unable to record vitals",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWalkIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingWalkIn(true);

    try {
      await createWalkInVisit(walkInForm);
      await loadVisits();
      setWalkInOpen(false);
      setWalkInForm({
        ...defaultWalkInForm,
        visit_date: new Date().toISOString().slice(0, 10),
        visit_time: new Date().toTimeString().slice(0, 5),
      });
      toast({
        title: "Walk-in created",
        description: "The patient has been checked in and added to the triage queue.",
      });
    } catch (error) {
      toast({
        title: "Unable to create walk-in",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingWalkIn(false);
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Triage" description="Capture vital signs and move checked-in patients into clinical review.">
        <div className="flex flex-wrap gap-2">
          {can("visits.create") && (
            <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  New Walk-In
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Walk-In Visit</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCreateWalkIn}>
                  <div>
                    <Label>Patient *</Label>
                    <select
                      value={walkInForm.patient_id ? String(walkInForm.patient_id) : ""}
                      onChange={(event) => setWalkInForm((current) => ({ ...current, patient_id: Number(event.target.value) }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.hospital_number} - {patient.first_name} {patient.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Visit Date *</Label>
                      <Input type="date" value={walkInForm.visit_date} onChange={(event) => setWalkInForm((current) => ({ ...current, visit_date: event.target.value }))} required />
                    </div>
                    <div>
                      <Label>Visit Time *</Label>
                      <Input type="time" value={walkInForm.visit_time} onChange={(event) => setWalkInForm((current) => ({ ...current, visit_time: event.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <Label>Presenting Complaint</Label>
                    <Textarea value={walkInForm.complaint || ""} onChange={(event) => setWalkInForm((current) => ({ ...current, complaint: event.target.value }))} rows={3} placeholder="Symptoms or front desk notes" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setWalkInOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={savingWalkIn || !walkInForm.patient_id}>{savingWalkIn ? "Saving..." : "Create Walk-In"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {can("triage.record") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Record Vitals
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Record Vital Signs</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label>Visit *</Label>
                  <select
                    value={form.visit_id ? String(form.visit_id) : ""}
                    onChange={(event) => handleSelectVisit(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value="">Select patient waiting for triage</option>
                    {triageQueue.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {visit.hospital_number} - {visit.patient_name} - queue #{visit.queue_number || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Temperature (deg C)</Label>
                    <Input value={form.temperature || ""} onChange={(event) => updateField("temperature", event.target.value)} placeholder="37.0" />
                  </div>
                  <div>
                    <Label>Pulse (bpm)</Label>
                    <Input value={form.pulse || ""} onChange={(event) => updateField("pulse", event.target.value)} placeholder="72" />
                  </div>
                  <div>
                    <Label>Respiratory Rate</Label>
                    <Input value={form.respiratory_rate || ""} onChange={(event) => updateField("respiratory_rate", event.target.value)} placeholder="18" />
                  </div>
                  <div>
                    <Label>Systolic BP</Label>
                    <Input value={form.blood_pressure_systolic || ""} onChange={(event) => updateField("blood_pressure_systolic", event.target.value)} placeholder="120" />
                  </div>
                  <div>
                    <Label>Diastolic BP</Label>
                    <Input value={form.blood_pressure_diastolic || ""} onChange={(event) => updateField("blood_pressure_diastolic", event.target.value)} placeholder="80" />
                  </div>
                  <div>
                    <Label>SpO2 (%)</Label>
                    <Input value={form.oxygen_saturation || ""} onChange={(event) => updateField("oxygen_saturation", event.target.value)} placeholder="98" />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input value={form.weight || ""} onChange={(event) => updateField("weight", event.target.value)} placeholder="70" />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input value={form.height || ""} onChange={(event) => updateField("height", event.target.value)} placeholder="170" />
                  </div>
                  <div>
                    <Label>BMI</Label>
                    <Input value={latestBmi} disabled placeholder="Auto-calculated" />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes || ""} onChange={(event) => updateField("notes", event.target.value)} placeholder="Additional triage notes" rows={3} />
                </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving || !form.visit_id || !form.patient_id}>
                      {saving ? "Saving..." : "Save Vitals"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Waiting for Triage</p>
          <p className="text-2xl font-bold text-warning">{triageQueue.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Triaged Today</p>
          <p className="text-2xl font-bold text-success">{visits.filter((visit) => visit.status === "triaged").length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Access Policy</p>
          <p className="text-sm font-medium">{can("triage.record") ? "Vitals entry allowed" : "View only"}</p>
        </div>
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search visits..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Queue", "Patient", "Visit", "Complaint", "Vitals", "Status"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredVisits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No visit workflow records found yet.
                  </td>
                </tr>
              )}

              {filteredVisits.map((visit) => (
                <tr key={visit.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-primary">#{visit.queue_number || "-"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{visit.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{visit.hospital_number}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{visit.visit_date}</p>
                    <p className="text-muted-foreground">{visit.visit_time}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{visit.complaint || "-"}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>Temp: {visit.temperature ?? "-"}</p>
                    <p>Pulse: {visit.pulse ?? "-"}</p>
                    <p>BMI: {visit.bmi ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{visit.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
