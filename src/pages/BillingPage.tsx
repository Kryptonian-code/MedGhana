import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { createInvoice, listInvoices, recordInvoicePayment, type BillableConsultation, type InvoicePayload } from "@/lib/billingApi";
import { listPatients } from "@/lib/patientsApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { Invoice, Patient } from "@/types";

const statusStyle: Record<string, string> = {
  paid: "bg-success/10 text-success border-success/20",
  partial: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
};

type InvoiceFormItem = InvoicePayload["items"][number];

const defaultInvoiceItem: InvoiceFormItem = {
  description: "",
  quantity: 1,
  unit_price: 0,
  category: "consultation",
};

const defaultInvoiceForm: InvoicePayload = {
  patient_id: 0,
  payment_method: "",
  paid_amount: 0,
  notes: "",
  items: [{ ...defaultInvoiceItem }],
};

export default function BillingPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billableConsultations, setBillableConsultations] = useState<BillableConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [invoiceForm, setInvoiceForm] = useState<InvoicePayload>(defaultInvoiceForm);

  const loadData = async () => {
    const [invoicesResponse, patientsResponse] = await Promise.all([listInvoices(), listPatients()]);
    setInvoices(invoicesResponse.invoices);
    setBillableConsultations(invoicesResponse.billable_consultations);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [invoicesResponse, patientsResponse] = await Promise.all([listInvoices(), listPatients()]);
        if (!mounted) return;

        setInvoices(invoicesResponse.invoices);
        setBillableConsultations(invoicesResponse.billable_consultations);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (!mounted) return;

        toast({
          title: "Unable to load billing data",
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

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        `${invoice.patient_name ?? ""} ${invoice.invoice_number} ${invoice.status}`.toLowerCase().includes(search.toLowerCase())
      ),
    [invoices, search]
  );

  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0);

  const updateInvoiceField = <K extends keyof InvoicePayload>(key: K, value: InvoicePayload[K]) => {
    setInvoiceForm((current) => ({ ...current, [key]: value }));
  };

  const updateItemField = <K extends keyof InvoiceFormItem>(index: number, key: K, value: InvoiceFormItem[K]) => {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const addInvoiceItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      items: [...current.items, { ...defaultInvoiceItem }],
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const invoicePreviewTotal = invoiceForm.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createInvoice(invoiceForm);
      await loadData();
      setOpen(false);
      setInvoiceForm(defaultInvoiceForm);
      toast({
        title: "Invoice created",
        description: "The patient invoice has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Unable to create invoice",
        description: error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectConsultation = (value: string) => {
    const selected = billableConsultations.find((consultation) => consultation.id === value);
    if (!selected) {
      return;
    }

    setInvoiceForm({
      patient_id: Number(selected.patient_id),
      visit_id: Number(selected.visit_id),
      payment_method: "",
      paid_amount: 0,
      notes: selected.treatment_plan || "",
      items: [
        {
          description: `Consultation billing for ${selected.diagnosis || "completed encounter"}`,
          quantity: 1,
          unit_price: 0,
          category: "consultation",
        },
      ],
    });
  };

  const startPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance > 0 ? String(invoice.balance) : "");
    setPaymentMethod(invoice.payment_method || "");
    setPaymentOpen(true);
  };

  const handleReceivePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInvoice) return;

    setSaving(true);

    try {
      await recordInvoicePayment(selectedInvoice.id, Number(paymentAmount), paymentMethod);
      await loadData();
      setPaymentOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      setPaymentMethod("");
      toast({
        title: "Payment recorded",
        description: "The invoice balance has been updated.",
      });
    } catch (error) {
      toast({
        title: "Unable to record payment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Billing" description="Create invoices, collect payments, and track outstanding balances.">
        {can("billing.create") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateInvoice}>
                {billableConsultations.length > 0 && (
                  <div>
                    <Label>Start From Completed Consultation</Label>
                    <Select onValueChange={handleSelectConsultation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Reuse a completed consultation" />
                      </SelectTrigger>
                      <SelectContent>
                        {billableConsultations.map((consultation) => (
                          <SelectItem key={consultation.id} value={consultation.id}>
                            {consultation.hospital_number} - {consultation.patient_name} - {consultation.diagnosis}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">Selecting a consultation reuses the patient, visit, diagnosis, and treatment notes.</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Patient *</Label>
                    <Select
                      value={invoiceForm.patient_id ? String(invoiceForm.patient_id) : ""}
                      onValueChange={(value) => updateInvoiceField("patient_id", Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.hospital_number} - {patient.first_name} {patient.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Initial Payment Method</Label>
                    <Select value={invoiceForm.payment_method || ""} onValueChange={(value) => updateInvoiceField("payment_method", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="momo">Mobile Money</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="nhis">NHIS / Insurance</SelectItem>
                          <SelectItem value="insurance">Private Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>

                <div>
                  <Label>Initial Amount Paid</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceForm.paid_amount ?? 0}
                    onChange={(event) => updateInvoiceField("paid_amount", Number(event.target.value))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Invoice Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {invoiceForm.items.map((item, index) => (
                    <div key={`${index}-${item.category}`} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr_auto]">
                      <Input
                        value={item.description}
                        onChange={(event) => updateItemField(index, "description", event.target.value)}
                        placeholder="Item description"
                        required
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateItemField(index, "quantity", Number(event.target.value))}
                        placeholder="Qty"
                        required
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(event) => updateItemField(index, "unit_price", Number(event.target.value))}
                        placeholder="Price"
                        required
                      />
                      <Select value={item.category} onValueChange={(value: InvoiceFormItem["category"]) => updateItemField(index, "category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="admission">Admission</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={invoiceForm.items.length === 1}
                        onClick={() => removeInvoiceItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={invoiceForm.notes || ""}
                    onChange={(event) => updateInvoiceField("notes", event.target.value)}
                    placeholder="Optional billing notes"
                  />
                </div>

                <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-4 text-sm">
                  Invoice total preview: <span className="font-semibold">GHS {invoicePreviewTotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !invoiceForm.patient_id}>
                    {saving ? "Saving..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleReceivePayment}>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{selectedInvoice?.invoice_number}</p>
              <p className="text-muted-foreground">{selectedInvoice?.patient_name}</p>
              <p className="mt-2">Outstanding: GHS {Number(selectedInvoice?.balance || 0).toLocaleString()}</p>
            </div>

            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="momo">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="nhis">NHIS / Insurance</SelectItem>
                  <SelectItem value="insurance">Private Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !paymentAmount}>
                {saving ? "Saving..." : "Apply Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-success">GHS {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-destructive">GHS {outstanding.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Access Policy</p>
          <p className="text-sm font-medium">{can("billing.receive_payment") ? "Payments allowed" : "Invoice review only"}</p>
        </div>
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Invoice #", "Patient", "Items", "Total", "Paid", "Balance", "Method", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No invoices found yet.
                  </td>
                </tr>
              )}

              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 font-medium">{invoice.patient_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{invoice.items.length} item(s)</td>
                  <td className="px-4 py-3 font-medium">{Number(invoice.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(invoice.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{Number(invoice.balance).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{invoice.payment_method || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusStyle[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {can("billing.receive_payment") && invoice.balance > 0 ? (
                      <Button variant="outline" size="sm" onClick={() => startPayment(invoice)}>
                        Receive Payment
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">View only</span>
                    )}
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
