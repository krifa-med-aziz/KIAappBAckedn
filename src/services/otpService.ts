const otpStore = new Map<string, { code: string; expiresAt: number }>();

export const otpService = {
  generate(phone: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    return code;
  },

  verify(phone: string, code: string): boolean {
    const entry = otpStore.get(phone);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phone);
      return false;
    }
    if (entry.code !== code) return false;
    otpStore.delete(phone);
    return true;
  },
};
