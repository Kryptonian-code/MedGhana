import { useEffect, useState } from "react";
import { Menu, Search, Bell, Building2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { logout as logoutRequest } from "@/lib/authApi";
import { toast } from "@/hooks/use-toast";
import { listNotifications, markNotificationRead } from "@/lib/notificationsApi";
import type { AppNotification } from "@/types";

export function TopBar() {
  const { isCollapsed, toggleMobile } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!user) return;

      try {
        const response = await listNotifications("unread", 6);
        if (!mounted) return;

        setNotifications(response.notifications);
        setUnreadCount(response.unread_count);
      } catch {
        // Keep header resilient if notifications are temporarily unavailable.
      }
    };

    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Clear local state even if the server session is already unavailable.
    } finally {
      logout();
      navigate("/login");
      toast({
        title: "Signed out",
        description: "Your session has been closed successfully.",
      });
    }
  };

  const handleOpenNotifications = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    try {
      const response = await listNotifications("all", 8);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch {
      // Silent fallback for header affordance.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      toast({
        title: "Unable to update notifications",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 gap-4 transition-all",
        "relative",
        isCollapsed ? "md:ml-16" : "md:ml-60"
      )}
    >
      <div className="flex items-center gap-3">
        <button onClick={toggleMobile} className="md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5 w-64">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search patients, records..." className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/60" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5" />
          <span>{user?.branch_name || "Main Branch"}</span>
        </div>

        <button onClick={handleOpenNotifications} className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />}
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {user?.full_name?.charAt(0) || "A"}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none">{user?.full_name || "Admin User"}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.replace("_", " ") || "Super Admin"}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute right-4 top-16 z-40 w-[360px] rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Workflow Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          </div>
          <div className="space-y-3">
            {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-border/70 p-3">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(notification.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
