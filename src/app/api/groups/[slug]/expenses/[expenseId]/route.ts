import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-auth";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string; expenseId: string }> }
) {
  try {
    const { slug, expenseId } = await context.params;

    const group = await prisma.group.findUnique({
      where: { slug },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check admin permissions if group has an admin
    const adminStatus = await checkAdminStatus(req, slug);
    if (adminStatus.hasAdmin && !adminStatus.isAdminLoggedIn) {
      return NextResponse.json(
        { error: "Admin access required. Only the group admin can delete expenses." },
        { status: 403 }
      );
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ slug: string; expenseId: string }> }
) {
  try {
    const { slug, expenseId } = await context.params;
    const body = await req.json();
    const { title, amount, category, payerId, splitType, splits, date } = body;

    const group = await prisma.group.findUnique({
      where: { slug },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check admin permissions if group has an admin
    const adminStatus = await checkAdminStatus(req, slug);
    if (adminStatus.hasAdmin && !adminStatus.isAdminLoggedIn) {
      return NextResponse.json(
        { error: "Admin access required. Only the group admin can edit expenses." },
        { status: 403 }
      );
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Transaction to update expense and recreate splits
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete existing splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId },
      });

      // 2. Update expense
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: title.trim(),
          amount: parseFloat(amount),
          category: category || "General",
          payerId,
          splitType: splitType || "EQUAL",
          date: date ? new Date(date) : existingExpense.date,
          splits: {
            create: (splits || []).map((s: { memberId: string; amountOwed: number; shareValue?: number }) => ({
              memberId: s.memberId,
              amountOwed: s.amountOwed,
              shareValue: s.shareValue ?? null,
            })),
          },
        },
        include: {
          splits: true,
          payer: true,
        },
      });

      return expense;
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}
