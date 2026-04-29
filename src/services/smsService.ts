import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export const smsService = {
  async sendOtp(phone: string, code: string) {
    await client.messages.create({
      body: `Your KIA Service verification code is: ${code}`,
      from: process.env.TWILIO_FROM_NUMBER!,
      to: phone,
    });
  },
};
