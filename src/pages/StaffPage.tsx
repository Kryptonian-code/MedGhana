import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/hooks/use-toast";
import { createStaff, listStaff, updateStaff, type CreateStaffPayload, type StaffMember } from "@/lib/staffApi";
import { digitsOnly } from "@/lib/ghana";

const roles: Array<CreateStaffPayload["role"]> = [
  "hospital_admin",
  "medical_director",
  "doctor",
  "nurse",
  "pharmacist",
  "lab_scientist",
  "receptionist",
  "cashier",
  "records_officer",
];

const defaultForm: CreateStaffPayload = {
  full_name: "",
  email: "",
  phone: "",
  role: "doctor",
  password: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateStaffPayload>(defaultForm);

  const loadStaff = async () => {
    const response = await listStaff();
    setStaff(response.staff);
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const response = await listStaff();
        if (mounted) {
          setStaff(response.staff);
        }
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load staff",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
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
      total: staff.length,
      doctors: staff.filter((member) => member.role === "doctor").length,
      nurses: staff.filter((member) => member.role === "nurse").length,
      inactive: staff.filter((member) => member.status === "inactive").length,
    }),
    [staff]
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createStaff(form);
      await loadStaff();
      setOpen(false);
      setForm(defaultForm);
      toast({ title: "Staff created", description: "The user can now sign in with email and password." });
    } catch (error) {
      toast({
        title: "Unable to create staff",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (member: StaffMember, role: CreateStaffPayload["role"]) => {
    try {
      await updateStaff(member.id, role, (member.status || "active") as "active" | "inactive");
      await loadStaff();
      toast({ title: "Role updated", description: `${member.full_name} is now ${role.replace("_", " ")}.` });
    } catch (error) {
      toast({
        title: "Unable to update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusToggle = async (member: StaffMember) => {
    const nextStatus = member.status === "inactive" ? "active" : "inactive";
    try {
      await updateStaff(member.id, member.role as CreateStaffPayload["role"], nextStatus);
      await loadStaff();
      toast({ title: "Status updated", description: `${member.full_name} is now ${nextStatus}.` });
    } catch (error) {
      toast({
        title: "Unable to update status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Staff & Roles" description="Create staff accounts and manage role assignments.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Staff Account</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required /></div>
              <div><Label>Phone</Label><Input inputMode="numeric" pattern="[0-9]*" value={form.phone || ""} onChange={(e) => setForm((current) => ({ ...current, phone: digitsOnly(e.target.value) }))} /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(value: CreateStaffPayload["role"]) => setForm((current) => ({ ...current, role: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Temporary Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} required /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Staff"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard title="Total Staff" value={stats.total} icon={UserCog} />
        <StatCard title="Doctors" value={stats.doctors} icon={UserCog} iconColor="bg-info/10" />
        <StatCard title="Nurses" value={stats.nurses} icon={UserCog} iconColor="bg-accent/10" />
        <StatCard title="Inactive" value={stats.inactive} icon={UserCog} iconColor="bg-warning/10" />
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {["Name", "Role", "Branch", "Email", "Status", "Actions"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}
            </tr></thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{member.full_name}</td>
                  <td className="px-4 py-3">
                    <Select value={member.role as CreateStaffPayload["role"]} onValueChange={(value: CreateStaffPayload["role"]) => handleRoleChange(member, value)}>
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs">{member.branch_name || "Main Branch"}</td>
                  <td className="px-4 py-3 text-xs">{member.email}</td>
                  <td className="px-4 py-3"><Badge variant={member.status === "active" ? "default" : "secondary"}>{(member.status || "active").replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => handleStatusToggle(member)}>
                      {member.status === "inactive" ? "Activate" : "Deactivate"}
                    </Button>
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
