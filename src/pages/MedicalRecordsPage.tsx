import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listPatients } from "@/lib/patientsApi";
import type { Patient } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<Patient[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await listPatients();
        if (mounted) setRecords(response.patients);
      } catch (error) {
        if (mounted) {
          toast({
            title: "Unable to load medical records",
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

  const filtered = records.filter((record) => `${record.first_name} ${record.last_name} ${record.hospital_number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="module-container">
      <PageHeader title="Medical Records" description="Find a patient quickly and open the full chart, visit history, and billing trail." />

      <DataTableShell>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-muted/60 rounded-lg px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {["Hospital #", "Patient", "Phone", "Town / Region", "Insurance", "Last Updated", ""].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  {header}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No patient records matched your search.
                  </td>
                </tr>
              )}
              {filtered.map((record) => (
                <tr key={record.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{record.hospital_number}</td>
                  <td className="px-4 py-3 font-medium">{record.first_name} {record.last_name}</td>
                  <td className="px-4 py-3 text-xs">{record.phone || "-"}</td>
                  <td className="px-4 py-3 text-xs">{[record.town, record.region].filter(Boolean).join(", ") || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={record.insurance_type === "nhis" ? "default" : "outline"} className="text-[10px]">
                        {record.insurance_type === "nhis" ? "NHIS" : record.insurance_type === "private" ? "Private" : "Self-pay"}
                      </Badge>
                      {record.blood_group ? <Badge variant="outline" className="text-[10px]">{record.blood_group}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{record.updated_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/patients/${record.id}`}>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Open</span>
                        </span>
                      </Link>
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
