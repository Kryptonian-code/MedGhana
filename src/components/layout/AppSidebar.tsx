import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sidebarItems } from '@/config/sidebarConfig';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import { ChevronLeft, X, Heart } from 'lucide-react';

export function AppSidebar() {
  const location = useLocation();
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const { user } = useAuthStore();

  const filteredItems = sidebarItems.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden" onClick={closeMobile} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200',
          isCollapsed ? 'w-16' : 'w-60',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground">MedGhana</h1>
                <p className="text-[10px] text-sidebar-foreground/50">HMS & EMR</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
              <Heart className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
          )}
          <button onClick={closeMobile} className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  'sidebar-link',
                  isActive && 'sidebar-link-active',
                  isCollapsed && 'justify-center px-0'
                )}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden md:flex items-center justify-center p-2 border-t border-sidebar-border">
          <button onClick={toggle} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <ChevronLeft className={cn('w-4 h-4 transition-transform', isCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  );
}
