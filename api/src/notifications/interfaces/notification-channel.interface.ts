import { Notification } from '../schemas/notification.schema';

export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
