import { sendWhatsAppAuthTemplate } from "./whatsapp.vendor";

const OTP_TEMPLATE_NAME = "code_verification";

export async function sendOtpCode(phone: string, code: string): Promise<void> {
  if (process.env.AUTH_FAKE_OTP === "true") {
    console.log(
      `[otp.vendor] AUTH_FAKE_OTP ativo, não enviando código real para ${phone} (${code})`,
    );
    return;
  }
  await sendWhatsAppAuthTemplate(phone, OTP_TEMPLATE_NAME, code);
}
