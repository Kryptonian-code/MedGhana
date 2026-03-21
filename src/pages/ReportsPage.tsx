import { PageHeader } from '@/components/ui/page-header';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const patientVisits = [
  { month: 'Jan', visits: 820 }, { month: 'Feb', visits: 740 }, { month: 'Mar', visits: 910 },
  { month: 'Apr', visits: 870 }, { month: 'May', visits: 960 }, { month: 'Jun', visits: 1050 },
];
const revenue = [
  { month: 'Jan', revenue: 42000, expenses: 28000 }, { month: 'Feb', revenue: 38000, expenses: 26000 },
  { month: 'Mar', revenue: 51000, expenses: 31000 }, { month: 'Apr', revenue: 47000, expenses: 29000 },
  { month: 'May', revenue: 55000, expenses: 33000 }, { month: 'Jun', revenue: 63000, expenses: 35000 },
];
const diagnoses = [
  { name: 'Malaria', value: 245 }, { name: 'URTI', value: 180 }, { name: 'UTI', value: 120 },
  { name: 'Hypertension', value: 95 }, { name: 'Diabetes', value: 85 }, { name: 'Gastritis', value: 70 },
];
const COLORS = ['hsl(210,90%,42%)', 'hsl(168,70%,40%)', 'hsl(38,92%,50%)', 'hsl(280,65%,55%)', 'hsl(0,72%,51%)', 'hsl(330,70%,50%)'];
const labVolume = [
  { test: 'FBC', count: 145 }, { test: 'Malaria', count: 210 }, { test: 'Urinalysis', count: 98 },
  { test: 'FBS', count: 120 }, { test: 'LFT', count: 65 }, { test: 'Lipid', count: 55 },
];

export default function ReportsPage() {
  return (
    <div className="module-container">
      <PageHeader title="Reports" description="Analytics and hospital performance reports" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Patient Visits</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={patientVisits}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="visits" fill="hsl(210,90%,42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue vs Expenses (GHS)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(168,70%,40%)" strokeWidth={2} />
              <Line type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Top Diagnoses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={diagnoses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                {diagnoses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Lab Test Volume</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={labVolume} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="test" type="category" fontSize={12} tickLine={false} axisLine={false} width={70} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(38,92%,50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
