import { PageHeader } from '@/components/ui/page-header';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Baby } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

const antenatalRecords = [
  { id: '1', patient: 'Akua Boateng', lmp: '2024-01-05', edd: '2024-10-12', gravida: 2, parity: 1, ga: 10, hb: 11.2, hiv: 'Non-Reactive', status: 'active' },
  { id: '2', patient: 'Ama Darko', lmp: '2023-11-20', edd: '2024-08-27', ga: 16, gravida: 1, parity: 0, hb: 10.8, hiv: 'Non-Reactive', status: 'active' },
  { id: '3', patient: 'Efua Mensah', lmp: '2023-09-10', edd: '2024-06-17', ga: 27, gravida: 3, parity: 2, hb: 12.0, hiv: 'Non-Reactive', status: 'active' },
];

const deliveries = [
  { id: '1', mother: 'Adjoa Kumah', date: '2024-03-10', type: 'SVD', baby_weight: '3.2 kg', apgar: '8/9', sex: 'Male', outcome: 'Live Birth' },
  { id: '2', mother: 'Yaa Asantewaa', date: '2024-03-08', type: 'C/S', baby_weight: '3.8 kg', apgar: '7/9', sex: 'Female', outcome: 'Live Birth' },
];

export default function MaternityPage() {
  return (
    <div className="module-container">
      <PageHeader title="Maternity" description="Antenatal, labour, delivery, and postnatal records" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Active ANC" value={antenatalRecords.length} icon={Baby} />
        <StatCard title="Deliveries This Month" value={deliveries.length} icon={Baby} iconColor="bg-success/10" />
        <StatCard title="High Risk" value={0} icon={Baby} iconColor="bg-warning/10" />
        <StatCard title="Postnatal" value={2} icon={Baby} iconColor="bg-info/10" />
      </div>

      <h3 className="text-sm font-semibold">Antenatal Records</h3>
      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {['Patient', 'LMP', 'EDD', 'GA (weeks)', 'G/P', 'Hb', 'HIV', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {antenatalRecords.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.patient}</td>
                  <td className="px-4 py-3 text-xs">{r.lmp}</td>
                  <td className="px-4 py-3 text-xs">{r.edd}</td>
                  <td className="px-4 py-3">{r.ga}</td>
                  <td className="px-4 py-3">G{r.gravida}P{r.parity}</td>
                  <td className="px-4 py-3">{r.hb} g/dL</td>
                  <td className="px-4 py-3 text-xs">{r.hiv}</td>
                  <td className="px-4 py-3"><Badge variant="default">{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <h3 className="text-sm font-semibold">Recent Deliveries</h3>
      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {['Mother', 'Date', 'Type', 'Baby Weight', 'APGAR', 'Sex', 'Outcome'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{d.mother}</td>
                  <td className="px-4 py-3 text-xs">{d.date}</td>
                  <td className="px-4 py-3">{d.type}</td>
                  <td className="px-4 py-3">{d.baby_weight}</td>
                  <td className="px-4 py-3">{d.apgar}</td>
                  <td className="px-4 py-3">{d.sex}</td>
                  <td className="px-4 py-3"><Badge variant="default" className="bg-success/10 text-success border-success/20">{d.outcome}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
