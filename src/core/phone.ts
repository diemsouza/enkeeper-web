export function normalizePhoneToWaId(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) return digits;
    return null;
  }
  return null;
}
