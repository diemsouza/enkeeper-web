import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import handlebars from "handlebars";

interface SendMailProps {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
}: SendMailProps): Promise<boolean> => {
  const smtpUrl = process.env.SMTP_URL;
  // nodemailer so reconhece a string como config se comecar com smtp(s)://;
  // fora disso quebra com "Cannot set properties of undefined (setting 'mailer')"
  if (!smtpUrl || !/^smtps?:\/\//i.test(smtpUrl)) {
    console.error("[sendEmail] SMTP_URL missing or invalid (expected smtp://user:pass@host:port)");
    return false;
  }
  try {
    const transporter = nodemailer.createTransport(smtpUrl);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
};

export enum EmailTemplates {
  NOTIFICATION = "notification.hbs",
}

export interface NotificationEmailData {
  title: string;
  message?: string;
  fields?: { label: string; value: string }[];
  url?: string;
}

interface SendMailTemplateProps {
  to: string;
  subject: string;
  template: EmailTemplates;
  data: NotificationEmailData;
}

export const sendEmailTemplateOrThrow = async ({
  to,
  subject,
  template,
  data,
}: SendMailTemplateProps): Promise<boolean> => {
  const templatePath = path.join(
    process.cwd(),
    "email-templates",
    "pt",
    template,
  );
  const templateSource = fs.readFileSync(templatePath, "utf8");
  const compile = handlebars.compile(templateSource);
  const html = compile({ subject, ...data });
  return await sendEmail({ to, subject, html });
};

export const sendEmailTemplate = async (
  data: SendMailTemplateProps,
): Promise<boolean> => {
  try {
    return await sendEmailTemplateOrThrow(data);
  } catch (error) {
    console.error("Error sending email with template: ", error);
    return false;
  }
};

interface SendSupportEmailProps extends NotificationEmailData {
  subject: string;
}

export const sendSupportEmail = async ({
  subject,
  ...data
}: SendSupportEmailProps): Promise<boolean> => {
  const to = process.env.EMAIL_SUPPORT;
  if (!to) {
    console.error("[sendSupportEmail] EMAIL_SUPPORT not set");
    return false;
  }
  return await sendEmailTemplate({
    to,
    subject: `[Fluizer] ${subject}`,
    template: EmailTemplates.NOTIFICATION,
    data,
  });
};
