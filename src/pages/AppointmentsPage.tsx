import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createAppointment, listAppointments, updateAppointmentStatus, type AppointmentPayload } from "@/lib/appointmentsApi";
import { listPatients } from "@/lib/patientsApi";
import { usePermissions } from "@/hooks/use-permissions";
import type { Appointment, Patient } from "@/types";

const statusColors: Record<string, string> = {
  scheduled: "bg-info/10 text-info border-info/20",
  checked_in: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground",
};

const appointmentTypes: AppointmentPayload["type"][] = ["new_visit", "follow_up", "emergency", "referral"];

const defaultForm: AppointmentPayload = {
  patient_id: 0,
  doctor_name: "",
  appointment_date: "",
  appointment_time: "",
  type: "new_visit",
  notes: "",
};

export default function AppointmentsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentPayload>(defaultForm);

  const loadData = async () => {
    const [appointmentsResponse, patientsResponse] = await Promise.all([listAppointments(), listPatients()]);
    setAppointments(appointmentsResponse.appointments);
    setPatients(patientsResponse.patients);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [appointmentsResponse, patientsResponse] = await Promise.all([listAppointments(), listPatients()]);
        if (!mounted) return;

        setAppointments(appointmentsResponse.appointments);
        setPatients(patientsResponse.patients);
      } catch (error) {
        if (!mounted) return;

        toast({
          title: "Unable to load appointments",
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

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        `${appointment.patient_name ?? ""} ${appointment.hospital_number ?? ""} ${appointment.doctor_name ?? ""} ${appointment.status}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [appointments, search]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((appointment) => appointment.appointment_date === today);
  const summary = [
    { label: "Total Today", value: todayAppointments.length, color: "text-foreground" },
    { label: "Waiting", value: todayAppointments.filter((item) => item.status === "scheduled").length, color: "text-warning" },
    { label: "Checked In", value: todayAppointments.filter((item) => item.status === "checked_in").length, color: "text-primary" },
    { label: "Completed", value: todayAppointments.filter((item) => item.status === "completed").length, color: "text-success" },
  ];

  const handleBookAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createAppointment(form);
      await loadData();
      setBookOpen(false);
      setForm(defaultForm);
      toast({
        title: "Appointment booked",
        description: "The patient has been added to the appointment queue.",
      });
    } catch (error) {
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "Unable to save appointment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (appointment: Appointment, status: Appointment["status"]) => {
    setUpdatingId(appointment.id);

    try {
      await updateAppointmentStatus(appointment.id, status);
      await loadData();
      toast({
        title: "Appointment updated",
        description: `${appointment.patient_name ?? "Appointment"} is now ${status.replace("_", " ")}.`,
      });
    } catch (error) {
      toast({
        title: "Unable to update appointment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="module-container">
      <PageHeader title="Appointments" description="Schedule visits, manage queue flow, and check patients into triage.">
        {can("appointments.create") && (
          <Dialog open={bookOpen} onOpenChange={setBookOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Book Appointment</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleBookAppointment}>
                <div>
                  <Label>Patient *</Label>
                  <Select
                    value={form.patient_id ? String(form.patient_id) : ""}
                    onValueChange={(value) => setForm((current) => ({ ...current, patient_id: Number(value) }))}
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
                  <Label>Doctor / Clinician *</Label>
                  <Input
                    value={form.doctor_name}
                    onChange={(event) => setForm((current) => ({ ...current, doctor_name: event.target.value }))}
                    placeholder="e.g. Dr. Nana Agyeman"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.appointment_date}
                      onChange={(event) => setForm((current) => ({ ...current, appointment_date: event.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={form.appointment_time}
                      onChange={(event) => setForm((current) => ({ ...current, appointment_time: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: AppointmentPayload["type"]) => setForm((current) => ({ ...current, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Presenting Complaint / Notes</Label>
                  <Textarea
                    value={form.notes || ""}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Initial complaint, symptoms, or booking notes"
                    rows={3}
                  />
                </div>

                <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-sm text-muted-foreground">
                  Booking an appointment now also queues an appointment confirmation SMS for the patient phone number on file.
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setBookOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !form.patient_id}>
                    {saving ? "Booking..." : "Book Appointment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="stat-card text-center">
            <CalendarDays className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search appointments..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Queue</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date / Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No appointments found yet.
                  </td>
                </tr>
              )}

              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-bold text-primary">#{appointment.queue_number || "-"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{appointment.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{appointment.hospital_number}</p>
                  </td>
                  <td className="px-4 py-3">{appointment.doctor_name}</td>
                  <td className="px-4 py-3">
                    <p>{appointment.appointment_date}</p>
                    <p className="text-xs text-muted-foreground">{appointment.appointment_time}</p>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{appointment.type.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[appointment.status]}>
                      {appointment.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {can("appointments.check_in") ? (
                      <div className="flex flex-wrap gap-2">
                        {appointment.status === "scheduled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusUpdate(appointment, "checked_in")}
                          >
                            Check In
                          </Button>
                        )}
                        {appointment.status === "checked_in" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusUpdate(appointment, "in_progress")}
                          >
                            Start Visit
                          </Button>
                        )}
                        {["scheduled", "checked_in", "in_progress"].includes(appointment.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusUpdate(appointment, "completed")}
                          >
                            Complete
                          </Button>
                        )}
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
