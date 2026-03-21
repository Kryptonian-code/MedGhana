import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getSettings, saveSettings, type HospitalSettings } from "@/lib/settingsApi";
import { digitsOnly } from "@/lib/ghana";

const defaultSettings: HospitalSettings = {
  hospital_name: "",
  license_number: "",
  phone: "",
  email: "",
  address: "",
  auto_generate_hospital_numbers: true,
  nhis_integration_enabled: true,
  sms_notifications_enabled: false,
  receipt_auto_print_enabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<HospitalSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await getSettings();
        if (mounted && response.settings) {
          setSettings(response.settings);
        }
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load settings",
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

  const updateField = <K extends keyof HospitalSettings>(key: K, value: HospitalSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      toast({ title: "Settings saved", description: "Hospital configuration has been updated." });
    } catch (error) {
      toast({
        title: "Unable to save settings",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-container max-w-3xl">
      <PageHeader title="Settings" description="Hospital configuration and system settings" />

      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div>
          <h3 className="mb-4 text-sm font-semibold">Hospital Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Hospital Name</Label><Input value={settings.hospital_name || ""} onChange={(e) => updateField("hospital_name", e.target.value)} /></div>
            <div><Label>License Number</Label><Input value={settings.license_number || ""} onChange={(e) => updateField("license_number", e.target.value)} /></div>
            <div><Label>Phone</Label><Input inputMode="numeric" pattern="[0-9]*" value={settings.phone || ""} onChange={(e) => updateField("phone", digitsOnly(e.target.value))} /></div>
            <div><Label>Email</Label><Input value={settings.email || ""} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={settings.address || ""} onChange={(e) => updateField("address", e.target.value)} /></div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 text-sm font-semibold">System Preferences</h3>
          <div className="space-y-4">
            <SwitchRow
              label="Auto-generate hospital numbers"
              description="Automatically assign hospital numbers to new patients"
              checked={Boolean(settings.auto_generate_hospital_numbers)}
              onCheckedChange={(checked) => updateField("auto_generate_hospital_numbers", checked)}
            />
            <SwitchRow
              label="NHIS Integration"
              description="Enable NHIS claim submission"
              checked={Boolean(settings.nhis_integration_enabled)}
              onCheckedChange={(checked) => updateField("nhis_integration_enabled", checked)}
            />
            <SwitchRow
              label="SMS Notifications"
              description="Send appointment reminders via SMS"
              checked={Boolean(settings.sms_notifications_enabled)}
              onCheckedChange={(checked) => updateField("sms_notifications_enabled", checked)}
            />
            <SwitchRow
              label="Receipt Auto-Print"
              description="Automatically print receipt after payment"
              checked={Boolean(settings.receipt_auto_print_enabled)}
              onCheckedChange={(checked) => updateField("receipt_auto_print_enabled", checked)}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
