import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await context.params;
    const body = await req.json();
    const { name, upiId, phone } = body;

    const group = await prisma.group.findUnique({
      where: { slug },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        upiId: upiId !== undefined ? (upiId ? upiId.trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
      },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await context.params;

    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.members.length <= 1) {
      return NextResponse.json({ error: "Group must have at least one member" }, { status: 400 });
    }

    await prisma.member.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
