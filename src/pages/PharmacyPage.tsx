import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, AlertTriangle, Pill, Plus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { createDrug, createPrescription, dispensePrescription, listPharmacyData, type DrugPayload, type PrescriptionPayload } from "@/lib/pharmacyApi";
import { listPatients } from "@/lib/patientsApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { Drug, Patient, Prescription } from "@/types";

const defaultPrescription: PrescriptionPayload = {
  patient_id: 0,
  drug_id: null,
  drug_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  quantity: 1,
  instructions: "",
};

const defaultDrug: DrugPayload = {
  name: "",
  generic_name: "",
  category: "",
  dosage_form: "",
  strength: "",
  unit_price: 0,
  stock_quantity: 0,
  reorder_level: 0,
  expiry_date: "",
  batch_number: "",
  supplier: "",
};

export default function PharmacyPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"drugs" | "prescriptions">("prescriptions");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [drugOpen, setDrugOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionPayload>(defaultPrescription);
  const [drugForm, setDrugForm] = useState<DrugPayload>(defaultDrug);

  const loadData = async () => {
    const [pharmacyResponse, patientsResponse] = await Promise.all([listPharmacyData(), listPatients()]);
    setDrugs(pharmacyResponse.drugs);
    setPrescriptions(pharmacyResponse.prescriptions);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [pharmacyResponse, patientsResponse] = await Promise.all([listPharmacyData(), listPatients()]);
        if (!mounted) return;
        setDrugs(pharmacyResponse.drugs);
        setPrescriptions(pharmacyResponse.prescriptions);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: "Unable to load pharmacy data",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const lowStock = drugs.filter((drug) => drug.stock_quantity <= drug.reorder_level);
  const filteredDrugs = useMemo(
    () => drugs.filter((drug) => `${drug.name} ${drug.category}`.toLowerCase().includes(search.toLowerCase())),
    [drugs, search]
  );
  const filteredPrescriptions = useMemo(
    () =>
      prescriptions.filter((prescription) =>
        `${prescription.patient_name ?? ""} ${prescription.drug_name} ${prescription.doctor_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [prescriptions, search]
  );

  const handleCreatePrescription = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createPrescription(prescriptionForm);
      await loadData();
      setPrescriptionForm(defaultPrescription);
      setPrescriptionOpen(false);
      toast({ title: "Prescription created", description: "The pharmacy queue has been updated." });
    } catch (error) {
      toast({
        title: "Unable to create prescription",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDrug = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createDrug(drugForm);
      await loadData();
      setDrugForm(defaultDrug);
      setDrugOpen(false);
      toast({ title: "Drug added", description: "Inventory has been updated." });
    } catch (error) {
      toast({
        title: "Unable to add drug",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDispense = async (id: string) => {
    try {
      await dispensePrescription(id);
      await loadData();
      toast({ title: "Prescription dispensed", description: "Stock and records have been updated." });
    } catch (error) {
      toast({
        title: "Unable to dispense prescription",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Pharmacy" description="Prescription queue, dispensing, and drug inventory.">
        <div className="flex gap-2">
          {can("pharmacy.prescribe") && (
            <Dialog open={prescriptionOpen} onOpenChange={setPrescriptionOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Prescription</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Prescription</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={handleCreatePrescription}>
                  <div>
                    <Label>Patient *</Label>
                    <select
                      value={prescriptionForm.patient_id ? String(prescriptionForm.patient_id) : ""}
                      onChange={(e) => setPrescriptionForm((current) => ({ ...current, patient_id: Number(e.target.value) }))}
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
                  <div>
                    <Label>Drug *</Label>
                    <select
                      value={prescriptionForm.drug_id ? String(prescriptionForm.drug_id) : ""}
                      onChange={(e) => {
                        const drug = drugs.find((item) => item.id === e.target.value);
                        setPrescriptionForm((current) => ({
                          ...current,
                          drug_id: e.target.value ? Number(e.target.value) : null,
                          drug_name: drug?.name || current.drug_name,
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select stocked drug</option>
                      {drugs.map((drug) => (
                        <option key={drug.id} value={drug.id}>{drug.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Drug Name *</Label>
                    <Input value={prescriptionForm.drug_name} onChange={(e) => setPrescriptionForm((current) => ({ ...current, drug_name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Dosage *</Label><Input value={prescriptionForm.dosage} onChange={(e) => setPrescriptionForm((current) => ({ ...current, dosage: e.target.value }))} required /></div>
                    <div><Label>Frequency *</Label><Input value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm((current) => ({ ...current, frequency: e.target.value }))} required /></div>
                    <div><Label>Duration *</Label><Input value={prescriptionForm.duration} onChange={(e) => setPrescriptionForm((current) => ({ ...current, duration: e.target.value }))} required /></div>
                    <div><Label>Quantity *</Label><Input type="number" min="1" value={prescriptionForm.quantity} onChange={(e) => setPrescriptionForm((current) => ({ ...current, quantity: Number(e.target.value) }))} required /></div>
                  </div>
                  <div><Label>Instructions</Label><Input value={prescriptionForm.instructions || ""} onChange={(e) => setPrescriptionForm((current) => ({ ...current, instructions: e.target.value }))} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setPrescriptionOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving || !prescriptionForm.patient_id}>{saving ? "Saving..." : "Save Prescription"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {can("pharmacy.manage_inventory") && (
            <Dialog open={drugOpen} onOpenChange={setDrugOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Add Drug</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Drug</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={handleCreateDrug}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Name *</Label><Input value={drugForm.name} onChange={(e) => setDrugForm((current) => ({ ...current, name: e.target.value }))} required /></div>
                    <div><Label>Generic Name</Label><Input value={drugForm.generic_name || ""} onChange={(e) => setDrugForm((current) => ({ ...current, generic_name: e.target.value }))} /></div>
                    <div><Label>Category *</Label><Input value={drugForm.category} onChange={(e) => setDrugForm((current) => ({ ...current, category: e.target.value }))} required /></div>
                    <div><Label>Dosage Form *</Label><Input value={drugForm.dosage_form} onChange={(e) => setDrugForm((current) => ({ ...current, dosage_form: e.target.value }))} required /></div>
                    <div><Label>Strength</Label><Input value={drugForm.strength || ""} onChange={(e) => setDrugForm((current) => ({ ...current, strength: e.target.value }))} /></div>
                    <div><Label>Unit Price</Label><Input type="number" min="0" step="0.01" value={drugForm.unit_price} onChange={(e) => setDrugForm((current) => ({ ...current, unit_price: Number(e.target.value) }))} /></div>
                    <div><Label>Stock Quantity</Label><Input type="number" min="0" value={drugForm.stock_quantity} onChange={(e) => setDrugForm((current) => ({ ...current, stock_quantity: Number(e.target.value) }))} /></div>
                    <div><Label>Reorder Level</Label><Input type="number" min="0" value={drugForm.reorder_level} onChange={(e) => setDrugForm((current) => ({ ...current, reorder_level: Number(e.target.value) }))} /></div>
                    <div><Label>Expiry Date</Label><Input type="date" value={drugForm.expiry_date || ""} onChange={(e) => setDrugForm((current) => ({ ...current, expiry_date: e.target.value }))} /></div>
                    <div><Label>Batch Number</Label><Input value={drugForm.batch_number || ""} onChange={(e) => setDrugForm((current) => ({ ...current, batch_number: e.target.value }))} /></div>
                    <div className="col-span-2"><Label>Supplier</Label><Input value={drugForm.supplier || ""} onChange={(e) => setDrugForm((current) => ({ ...current, supplier: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDrugOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Drug"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard title="Total Drugs" value={drugs.length} icon={Pill} />
        <StatCard title="Low Stock" value={lowStock.length} change="Needs restocking" changeType="negative" icon={AlertTriangle} iconColor="bg-warning/10" />
        <StatCard title="Pending Rx" value={prescriptions.filter((p) => p.status === "pending").length} icon={Pill} iconColor="bg-info/10" />
        <StatCard title="Dispensed" value={prescriptions.filter((p) => p.status === "dispensed").length} icon={Pill} iconColor="bg-success/10" />
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "prescriptions" ? "default" : "outline"} size="sm" onClick={() => setTab("prescriptions")}>Prescriptions</Button>
        <Button variant={tab === "drugs" ? "default" : "outline"} size="sm" onClick={() => setTab("drugs")}>Drug Inventory</Button>
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </div>
        </div>

        {tab === "prescriptions" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                {["Patient", "Drug", "Dosage", "Doctor", "Status", "Action"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
              </tr></thead>
              <tbody>
                {filteredPrescriptions.map((prescription) => (
                  <tr key={prescription.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{prescription.patient_name}</td>
                    <td className="px-4 py-3">{prescription.drug_name}</td>
                    <td className="px-4 py-3 text-xs">{prescription.dosage}, {prescription.frequency}, {prescription.duration}</td>
                    <td className="px-4 py-3 text-xs">{prescription.doctor_name}</td>
                    <td className="px-4 py-3"><Badge variant={prescription.status === "dispensed" ? "default" : "secondary"}>{prescription.status}</Badge></td>
                    <td className="px-4 py-3">
                      {prescription.status === "pending" && can("pharmacy.dispense") ? (
                        <Button size="sm" onClick={() => handleDispense(prescription.id)}>Dispense</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{prescription.status === "dispensed" ? "Completed" : "View only"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                {["Drug Name", "Category", "Form", "Strength", "Stock", "Price (GHS)", "Expiry", "Status"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
              </tr></thead>
              <tbody>
                {filteredDrugs.map((drug) => (
                  <tr key={drug.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{drug.name}</td>
                    <td className="px-4 py-3 text-xs">{drug.category}</td>
                    <td className="px-4 py-3">{drug.dosage_form}</td>
                    <td className="px-4 py-3">{drug.strength || "-"}</td>
                    <td className="px-4 py-3 font-medium">{drug.stock_quantity}</td>
                    <td className="px-4 py-3">{drug.unit_price}</td>
                    <td className="px-4 py-3 text-xs">{drug.expiry_date || "-"}</td>
                    <td className="px-4 py-3">
                      {drug.stock_quantity <= drug.reorder_level ? <Badge variant="destructive" className="text-[10px]">Low Stock</Badge> : <Badge variant="outline" className="text-[10px]">OK</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
