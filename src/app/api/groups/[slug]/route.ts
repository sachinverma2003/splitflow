import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNetBalances, simplifyDebts } from "@/lib/settlement-engine";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        expenses: {
          include: {
            payer: true,
            splits: {
              include: {
                member: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
        settlements: {
          include: {
            payer: true,
            payee: true,
          },
          orderBy: { settledAt: "desc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Prepare inputs for settlement engine
    const membersData = group.members.map((m) => ({
      id: m.id,
      name: m.name,
      upiId: m.upiId,
      phone: m.phone,
      isVirtual: m.isVirtual,
    }));

    const expensesData = group.expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      splits: e.splits.map((s) => ({
        memberId: s.memberId,
        amountOwed: s.amountOwed,
      })),
    }));

    const settlementsData = group.settlements.map((s) => ({
      payerId: s.payerId,
      payeeId: s.payeeId,
      amount: s.amount,
    }));

    // Compute Net Balances
    const netBalances = calculateNetBalances(membersData, expensesData, settlementsData);

    // Compute Simplified Min-Cash-Flow Transactions
    const simplifiedTransactions = simplifyDebts(netBalances, group.name);

    // Compute Total Spend
    const totalSpend = group.expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        currency: group.currency,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
      members: group.members,
      expenses: group.expenses,
      settlements: group.settlements,
      netBalances,
      simplifiedTransactions,
      totalSpend,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}
