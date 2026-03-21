import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

const items = [
  { id: '1', name: 'Surgical Gloves (Box)', category: 'PPE', qty: 45, unit: 'Boxes', reorder: 20, cost: 85, supplier: 'MedSupply GH', lastRestocked: '2024-03-01' },
  { id: '2', name: 'Syringes 5ml (Pack 100)', category: 'Consumables', qty: 12, unit: 'Packs', reorder: 15, cost: 120, supplier: 'PharmaLink', lastRestocked: '2024-02-20' },
  { id: '3', name: 'IV Cannula 18G', category: 'Consumables', qty: 200, unit: 'Pieces', reorder: 50, cost: 3.5, supplier: 'MedSupply GH', lastRestocked: '2024-03-05' },
  { id: '4', name: 'Gauze Rolls', category: 'Dressings', qty: 80, unit: 'Rolls', reorder: 30, cost: 12, supplier: 'HealthCare Ltd', lastRestocked: '2024-02-28' },
  { id: '5', name: 'Oxygen Masks (Adult)', category: 'Equipment', qty: 8, unit: 'Pieces', reorder: 10, cost: 45, supplier: 'MedEquip GH', lastRestocked: '2024-01-15' },
  { id: '6', name: 'Bed Sheets', category: 'Linen', qty: 60, unit: 'Pieces', reorder: 20, cost: 35, supplier: 'TextileMed', lastRestocked: '2024-02-10' },
];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const lowStock = items.filter(i => i.qty <= i.reorder);
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="module-container">
      <PageHeader title="Inventory" description="Medical supplies and stock management" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={items.length} icon={Package} />
        <StatCard title="Low Stock" value={lowStock.length} change="Needs attention" changeType="negative" icon={Package} iconColor="bg-warning/10" />
        <StatCard title="Categories" value={new Set(items.map(i => i.category)).size} icon={Package} iconColor="bg-info/10" />
        <StatCard title="Total Value" value={`GHS ${items.reduce((s, i) => s + i.qty * i.cost, 0).toLocaleString()}`} icon={Package} iconColor="bg-success/10" />
      </div>

      <DataTableShell>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-muted/60 rounded-lg px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              {['Item', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Supplier', 'Last Restocked', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 text-xs">{i.category}</td>
                  <td className="px-4 py-3 font-medium">{i.qty}</td>
                  <td className="px-4 py-3 text-xs">{i.unit}</td>
                  <td className="px-4 py-3">GHS {i.cost}</td>
                  <td className="px-4 py-3 text-xs">{i.supplier}</td>
                  <td className="px-4 py-3 text-xs">{i.lastRestocked}</td>
                  <td className="px-4 py-3">{i.qty <= i.reorder ? <Badge variant="destructive" className="text-[10px]">Low</Badge> : <Badge variant="outline" className="text-[10px]">OK</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
