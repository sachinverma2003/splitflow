import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSplits, SplitType } from "@/lib/settlement-engine";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const {
      title,
      amount,
      category = "General",
      payerId,
      splitType = "EQUAL",
      participants = [],
      splits: customSplits,
      date,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Expense title is required" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    if (!payerId) {
      return NextResponse.json({ error: "Payer must be selected" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const payer = group.members.find((m) => m.id === payerId);
    if (!payer) {
      return NextResponse.json({ error: "Selected payer is not a member of this group" }, { status: 400 });
    }

    // Determine splits: if customSplits provided, use them; otherwise calculate via calculateSplits
    let finalSplits: { memberId: string; amountOwed: number; shareValue?: number }[] = [];

    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      finalSplits = customSplits.map((s) => ({
        memberId: s.memberId,
        amountOwed: Number(s.amountOwed),
        shareValue: s.shareValue !== undefined ? Number(s.shareValue) : undefined,
      }));
    } else {
      // Calculate from participants
      const validParticipants = Array.isArray(participants) && participants.length > 0
        ? participants
        : group.members.map((m) => ({ memberId: m.id, shareValue: 1 }));

      finalSplits = calculateSplits(
        numAmount,
        splitType as SplitType,
        validParticipants,
        payerId
      );
    }

    if (finalSplits.length === 0) {
      return NextResponse.json({ error: "Expense must have at least one participant" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId,
        title: title.trim(),
        amount: numAmount,
        category: category.trim(),
        splitType: splitType,
        date: date ? new Date(date) : new Date(),
        splits: {
          create: finalSplits.map((s) => ({
            memberId: s.memberId,
            amountOwed: s.amountOwed,
            shareValue: s.shareValue,
          })),
        },
      },
      include: {
        payer: true,
        splits: {
          include: { member: true },
        },
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
