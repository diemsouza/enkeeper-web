export async function sendMessage(to: string, text: string): Promise<void> {
  const token = process.env.WABA_TOKEN
  const phoneNumberId = process.env.WABA_PHONE_ID

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  )

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Meta API error ${res.status}: ${detail}`)
  }
}
