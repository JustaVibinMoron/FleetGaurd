import type { AppNotification, NotificationSeverity } from "@/lib/types";

export function createNotification(
  title: string,
  message: string,
  severity: NotificationSeverity,
  truckId?: string,
): AppNotification {
  return {
    id: `n-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    title,
    message,
    severity,
    read: false,
    createdAt: new Date().toISOString(),
    truckId,
  };
}

export function unreadCount(items: AppNotification[]) {
  return items.filter((n) => !n.read).length;
}
