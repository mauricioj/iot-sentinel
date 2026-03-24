'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { notificationsService, NotificationItem } from '@/services/notifications.service';
import { useWebSocket } from '@/hooks/use-websocket';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { on } = useWebSocket();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const cleanup = on('notification:new', () => {
      loadNotifications();
      loadUnreadCount();
    });
    return cleanup;
  }, [on]);

  const loadNotifications = async () => {
    try {
      const res = await notificationsService.findAll(1, 10);
      setNotifications(res.data);
    } catch {}
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.countUnread();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead();
    setUnreadCount(0);
    loadNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border-b border-border px-4 py-3 text-sm last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <p className="text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
