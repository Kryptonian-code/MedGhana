import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createPatient, listPatients } from "@/lib/patientsApi";
import type { CreatePatientPayload } from "@/lib/patientsApi";
import type { Patient } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { digitsOnly, ghanaRegions } from "@/lib/ghana";
import { ApiError } from "@/lib/api";

export default function PatientsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      try {
        const response = await listPatients();
        if (isMounted) {
          setPatients(response.patients);
        }
      } catch (error) {
        toast({
          title: "Unable to load patients",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = patients.filter((patient) =>
    `${patient.first_name} ${patient.last_name} ${patient.hospital_number} ${patient.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const handlePatientCreated = (patient: Patient) => {
    setPatients((current) => [patient, ...current]);
    setRegisterOpen(false);
    toast({
      title: "Patient registered",
      description: `${patient.first_name} ${patient.last_name} has been added successfully.`,
    });
  };

  const handleExport = () => {
    if (patients.length === 0) {
      toast({
        title: "No patient data to export",
        description: "Register at least one patient before exporting.",
      });
      return;
    }

    const headers = ["Hospital Number", "First Name", "Last Name", "Gender", "Phone", "Town", "Region", "Insurance"];
    const rows = patients.map((patient) => [
      patient.hospital_number,
      patient.first_name,
      patient.last_name,
      patient.gender,
      patient.phone,
      patient.town || "",
      patient.region || "",
      patient.insurance_type || "none",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medghana-patients.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="module-container">
      <PageHeader title="Patients" description="Manage patient records and registration">
        {can("patients.create") && (
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Register Patient</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
              </DialogHeader>
              <PatientForm onClose={() => setRegisterOpen(false)} onCreated={handlePatientCreated} />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <DataTableShell>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-muted/60 rounded-lg px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0" />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hospital #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gender</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Town</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Insurance</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blood</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No patients found yet.
                  </td>
                </tr>
              )}
              {filtered.map((patient) => (
                <tr key={patient.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{patient.hospital_number}</td>
                  <td className="px-4 py-3 font-medium">{patient.first_name} {patient.last_name}</td>
                  <td className="px-4 py-3 capitalize">{patient.gender}</td>
                  <td className="px-4 py-3">{patient.phone}</td>
                  <td className="px-4 py-3">{patient.town}</td>
                  <td className="px-4 py-3">
                    <Badge variant={patient.insurance_type === "nhis" ? "default" : patient.insurance_type === "private" ? "secondary" : "outline"} className="text-[10px]">
                      {patient.insurance_type === "nhis" ? "NHIS" : patient.insurance_type === "private" ? "Private" : "None"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{patient.blood_group || "-"}</td>
                  <td className="px-4 py-3">
                    {can("patients.view") ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/patients/${patient.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t border-border">
          <span>{loading ? "Loading patients..." : `Showing ${filtered.length} of ${patients.length} patients`}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </DataTableShell>
    </div>
  );
}

const defaultForm: CreatePatientPayload = {
  first_name: "",
  last_name: "",
  other_names: "",
  gender: "male",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  town: "",
  region: "",
  national_id_type: "",
  national_id_number: "",
  nhis_number: "",
  nhis_expiry: "",
  insurance_type: "none",
  blood_group: "",
  genotype: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  next_of_kin_name: "",
  next_of_kin_phone: "",
  next_of_kin_relationship: "",
};

function PatientForm({ onClose, onCreated }: { onClose: () => void; onCreated: (patient: Patient) => void }) {
  const [form, setForm] = useState<CreatePatientPayload>(defaultForm);
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof CreatePatientPayload>(key: K, value: CreatePatientPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await createPatient(form);
      onCreated(response.patient);
      setForm(defaultForm);
    } catch (error) {
      const duplicatePatient =
        error instanceof ApiError && typeof error.payload === "object" && error.payload && "existing_patient" in error.payload
          ? (error.payload as { existing_patient?: { hospital_number?: string; first_name?: string; last_name?: string } }).existing_patient
          : null;

      toast({
        title: error instanceof ApiError && error.status === 409 ? "Duplicate patient detected" : "Registration failed",
        description: duplicatePatient
          ? `${error.message} Review the existing patient record before creating another one.`
          : error instanceof Error
            ? error.message
            : "Unable to save patient.",
        variant: error instanceof ApiError && error.status === 409 ? "default" : "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="e.g. Kwame" required /></div>
        <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="e.g. Asante" required /></div>
        <div><Label>Other Names</Label><Input value={form.other_names || ""} onChange={(e) => updateField("other_names", e.target.value)} placeholder="Middle name" /></div>
        <div>
          <Label>Gender *</Label>
          <Select value={form.gender} onValueChange={(value: "male" | "female") => updateField("gender", value)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Date of Birth *</Label><Input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} required /></div>
        <div><Label>Phone *</Label><Input inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => updateField("phone", digitsOnly(e.target.value))} placeholder="0244XXXXXXX" required /></div>
        <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => updateField("email", e.target.value)} placeholder="email@example.com" /></div>
        <div>
          <Label>Region</Label>
          <Select value={form.region || ""} onValueChange={(value) => updateField("region", value)}><SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>{ghanaRegions.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Town</Label><Input value={form.town || ""} onChange={(e) => updateField("town", e.target.value)} placeholder="e.g. Kumasi" /></div>
        <div><Label>Address</Label><Input value={form.address || ""} onChange={(e) => updateField("address", e.target.value)} placeholder="House/Street address" /></div>
        <div>
          <Label>ID Type</Label>
          <Select value={form.national_id_type || ""} onValueChange={(value) => updateField("national_id_type", value)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ghana_card">Ghana Card</SelectItem>
              <SelectItem value="voter_id">Voter ID</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="nhis_card">NHIS Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>ID Number</Label><Input value={form.national_id_number || ""} onChange={(e) => updateField("national_id_number", e.target.value)} placeholder="ID number" /></div>
        <div><Label>NHIS Number</Label><Input value={form.nhis_number || ""} onChange={(e) => updateField("nhis_number", e.target.value)} placeholder="GHA-XXXXXXXXX" /></div>
        <div><Label>NHIS Expiry</Label><Input type="date" value={form.nhis_expiry || ""} onChange={(e) => updateField("nhis_expiry", e.target.value)} /></div>
        <div>
          <Label>Insurance Type</Label>
          <Select value={form.insurance_type || "none"} onValueChange={(value: "nhis" | "private" | "none") => updateField("insurance_type", value)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="nhis">NHIS</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Blood Group</Label>
          <Select value={form.blood_group || ""} onValueChange={(value) => updateField("blood_group", value)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((blood) => <SelectItem key={blood} value={blood}>{blood}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Genotype</Label>
          <Select value={form.genotype || ""} onValueChange={(value) => updateField("genotype", value)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["AA","AS","SS","AC","SC"].map((genotype) => <SelectItem key={genotype} value={genotype}>{genotype}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold mb-3">Emergency Contact</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Contact Name</Label><Input value={form.emergency_contact_name || ""} onChange={(e) => updateField("emergency_contact_name", e.target.value)} placeholder="Full name" /></div>
          <div><Label>Contact Phone</Label><Input inputMode="numeric" pattern="[0-9]*" value={form.emergency_contact_phone || ""} onChange={(e) => updateField("emergency_contact_phone", digitsOnly(e.target.value))} placeholder="Phone number" /></div>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="mb-3 text-sm font-semibold">Next of Kin</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><Label>Full Name</Label><Input value={form.next_of_kin_name || ""} onChange={(e) => updateField("next_of_kin_name", e.target.value)} placeholder="Next of kin name" /></div>
          <div><Label>Phone</Label><Input inputMode="numeric" pattern="[0-9]*" value={form.next_of_kin_phone || ""} onChange={(e) => updateField("next_of_kin_phone", digitsOnly(e.target.value))} placeholder="Phone number" /></div>
          <div><Label>Relationship</Label><Input value={form.next_of_kin_relationship || ""} onChange={(e) => updateField("next_of_kin_relationship", e.target.value)} placeholder="e.g. Sister" /></div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Register Patient"}</Button>
      </div>
    </form>
  );
}
