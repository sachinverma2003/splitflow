import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.ADMIN_JWT_SECRET || "splitflow-secure-admin-secret-2026";

export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
  } catch {
    return false;
  }
}

export function createAdminSessionToken(groupId: string, adminMemberId: string, passwordHash: string): string {
  const payload = `${groupId}:${adminMemberId}:${passwordHash}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${Buffer.from(groupId).toString("base64url")}.${signature}`;
}

export function isValidAdminToken(token: string, groupId: string, adminMemberId: string, passwordHash: string): boolean {
  if (!token) return false;
  const expected = createAdminSessionToken(groupId, adminMemberId, passwordHash);
  return token === expected;
}

export async function checkAdminStatus(req: Request, groupSlug: string): Promise<{
  hasAdmin: boolean;
  isAdminLoggedIn: boolean;
  adminMemberName: string | null;
  adminMemberId: string | null;
}> {
  const group = await prisma.group.findUnique({
    where: { slug: groupSlug },
    include: { members: true },
  });

  if (!group || !group.adminMemberId || !group.adminPasswordHash) {
    return {
      hasAdmin: false,
      isAdminLoggedIn: false,
      adminMemberName: null,
      adminMemberId: null,
    };
  }

  const adminMember = group.members.find((m) => m.id === group.adminMemberId);
  const adminMemberName = adminMember ? adminMember.name : "Admin";

  const headerToken = req.headers.get("x-admin-token");
  let cookieToken: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieToken = cookieStore.get(`sf_admin_${groupSlug}`)?.value;
  } catch {
    // ignore
  }

  const token = headerToken || cookieToken;
  const isAdminLoggedIn = !!(token && isValidAdminToken(token, group.id, group.adminMemberId, group.adminPasswordHash));

  return {
    hasAdmin: true,
    isAdminLoggedIn,
    adminMemberName,
    adminMemberId: group.adminMemberId,
  };
}
