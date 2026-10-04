import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const { payerId, payeeId, amount, notes } = body;

    const numAmount = Number(amount);
    if (!payerId || !payeeId || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Invalid settlement parameters" }, { status: 400 });
    }

    if (payerId === payeeId) {
      return NextResponse.json({ error: "Payer and payee cannot be the same member" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const payer = group.members.find((m) => m.id === payerId);
    const payee = group.members.find((m) => m.id === payeeId);

    if (!payer || !payee) {
      return NextResponse.json({ error: "Payer or payee not found in group" }, { status: 404 });
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId: group.id,
        payerId,
        payeeId,
        amount: numAmount,
        notes: notes ? notes.trim() : null,
      },
      include: {
        payer: true,
        payee: true,
      },
    });

    return NextResponse.json({ settlement });
  } catch (error) {
    console.error("Error creating settlement:", error);
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
