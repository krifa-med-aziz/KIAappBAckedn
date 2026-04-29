import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface AuthRequest extends Request {
  user?: any;
}

const client = jwksClient({
  jwksUri:
    "http://192.168.100.74:8080/realms/kia-app/protocol/openid-connect/certs",
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid!, (err, key) => {
    if (err) return callback(err);
    callback(null, key!.getPublicKey());
  });
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No authorization header", errors: [] });
  }

  const token = authHeader.slice(7);

  jwt.verify(
    token,
    getKey,
    {
      audience: "account",
      issuer: "http://192.168.100.74:8080/realms/kia-app",
      algorithms: ["RS256"],
    },
    (err, decoded: any) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
          errors: [err.message],
        });
      }
      req.user = { id: decoded.sub, email: decoded.email, ...decoded };
      next();
    },
  );
};
