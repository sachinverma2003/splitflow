import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { group, members, expenses, settlements } = body;

    if (!group?.slug || !group?.name) {
      return NextResponse.json({ error: "Invalid backup data" }, { status: 400 });
    }

    // Check if group already exists
    const existing = await prisma.group.findUnique({
      where: { slug: group.slug },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Group already exists", slug: existing.slug });
    }

    // 1. Create group
    const newGroup = await prisma.group.create({
      data: {
        ...(group.id ? { id: group.id } : {}),
        name: group.name,
        slug: group.slug,
        currency: group.currency || "INR",
      },
    });

    // 2. Create members
    const memberIdMap: Record<string, string> = {};
    if (Array.isArray(members) && members.length > 0) {
      for (const m of members) {
        const createdMember = await prisma.member.create({
          data: {
            ...(m.id ? { id: m.id } : {}),
            name: m.name,
            upiId: m.upiId || null,
            phone: m.phone || null,
            isVirtual: m.isVirtual ?? true,
            groupId: newGroup.id,
          },
        });
        memberIdMap[m.id] = createdMember.id;
      }
    }

    // 3. Create expenses and splits
    if (Array.isArray(expenses) && expenses.length > 0) {
      for (const e of expenses) {
        const resolvedPayerId = memberIdMap[e.payerId] || e.payerId;
        const validSplits = (e.splits || []).filter((s: { memberId: string }) => memberIdMap[s.memberId] || s.memberId);

        await prisma.expense.create({
          data: {
            ...(e.id ? { id: e.id } : {}),
            title: e.title,
            amount: e.amount,
            category: e.category || "General",
            date: new Date(e.date || Date.now()),
            splitType: e.splitType || "EQUAL",
            groupId: newGroup.id,
            payerId: resolvedPayerId,
            splits: {
              create: validSplits.map((s: { memberId: string; amountOwed: number; shareValue?: number | null }) => ({
                memberId: memberIdMap[s.memberId] || s.memberId,
                amountOwed: s.amountOwed,
                shareValue: s.shareValue ?? null,
              })),
            },
          },
        });
      }
    }

    // 4. Create settlements
    if (Array.isArray(settlements) && settlements.length > 0) {
      for (const s of settlements) {
        const payerId = memberIdMap[s.payerId] || s.payerId;
        const payeeId = memberIdMap[s.payeeId] || s.payeeId;

        await prisma.settlement.create({
          data: {
            ...(s.id ? { id: s.id } : {}),
            amount: s.amount,
            payerId,
            payeeId,
            settledAt: new Date(s.settledAt || Date.now()),
            notes: s.notes || null,
            groupId: newGroup.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true, restored: true, slug: newGroup.slug });
  } catch (error) {
    console.error("Error restoring group from client backup:", error);
    return NextResponse.json({ error: "Failed to restore group" }, { status: 500 });
  }
}
