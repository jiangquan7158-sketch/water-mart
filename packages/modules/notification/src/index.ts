// Notification Module
export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationType = "ORDER_UPDATE" | "SHIPPING_UPDATE" | "PROMOTION" | "ACCOUNT" | "SYSTEM";

export interface EmailProvider { send(to: string, subject: string, html: string): Promise<{ messageId: string }>; }
export interface SmsProvider { send(to: string, message: string): Promise<{ messageId: string }>; }
export interface NotificationRecord { id: string; userId: string; type: NotificationType; title: string; body: string; read: boolean; }

export class NotificationService {
  constructor(private emailProvider?: EmailProvider, private smsProvider?: SmsProvider) {}
  async send(userId: string, type: NotificationType, data: Record<string, unknown>): Promise<NotificationRecord> { void userId; void type; void data; throw new Error("Not implemented"); }
  async sendEmail(to: string, subject: string, html: string): Promise<{ messageId: string }> { if (!this.emailProvider) throw new Error("No email provider"); return this.emailProvider.send(to, subject, html); }
  async sendSms(to: string, message: string): Promise<{ messageId: string }> { if (!this.smsProvider) throw new Error("No SMS provider"); return this.smsProvider.send(to, message); }
}
