import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashAdminPassword,
  verifyAdminPassword,
  createAdminSessionToken,
  checkAdminStatus,
} from "@/lib/admin-auth";
import { cookies } from "next/headers";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const status = await checkAdminStatus(req, slug);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting admin status:", error);
    return NextResponse.json({ error: "Failed to get admin status" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const { action, memberId, password } = body;

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const cookieStore = await cookies();

    // 1. CLAIM ADMIN
    if (action === "claim") {
      if (group.adminMemberId) {
        return NextResponse.json(
          { error: "An admin has already been claimed for this group. Only 1 person can be admin." },
          { status: 400 }
        );
      }

      if (!memberId || !password || password.length < 4) {
        return NextResponse.json(
          { error: "Please select a member and enter a password of at least 4 characters." },
          { status: 400 }
        );
      }

      const member = group.members.find((m) => m.id === memberId);
      if (!member) {
        return NextResponse.json({ error: "Selected member not found in group" }, { status: 404 });
      }

      const passwordHash = hashAdminPassword(password);

      // Update group with admin
      await prisma.group.update({
        where: { id: group.id },
        data: {
          adminMemberId: member.id,
          adminPasswordHash: passwordHash,
        },
      });

      // Mark member as admin
      await prisma.member.update({
        where: { id: member.id },
        data: { isAdmin: true },
      });

      const token = createAdminSessionToken(group.id, member.id, passwordHash);

      cookieStore.set(`sf_admin_${slug}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({
        success: true,
        token,
        adminMemberName: member.name,
        message: `Admin account created! ${member.name} is now the group admin.`,
      });
    }

    // 2. LOGIN AS ADMIN
    if (action === "login") {
      if (!group.adminMemberId || !group.adminPasswordHash) {
        return NextResponse.json({ error: "No admin has been claimed for this group yet." }, { status: 400 });
      }

      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const isValid = verifyAdminPassword(password, group.adminPasswordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });
      }

      const adminMember = group.members.find((m) => m.id === group.adminMemberId);
      const token = createAdminSessionToken(group.id, group.adminMemberId, group.adminPasswordHash);

      cookieStore.set(`sf_admin_${slug}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({
        success: true,
        token,
        adminMemberName: adminMember ? adminMember.name : "Admin",
        message: "Logged in as Admin successfully",
      });
    }

    // 3. LOGOUT ADMIN
    if (action === "logout") {
      cookieStore.delete(`sf_admin_${slug}`);
      return NextResponse.json({ success: true, message: "Logged out from Admin mode" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin route error:", error);
    return NextResponse.json({ error: "Admin operation failed" }, { status: 500 });
  }
}
