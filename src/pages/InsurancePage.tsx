import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClaim, listClaims, updateClaimStatus, type ClaimPayload, type ClaimableInvoice, type InsuranceClaim } from "@/lib/insuranceApi";
import { listPatients } from "@/lib/patientsApi";
import type { Patient } from "@/types";

const statusStyle: Record<string, string> = {
  submitted: "bg-info/10 text-info border-info/20",
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  draft: "bg-muted text-muted-foreground",
};

const defaultForm: ClaimPayload = {
  patient_id: 0,
  nhis_number: "",
  service_description: "",
  amount: 0,
  claim_date: "",
  notes: "",
};

export default function InsurancePage() {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [claimableInvoices, setClaimableInvoices] = useState<ClaimableInvoice[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ClaimPayload>(defaultForm);

  const loadData = async () => {
    const [claimsResponse, patientsResponse] = await Promise.all([listClaims(), listPatients()]);
    setClaims(claimsResponse.claims);
    setClaimableInvoices(claimsResponse.claimable_invoices);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const [claimsResponse, patientsResponse] = await Promise.all([listClaims(), listPatients()]);
        if (!mounted) return;
        setClaims(claimsResponse.claims);
        setClaimableInvoices(claimsResponse.claimable_invoices);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load claims",
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

  const stats = useMemo(
    () => ({
      total: claims.length,
      approved: claims.filter((claim) => claim.status === "approved").length,
      pending: claims.filter((claim) => claim.status === "pending" || claim.status === "submitted").length,
      totalAmount: claims.reduce((sum, claim) => sum + Number(claim.amount), 0),
    }),
    [claims]
  );

  const handleCreateClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createClaim(form);
      await loadData();
      setOpen(false);
      setForm(defaultForm);
      toast({ title: "Claim submitted", description: "The insurance queue has been updated." });
    } catch (error) {
      toast({
        title: "Unable to submit claim",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (claim: InsuranceClaim, status: "approved" | "pending" | "rejected") => {
    try {
      await updateClaimStatus(claim.id, status);
      await loadData();
      toast({ title: "Claim updated", description: `${claim.patient_name}'s claim is now ${status}.` });
    } catch (error) {
      toast({
        title: "Unable to update claim",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePatientChange = (patientId: number) => {
    const patient = patients.find((item) => Number(item.id) === patientId);
    setForm((current) => ({
      ...current,
      patient_id: patientId,
      nhis_number: patient?.nhis_number || current.nhis_number,
    }));
  };

  const handleInvoicePrefill = (invoiceId: string) => {
    const invoice = claimableInvoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      return;
    }

    setForm((current) => ({
      ...current,
      patient_id: Number(invoice.patient_id),
      invoice_id: Number(invoice.id),
      nhis_number: invoice.nhis_number || current.nhis_number,
      amount: Number(invoice.total_amount),
      service_description: current.service_description || `NHIS claim for invoice ${invoice.invoice_number}`,
    }));
  };

  return (
    <div className="module-container">
      <PageHeader title="NHIS / Insurance" description="Claims intake, review, and reimbursement tracking.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Submit Claim</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Submit Insurance Claim</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateClaim}>
              {claimableInvoices.length > 0 && (
                <div>
                  <Label>Reuse Existing Invoice</Label>
                  <select
                    value={form.invoice_id ? String(form.invoice_id) : ""}
                    onChange={(e) => handleInvoicePrefill(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select invoice</option>
                    {claimableInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {invoice.patient_name} - GHS {Number(invoice.total_amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">Selecting an invoice reuses the patient, NHIS number, and amount.</p>
                </div>
              )}
              <div>
                <Label>Patient</Label>
                <select
                  value={form.patient_id ? String(form.patient_id) : ""}
                  onChange={(e) => handlePatientChange(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.hospital_number} - {patient.first_name} {patient.last_name}</option>
                  ))}
                </select>
              </div>
              <div><Label>NHIS Number</Label><Input value={form.nhis_number || ""} onChange={(e) => setForm((current) => ({ ...current, nhis_number: e.target.value }))} /></div>
              <div><Label>Service Description</Label><Input value={form.service_description} onChange={(e) => setForm((current) => ({ ...current, service_description: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (GHS)</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: Number(e.target.value) }))} required /></div>
                <div><Label>Claim Date</Label><Input type="date" value={form.claim_date} onChange={(e) => setForm((current) => ({ ...current, claim_date: e.target.value }))} required /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes || ""} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.patient_id}>{saving ? "Saving..." : "Submit Claim"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Claims" value={stats.total} icon={Shield} />
        <StatCard title="Approved" value={stats.approved} icon={Shield} iconColor="bg-success/10" />
        <StatCard title="Pending" value={stats.pending} icon={Shield} iconColor="bg-warning/10" />
        <StatCard title="Total Amount" value={`GHS ${stats.totalAmount.toLocaleString()}`} icon={Shield} iconColor="bg-info/10" />
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {["Date", "Patient", "NHIS #", "Service", "Amount (GHS)", "Status", "Actions"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
            </tr></thead>
            <tbody>
              {!loading && claims.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No insurance claims have been submitted yet.
                  </td>
                </tr>
              )}
              {claims.map((claim) => (
                <tr key={claim.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs">{claim.claim_date}</td>
                  <td className="px-4 py-3 font-medium">{claim.patient_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{claim.nhis_number || "-"}</td>
                  <td className="px-4 py-3">{claim.service_description}</td>
                  <td className="px-4 py-3 font-medium">{Number(claim.amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusStyle[claim.status]}>{claim.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(claim, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(claim, "pending")}>Pending</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(claim, "rejected")}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
