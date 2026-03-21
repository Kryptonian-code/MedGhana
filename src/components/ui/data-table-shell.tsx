import { cn } from '@/lib/utils';

interface DataTableShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      {children}
    </div>
  );
}
