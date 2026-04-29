import { Router } from "express";
import { z } from "zod";
import { otpService } from "../services/otpService";
import { smsService } from "../services/smsService";

const router = Router();

const pendingRegistrations = new Map<
  string,
  {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }
>();

// POST /auth/send-otp
router.post("/send-otp", async (req, res) => {
  const schema = z.object({
    phone: z.string().regex(/^\+216\d{8}$/, "Invalid Tunisian number"),
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string(),
    lastName: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { phone, email, password, firstName, lastName } = parsed.data;

  // Store registration data temporarily
  pendingRegistrations.set(phone, { email, password, firstName, lastName });

  const code = otpService.generate(phone);
  await smsService.sendOtp(phone, code);

  return res.json({ message: "OTP sent" });
});

// POST /auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const schema = z.object({
    phone: z.string(),
    code: z.string().length(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { phone, code } = parsed.data;

  const valid = otpService.verify(phone, code);
  if (!valid) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const reg = pendingRegistrations.get(phone);
  if (!reg) {
    return res.status(400).json({ error: "Registration data not found" });
  }

  // Get admin token
  const adminTokenRes = await fetch(
    `http://192.168.100.74:8080/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: "admin",
        password: "admin",
      }).toString(),
    },
  );
  const { access_token: adminToken } = await adminTokenRes.json();

  // Create Keycloak user
  const createRes = await fetch(
    `http://192.168.100.74:8080/admin/realms/kia-app/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: reg.email,
        username: reg.email,
        firstName: reg.firstName,
        lastName: reg.lastName,
        enabled: true,
        emailVerified: true,
        attributes: { phone: [phone] },
        credentials: [
          { type: "password", value: reg.password, temporary: false },
        ],
      }),
    },
  );

  if (!createRes.ok) {
    const err = await createRes.json();
    return res
      .status(400)
      .json({ error: err.errorMessage ?? "Registration failed" });
  }

  pendingRegistrations.delete(phone);
  return res.json({ message: "User created successfully" });
});

export default router;
