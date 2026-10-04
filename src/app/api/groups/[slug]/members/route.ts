import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const { name, upiId, phone, isVirtual = true } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Member name is required" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const trimmedName = name.trim();
    const existing = group.members.find(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      return NextResponse.json({ error: "A member with this name already exists in the group" }, { status: 409 });
    }

    const newMember = await prisma.member.create({
      data: {
        name: trimmedName,
        upiId: upiId ? upiId.trim() : null,
        phone: phone ? phone.trim() : null,
        isVirtual: Boolean(isVirtual),
        groupId: group.id,
      },
    });

    return NextResponse.json({ member: newMember });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
