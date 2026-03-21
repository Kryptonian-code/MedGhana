import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getProfile, saveProfile, type ProfilePayload } from "@/lib/profileApi";
import { useAuthStore } from "@/stores/authStore";
import { digitsOnly } from "@/lib/ghana";

const defaultProfile: ProfilePayload = {
  full_name: "",
  email: "",
  phone: "",
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfilePayload>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await getProfile();
        if (mounted) {
          setForm((current) => ({
            ...current,
            full_name: response.profile.full_name,
            email: response.profile.email,
            phone: response.profile.phone || "",
          }));
        }
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load profile",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      setUser(currentUser ? { ...currentUser, full_name: form.full_name, email: form.email, phone: form.phone } : currentUser);
      setForm((current) => ({ ...current, current_password: "", new_password: "", confirm_password: "" }));
      toast({ title: "Profile updated", description: "Your account details have been saved." });
    } catch (error) {
      toast({
        title: "Unable to update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.full_name || currentUser?.full_name || "U").charAt(0).toUpperCase();

  return (
    <div className="module-container max-w-3xl">
      <PageHeader title="Profile" description="Your account details and preferences" />

      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{initials}</div>
          <div>
            <h3 className="font-semibold">{form.full_name || currentUser?.full_name || "User"}</h3>
            <p className="text-sm text-muted-foreground capitalize">{currentUser?.role?.replace("_", " ") || "Staff"}</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 text-sm font-semibold">Personal Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input inputMode="numeric" pattern="[0-9]*" value={form.phone || ""} onChange={(e) => updateField("phone", digitsOnly(e.target.value))} /></div>
            <div><Label>Username</Label><Input value={currentUser?.username || "-"} disabled /></div>
            <div className="sm:col-span-2"><Label>Role</Label><Input value={currentUser?.role?.replace("_", " ") || ""} disabled /></div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 text-sm font-semibold">Change Password</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Current Password</Label><Input type="password" value={form.current_password || ""} onChange={(e) => updateField("current_password", e.target.value)} /></div>
            <div />
            <div><Label>New Password</Label><Input type="password" value={form.new_password || ""} onChange={(e) => updateField("new_password", e.target.value)} /></div>
            <div><Label>Confirm New Password</Label><Input type="password" value={form.confirm_password || ""} onChange={(e) => updateField("confirm_password", e.target.value)} /></div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update Profile"}</Button>
        </div>
      </div>
    </div>
  );
}
