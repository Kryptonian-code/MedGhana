import { apiRequest } from "@/lib/api";
import type { AppNotification } from "@/types";

interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export function listNotifications(scope: "all" | "unread" = "unread", limit = 8) {
  return apiRequest<NotificationsResponse>(`/notifications/index.php?scope=${scope}&limit=${limit}`);
}

export function markNotificationRead(id?: string | number) {
  return apiRequest<{ message: string }>("/notifications/read.php", {
    method: "POST",
    body: JSON.stringify(id ? { id } : {}),
  });
}
