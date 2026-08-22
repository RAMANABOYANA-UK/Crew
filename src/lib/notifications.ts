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
  userEmail?: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailText?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    userEmail,
    title,
    message,
    type = "SYSTEM",
    link,
    sendEmail = false,
    emailSubject,
    emailText,
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

  // 2. Dispatch optional email alert
  if (sendEmail && userEmail) {
    try {
      await sendEmailAlert({
        to: userEmail,
        subject: emailSubject || `[Dayflow HRMS] ${title}`,
        text: emailText || message,
      });
    } catch (emailErr) {
      console.error("Failed to send notification email:", emailErr);
    }
  }

  return notification;
}

export async function notifyAdmins(params: {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailText?: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "HR"] },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const notifications = await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        userEmail: admin.email,
        title: params.title,
        message: params.message,
        type: params.type || "SYSTEM",
        link: params.link,
        sendEmail: params.sendEmail,
        emailSubject: params.emailSubject,
        emailText: params.emailText,
      })
    )
  );

  return notifications;
}
