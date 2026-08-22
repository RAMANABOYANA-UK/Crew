/**
 * Notification Helper for Dayflow HRMS
 * 
 * Creates in-app notifications and triggers optional email alerts.
 */

import { prisma } from "./prisma";
import { NotificationType } from "@/generated/prisma";
import { sendEmailAlert } from "./email";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailText?: string;
  userEmail?: string;
}

/**
 * Create an in-app notification for a single user and optionally dispatch an email alert.
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    title,
    message,
    type = "SYSTEM",
    link,
    sendEmail = true,
    emailSubject,
    emailText,
    userEmail,
  } = params;

  // 1. Create in-app notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: link || null,
      isRead: false,
    },
  });

  // 2. Dispatch email alert if email is available or if we look it up
  if (sendEmail) {
    let recipientEmail = userEmail;
    if (!recipientEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      recipientEmail = user?.email;
    }

    if (recipientEmail) {
      await sendEmailAlert({
        to: recipientEmail,
        subject: emailSubject || `[Dayflow HRMS] ${title}`,
        text: emailText || message,
      });
    }
  }

  return notification;
}

/**
 * Notify all HR and Admin users (e.g. when an employee submits a leave request).
 */
export async function notifyAdmins(params: {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  emailSubject?: string;
  emailText?: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "HR"] },
    },
    select: { id: true, email: true },
  });

  const createdNotifications = [];

  for (const admin of admins) {
    const notification = await createNotification({
      userId: admin.id,
      userEmail: admin.email,
      title: params.title,
      message: params.message,
      type: params.type || "SYSTEM",
      link: params.link,
      emailSubject: params.emailSubject,
      emailText: params.emailText,
    });
    createdNotifications.push(notification);
  }

  return createdNotifications;
}
