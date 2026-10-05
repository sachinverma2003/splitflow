import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-auth";
import { calculateNetBalances, CustomRoute } from "@/lib/settlement-engine";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const adminStatus = await checkAdminStatus(req, slug);

    if (!adminStatus.isAdminLoggedIn) {
      return NextResponse.json(
        {
          error: adminStatus.hasAdmin
            ? "Admin authentication required. Please log in as Admin to direct settlement routes."
            : "Please claim or create an Admin account first to direct settlement routes.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fromMemberId, toMemberId, amount } = body;

    if (!fromMemberId || !toMemberId) {
      return NextResponse.json(
        { error: "Both debtor (payer) and creditor (payee) must be specified." },
        { status: 400 }
      );
    }

    if (fromMemberId === toMemberId) {
      return NextResponse.json(
        { error: "A member cannot pay themselves." },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        members: true,
        expenses: {
          include: { splits: true },
        },
        settlements: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Calculate current net balances
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

    const netBalances = calculateNetBalances(membersData, expensesData, settlementsData);
    const debtorBalance = netBalances.find((b) => b.memberId === fromMemberId);
    const creditorBalance = netBalances.find((b) => b.memberId === toMemberId);

    if (!debtorBalance || !creditorBalance) {
      return NextResponse.json({ error: "One or both members not found in group." }, { status: 400 });
    }

    if (debtorBalance.netBalance >= -0.01) {
      return NextResponse.json(
        { error: `${debtorBalance.name} does not owe any money (net balance is ₹${debtorBalance.netBalance.toFixed(2)}).` },
        { status: 400 }
      );
    }

    if (creditorBalance.netBalance <= 0.01) {
      return NextResponse.json(
        { error: `${creditorBalance.name} is not owed any money (net balance is ₹${creditorBalance.netBalance.toFixed(2)}).` },
        { status: 400 }
      );
    }

    const debtorOwes = Math.abs(debtorBalance.netBalance);
    const creditorReceives = creditorBalance.netBalance;
    const maxPossible = Math.min(debtorOwes, creditorReceives);

    let routeAmount = amount ? parseFloat(amount) : maxPossible;

    if (isNaN(routeAmount) || routeAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid positive payment amount." }, { status: 400 });
    }

    if (routeAmount > maxPossible + 0.01) {
      return NextResponse.json(
        {
          error: `Amount exceeds allowable limit. Maximum directable between ${debtorBalance.name} and ${creditorBalance.name} is ₹${maxPossible.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    routeAmount = Math.min(routeAmount, maxPossible);

    // Parse existing custom routes
    let currentRoutes: CustomRoute[] = [];
    if (group.customRoutes) {
      try {
        currentRoutes = JSON.parse(group.customRoutes);
      } catch {
        currentRoutes = [];
      }
    }

    // Filter out previous route between same pair if exists
    currentRoutes = currentRoutes.filter(
      (r) => !(r.fromMemberId === fromMemberId && r.toMemberId === toMemberId)
    );

    const newRoute: CustomRoute = {
      id: `rt-${Date.now()}`,
      fromMemberId,
      toMemberId,
      amount: parseFloat(routeAmount.toFixed(2)),
    };

    currentRoutes.push(newRoute);

    await prisma.group.update({
      where: { slug },
      data: {
        customRoutes: JSON.stringify(currentRoutes),
      },
    });

    return NextResponse.json({
      success: true,
      customRoutes: currentRoutes,
      message: `Directed ${debtorBalance.name} to pay ₹${newRoute.amount.toFixed(2)} to ${creditorBalance.name}.`,
    });
  } catch (error) {
    console.error("Error directing settlement route:", error);
    return NextResponse.json({ error: "Failed to set custom settlement route" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const adminStatus = await checkAdminStatus(req, slug);

    if (!adminStatus.isAdminLoggedIn) {
      return NextResponse.json(
        { error: "Admin authentication required. Only group Admin can clear custom routes." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    const group = await prisma.group.findUnique({
      where: { slug },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    let currentRoutes: CustomRoute[] = [];
    if (group.customRoutes) {
      try {
        currentRoutes = JSON.parse(group.customRoutes);
      } catch {
        currentRoutes = [];
      }
    }

    let updatedRoutes: CustomRoute[] = [];

    if (!clearAll && routeId) {
      // Remove specific route
      updatedRoutes = currentRoutes.filter((r) => r.id !== routeId && `custom-${r.id}` !== routeId);
    } else {
      // Clear all
      updatedRoutes = [];
    }

    await prisma.group.update({
      where: { slug },
      data: {
        customRoutes: updatedRoutes.length > 0 ? JSON.stringify(updatedRoutes) : null,
      },
    });

    return NextResponse.json({
      success: true,
      customRoutes: updatedRoutes,
      message: clearAll || !routeId ? "All custom routes cleared. Recalculated optimal settlements." : "Custom route unpinned.",
    });
  } catch (error) {
    console.error("Error clearing settlement route:", error);
    return NextResponse.json({ error: "Failed to remove custom route" }, { status: 500 });
  }
}
