import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string; settlementId: string }> }
) {
  try {
    const { slug, settlementId } = await context.params;

    const group = await prisma.group.findUnique({
      where: { slug },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await prisma.settlement.delete({
      where: { id: settlementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    return NextResponse.json({ error: "Failed to delete settlement" }, { status: 500 });
  }
}
