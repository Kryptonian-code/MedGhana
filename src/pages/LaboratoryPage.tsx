import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FlaskConical } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { createLabOrder, listLabOrders, updateLabOrderStatus, type LabOrderPayload } from "@/lib/laboratoryApi";
import { listPatients } from "@/lib/patientsApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { LabOrder, Patient } from "@/types";

const statusStyle: Record<string, string> = {
  ordered: "bg-muted text-muted-foreground",
  sample_collected: "bg-info/10 text-info border-info/20",
  processing: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const defaultForm: LabOrderPayload = {
  patient_id: 0,
  test_name: "",
  test_category: "",
  priority: "routine",
  sample_type: "",
  clinical_notes: "",
};

export default function LaboratoryPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState<LabOrderPayload>(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [ordersResponse, patientsResponse] = await Promise.all([listLabOrders(), listPatients()]);
    setOrders(ordersResponse.lab_orders);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const [ordersResponse, patientsResponse] = await Promise.all([listLabOrders(), listPatients()]);
        if (!mounted) return;
        setOrders(ordersResponse.lab_orders);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: "Unable to load laboratory data",
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

  const filtered = useMemo(
    () => orders.filter((order) => `${order.patient_name ?? ""} ${order.test_name} ${order.status}`.toLowerCase().includes(search.toLowerCase())),
    [orders, search]
  );

  const handleCreateOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createLabOrder(form);
      await loadData();
      setForm(defaultForm);
      setOpen(false);
      toast({ title: "Lab order created", description: "The laboratory queue has been updated." });
    } catch (error) {
      toast({
        title: "Unable to create lab order",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order: LabOrder, status: string) => {
    const results = status === "completed" ? window.prompt("Enter result summary", order.results || "") : undefined;
    const notes = status === "completed" ? window.prompt("Enter result notes", order.result_notes || "") : undefined;

    try {
      await updateLabOrderStatus(order.id, status, results || undefined, notes || undefined);
      await loadData();
      toast({ title: "Lab order updated", description: `${order.test_name} is now ${status.replace("_", " ")}.` });
    } catch (error) {
      toast({
        title: "Unable to update lab order",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Laboratory" description="Lab orders, sample tracking, and results workflow.">
        {can("laboratory.create_order") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Lab Order</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Lab Order</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateOrder}>
                <div>
                  <Label>Patient *</Label>
                  <select
                    value={form.patient_id ? String(form.patient_id) : ""}
                    onChange={(e) => setForm((current) => ({ ...current, patient_id: Number(e.target.value) }))}
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
                  <div className="col-span-2"><Label>Test *</Label><Input value={form.test_name} onChange={(e) => setForm((current) => ({ ...current, test_name: e.target.value }))} required /></div>
                  <div><Label>Category *</Label><Input value={form.test_category} onChange={(e) => setForm((current) => ({ ...current, test_category: e.target.value }))} required /></div>
                  <div>
                    <Label>Priority</Label>
                    <select value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as LabOrderPayload["priority"] }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                  <div className="col-span-2"><Label>Sample Type</Label><Input value={form.sample_type || ""} onChange={(e) => setForm((current) => ({ ...current, sample_type: e.target.value }))} /></div>
                </div>
                <div><Label>Clinical Notes</Label><Textarea value={form.clinical_notes || ""} onChange={(e) => setForm((current) => ({ ...current, clinical_notes: e.target.value }))} rows={3} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving || !form.patient_id}>{saving ? "Saving..." : "Submit Order"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard title="Total Orders" value={orders.length} icon={FlaskConical} />
        <StatCard title="Pending" value={orders.filter((order) => order.status !== "completed").length} icon={FlaskConical} iconColor="bg-warning/10" />
        <StatCard title="Completed" value={orders.filter((order) => order.status === "completed").length} icon={FlaskConical} iconColor="bg-success/10" />
        <StatCard title="Urgent" value={orders.filter((order) => order.priority === "urgent").length} icon={FlaskConical} iconColor="bg-destructive/10" />
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lab orders..." className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {["Date", "Patient", "Test", "Category", "Priority", "Status", "Result", "Action"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs">{order.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium">{order.patient_name}</td>
                  <td className="px-4 py-3">{order.test_name}</td>
                  <td className="px-4 py-3 text-xs">{order.test_category}</td>
                  <td className="px-4 py-3"><Badge variant={order.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">{order.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusStyle[order.status] || ""}>{order.status.replace("_", " ")}</Badge></td>
                  <td className="max-w-[220px] px-4 py-3 text-xs">{order.results || "-"}</td>
                  <td className="px-4 py-3">
                    {can("laboratory.update_order") ? (
                      <div className="flex flex-wrap gap-2">
                        {order.status === "ordered" && <Button size="sm" variant="outline" onClick={() => handleStatusChange(order, "sample_collected")}>Collect</Button>}
                        {order.status === "sample_collected" && <Button size="sm" variant="outline" onClick={() => handleStatusChange(order, "processing")}>Process</Button>}
                        {["ordered", "sample_collected", "processing"].includes(order.status) && <Button size="sm" onClick={() => handleStatusChange(order, "completed")}>Complete</Button>}
                      </div>
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
