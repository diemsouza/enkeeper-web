import axios from "axios";

interface WhatsAppMessage {
  phone: string;
  templateName: string;
  languageCode?: string | null;
  components?: any[];
}

export class WhatsAppService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async sendTemplateMessage(message: WhatsAppMessage) {
    const url = `https://graph.facebook.com/v22.0/${process.env.WABA_PHONE_ID}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          to: message.phone,
          type: "template",
          template: {
            name: message.templateName,
            language: {
              code: message.languageCode === "pt-BR" ? "pt_BR" : "en",
            },
            components: message.components || [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data || error.message;
      throw new Error(`WhatsApp API Error: ${JSON.stringify(msg)}`);
    }
  }
}
