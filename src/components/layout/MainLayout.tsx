import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useSidebarStore } from '@/stores/sidebarStore';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={cn('transition-all duration-200', isCollapsed ? 'md:ml-16' : 'md:ml-60')}>
        <TopBar />
        <main className="animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
