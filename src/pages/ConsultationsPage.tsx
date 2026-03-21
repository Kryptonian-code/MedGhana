import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createConsultation, listConsultations, type ConsultationPayload } from "@/lib/consultationsApi";
import { listPharmacyData } from "@/lib/pharmacyApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { Consultation, Drug, Visit } from "@/types";

const defaultForm: ConsultationPayload = {
  visit_id: 0,
  patient_id: 0,
  presenting_complaint: "",
  history_of_present_illness: "",
  examination_findings: "",
  diagnosis: "",
  icd_code: "",
  treatment_plan: "",
  notes: "",
  prescriptions: [],
  lab_orders: [],
};

const defaultPrescription = {
  drug_id: null as number | null,
  drug_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  quantity: 1,
  instructions: "",
};

const defaultLabOrder = {
  test_name: "",
  test_category: "",
  priority: "routine" as const,
  sample_type: "",
  clinical_notes: "",
};

export default function ConsultationsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [pendingVisits, setPendingVisits] = useState<Visit[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ConsultationPayload>(defaultForm);

  const loadData = async () => {
    const [consultationResponse, pharmacyResponse] = await Promise.all([listConsultations(), listPharmacyData()]);
    setDrugs(pharmacyResponse.drugs);
    setPendingVisits(consultationResponse.pending_visits);
    setConsultations(consultationResponse.consultations);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [consultationResponse, pharmacyResponse] = await Promise.all([listConsultations(), listPharmacyData()]);
        if (!mounted) return;

        setDrugs(pharmacyResponse.drugs);
        setPendingVisits(consultationResponse.pending_visits);
        setConsultations(consultationResponse.consultations);
      } catch (error) {
        if (!mounted) return;

        toast({
          title: "Unable to load consultations",
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

  const filteredConsultations = useMemo(
    () =>
      consultations.filter((consultation) =>
        `${consultation.patient_name ?? ""} ${consultation.doctor_name ?? ""} ${consultation.diagnosis}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [consultations, search]
  );

  const handleSelectVisit = (value: string) => {
    const selected = pendingVisits.find((visit) => String(visit.id) === value);
    if (!selected) return;

    setForm((current) => ({
      ...current,
      visit_id: Number(selected.id),
      patient_id: Number(selected.patient_id),
      presenting_complaint: selected.complaint || current.presenting_complaint,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createConsultation(form);
      await loadData();
      setForm(defaultForm);
      setOpen(false);
      toast({
        title: "Consultation saved",
        description: "The patient has been handed off to billing and records.",
      });
    } catch (error) {
      toast({
        title: "Unable to save consultation",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePrescription = (index: number, field: keyof NonNullable<ConsultationPayload["prescriptions"]>[number], value: string | number | null) => {
    setForm((current) => ({
      ...current,
      prescriptions: (current.prescriptions || []).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const updateLabOrder = (index: number, field: keyof NonNullable<ConsultationPayload["lab_orders"]>[number], value: string) => {
    setForm((current) => ({
      ...current,
      lab_orders: (current.lab_orders || []).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  return (
    <div className="module-container">
      <PageHeader title="Consultations" description="Doctor review, diagnosis, and handoff into billing and records.">
        {can("consultations.create") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Consultation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Consultation</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label>Patient Queue *</Label>
                  <select
                    value={form.visit_id ? String(form.visit_id) : ""}
                    onChange={(event) => handleSelectVisit(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value="">Select patient ready for consultation</option>
                    {pendingVisits.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {visit.hospital_number} - {visit.patient_name} - queue #{visit.queue_number || "-"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Presenting Complaint *</Label>
                  <Textarea
                    value={form.presenting_complaint}
                    onChange={(event) => setForm((current) => ({ ...current, presenting_complaint: event.target.value }))}
                    placeholder="Chief complaint and clinical summary"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label>History of Present Illness</Label>
                  <Textarea
                    value={form.history_of_present_illness || ""}
                    onChange={(event) => setForm((current) => ({ ...current, history_of_present_illness: event.target.value }))}
                    placeholder="Detailed history"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Examination Findings</Label>
                  <Textarea
                    value={form.examination_findings || ""}
                    onChange={(event) => setForm((current) => ({ ...current, examination_findings: event.target.value }))}
                    placeholder="Physical examination findings"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Diagnosis *</Label>
                    <Input
                      value={form.diagnosis}
                      onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))}
                      placeholder="e.g. Uncomplicated malaria"
                      required
                    />
                  </div>
                  <div>
                    <Label>ICD Code</Label>
                    <Input
                      value={form.icd_code || ""}
                      onChange={(event) => setForm((current) => ({ ...current, icd_code: event.target.value }))}
                      placeholder="e.g. B50.9"
                    />
                  </div>
                </div>
                <div>
                  <Label>Treatment Plan</Label>
                  <Textarea
                    value={form.treatment_plan || ""}
                    onChange={(event) => setForm((current) => ({ ...current, treatment_plan: event.target.value }))}
                    placeholder="Medication, lab requests, follow-up, or admission notes"
                    rows={3}
                  />
                </div>
                {(can("pharmacy.prescribe") || can("laboratory.create_order")) && (
                  <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Orders From This Consultation</p>
                        <p className="text-xs text-muted-foreground">Create prescriptions and lab requests while closing the encounter.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {can("pharmacy.prescribe") && (
                          <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, prescriptions: [...(current.prescriptions || []), { ...defaultPrescription }] }))}>
                            Add Prescription
                          </Button>
                        )}
                        {can("laboratory.create_order") && (
                          <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, lab_orders: [...(current.lab_orders || []), { ...defaultLabOrder }] }))}>
                            Add Lab Order
                          </Button>
                        )}
                      </div>
                    </div>

                    {(form.prescriptions || []).map((prescription, index) => (
                      <div key={`rx-${index}`} className="space-y-3 rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prescription {index + 1}</p>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, prescriptions: (current.prescriptions || []).filter((_, itemIndex) => itemIndex !== index) }))}>
                            Remove
                          </Button>
                        </div>
                        <div>
                          <Label>Stocked Drug</Label>
                          <select
                            value={prescription.drug_id ? String(prescription.drug_id) : ""}
                            onChange={(event) => {
                              const selectedDrug = drugs.find((drug) => String(drug.id) === event.target.value);
                              setForm((current) => ({
                                ...current,
                                prescriptions: (current.prescriptions || []).map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, drug_id: event.target.value ? Number(event.target.value) : null, drug_name: selectedDrug?.name || item.drug_name }
                                    : item
                                ),
                              }));
                            }}
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select stocked drug</option>
                            {drugs.map((drug) => (
                              <option key={drug.id} value={drug.id}>
                                {drug.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><Label>Drug Name</Label><Input value={prescription.drug_name} onChange={(event) => updatePrescription(index, "drug_name", event.target.value)} /></div>
                          <div><Label>Quantity</Label><Input type="number" min="1" value={prescription.quantity} onChange={(event) => updatePrescription(index, "quantity", Number(event.target.value))} /></div>
                          <div><Label>Dosage</Label><Input value={prescription.dosage} onChange={(event) => updatePrescription(index, "dosage", event.target.value)} /></div>
                          <div><Label>Frequency</Label><Input value={prescription.frequency} onChange={(event) => updatePrescription(index, "frequency", event.target.value)} /></div>
                          <div><Label>Duration</Label><Input value={prescription.duration} onChange={(event) => updatePrescription(index, "duration", event.target.value)} /></div>
                          <div><Label>Instructions</Label><Input value={prescription.instructions || ""} onChange={(event) => updatePrescription(index, "instructions", event.target.value)} /></div>
                        </div>
                      </div>
                    ))}

                    {(form.lab_orders || []).map((labOrder, index) => (
                      <div key={`lab-${index}`} className="space-y-3 rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lab Order {index + 1}</p>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, lab_orders: (current.lab_orders || []).filter((_, itemIndex) => itemIndex !== index) }))}>
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><Label>Test Name</Label><Input value={labOrder.test_name} onChange={(event) => updateLabOrder(index, "test_name", event.target.value)} /></div>
                          <div><Label>Category</Label><Input value={labOrder.test_category} onChange={(event) => updateLabOrder(index, "test_category", event.target.value)} /></div>
                          <div>
                            <Label>Priority</Label>
                            <select value={labOrder.priority} onChange={(event) => updateLabOrder(index, "priority", event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option value="routine">Routine</option>
                              <option value="urgent">Urgent</option>
                              <option value="stat">STAT</option>
                            </select>
                          </div>
                          <div><Label>Sample Type</Label><Input value={labOrder.sample_type || ""} onChange={(event) => updateLabOrder(index, "sample_type", event.target.value)} /></div>
                        </div>
                        <div><Label>Clinical Notes</Label><Textarea rows={2} value={labOrder.clinical_notes || ""} onChange={(event) => updateLabOrder(index, "clinical_notes", event.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={form.notes || ""}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Any other clinical notes"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !form.visit_id || !form.patient_id}>
                    {saving ? "Saving..." : "Save Consultation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <QueueCard title="Ready For Doctor" value={pendingVisits.length} description="Patients waiting after triage." />
        <QueueCard title="Completed Consultations" value={consultations.length} description="Saved clinical encounters in this scope." />
        <QueueCard title="Role Policy" value={can("consultations.create") ? "Write access" : "View only"} description="Only doctors and approved clinical leads can save diagnosis." />
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search consultations..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Date", "Patient", "Doctor", "Complaint", "Diagnosis", "Status", ""].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredConsultations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No consultations found yet.
                  </td>
                </tr>
              )}
              {filteredConsultations.map((consultation) => (
                <tr key={consultation.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs">{consultation.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{consultation.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{consultation.hospital_number}</p>
                  </td>
                  <td className="px-4 py-3">{consultation.doctor_name}</td>
                  <td className="max-w-[220px] truncate px-4 py-3">{consultation.presenting_complaint}</td>
                  <td className="px-4 py-3 font-medium">{consultation.diagnosis}</td>
                  <td className="px-4 py-3">
                    <Badge variant={consultation.status === "completed" ? "default" : "secondary"}>
                      {consultation.status.replace("_", " ")}
                    </Badge>
                    {(consultation.prescription_count || consultation.lab_order_count) ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(consultation.prescription_count || 0) > 0 ? <Badge variant="outline" className="text-[10px]">{consultation.prescription_count} Rx</Badge> : null}
                        {(consultation.lab_order_count || 0) > 0 ? <Badge variant="outline" className="text-[10px]">{consultation.lab_order_count} Lab</Badge> : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedConsultation(consultation)}>
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <Dialog open={!!selectedConsultation} onOpenChange={(nextOpen) => !nextOpen && setSelectedConsultation(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Summary</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Patient" value={selectedConsultation.patient_name || "-"} />
                <DetailItem label="Hospital Number" value={selectedConsultation.hospital_number || "-"} />
                <DetailItem label="Doctor" value={selectedConsultation.doctor_name || "-"} />
                <DetailItem label="Date" value={selectedConsultation.created_at?.slice(0, 10) || "-"} />
              </div>
              <DetailBlock label="Presenting Complaint" value={selectedConsultation.presenting_complaint} />
              <DetailBlock label="History of Present Illness" value={selectedConsultation.history_of_present_illness || "-"} />
              <DetailBlock label="Examination Findings" value={selectedConsultation.examination_findings || "-"} />
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Diagnosis" value={selectedConsultation.diagnosis} />
                <DetailItem label="ICD Code" value={selectedConsultation.icd_code || "-"} />
              </div>
              <DetailBlock label="Treatment Plan" value={selectedConsultation.treatment_plan || "-"} />
              <DetailBlock label="Additional Notes" value={selectedConsultation.notes || "-"} />
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Prescriptions Created" value={String(selectedConsultation.prescription_count || 0)} />
                <DetailItem label="Lab Orders Created" value={String(selectedConsultation.lab_order_count || 0)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueueCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
