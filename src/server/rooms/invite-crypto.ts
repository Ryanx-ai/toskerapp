import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const inviteToken = () => randomBytes(32).toString("base64url");
export const inviteHash = (token: string) => createHash("sha256").update(token).digest("hex");
function key() {
  const value = process.env.ROOM_INVITE_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("Share invitation encryption is not configured.");
  return Buffer.from(value, "hex");
}
export function encryptInvite(token: string, roomId: string, id: string) {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), nonce);
  cipher.setAAD(Buffer.from(`tosker:invite:v1:${roomId}:${id}`));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptInvite(value: string, roomId: string, id: string) {
  try {
    const [version, nonce, tag, body, extra] = value.split(".");
    if (version !== "v1" || extra || !body || Buffer.from(nonce, "base64url").length !== 12 || Buffer.from(tag, "base64url").length !== 16) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
    cipher.setAAD(Buffer.from(`tosker:invite:v1:${roomId}:${id}`));
    cipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([cipher.update(Buffer.from(body, "base64url")), cipher.final()]).toString("utf8");
  } catch { throw new Error("The active invitation could not be recovered. Generate a replacement."); }
}
