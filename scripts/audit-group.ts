import { prisma } from "../src/lib/prisma";
import { calculateNetBalances, simplifyDebts } from "../src/lib/settlement-engine";

async function main() {
  const group = await prisma.group.findUnique({
    where: { slug: "airbnb-dev" },
    include: {
      members: true,
      expenses: {
        include: { splits: { include: { member: true } }, payer: true },
        orderBy: { date: "asc" },
      },
      settlements: {
        include: { payer: true, payee: true },
      },
    },
  });

  if (!group) return;

  const customRoutes = group.customRoutes ? JSON.parse(group.customRoutes) : [];
  console.log("Custom Routes in DB:", JSON.stringify(customRoutes, null, 2));

  console.log("=== GROUP AUDIT: " + group.name + " (" + group.slug + ") ===");
  console.log("Total Members:", group.members.length);
  console.log("Total Expenses:", group.expenses.length);
  console.log("Total Settlements Recorded:", group.settlements.length);

  let totalGroupSpend = 0;
  let totalSplitsAll = 0;

  console.log("\n--- DETAILED EXPENSE AUDIT ---");
  for (let i = 0; i < group.expenses.length; i++) {
    const e = group.expenses[i];
    totalGroupSpend += e.amount;
    const splitSum = e.splits.reduce((sum, s) => sum + s.amountOwed, 0);
    totalSplitsAll += splitSum;
    const diff = Math.abs(e.amount - splitSum);
    const isPennyAccurate = diff < 0.05;

    console.log(
      `${(i + 1).toString().padStart(2)}. [${e.date.toISOString().split("T")[0]}] "${e.title}" | ₹${e.amount.toFixed(2)} | Paid by: ${e.payer.name.padEnd(8)} | Split: ${e.splitType} (${e.splits.length} people) | SplitSum: ₹${splitSum.toFixed(2)} | Status: ${isPennyAccurate ? "✔ ACCURATE" : "❌ MISMATCH"}`
    );
  }

  console.log("\n--- TOTAL INTEGRITY CHECK ---");
  console.log(`Total Group Spend : ₹${totalGroupSpend.toFixed(2)}`);
  console.log(`Total Splits Sum  : ₹${totalSplitsAll.toFixed(2)}`);
  console.log(`Difference        : ₹${Math.abs(totalGroupSpend - totalSplitsAll).toFixed(2)}`);

  console.log("\n--- NET BALANCES ---");
  const balances = calculateNetBalances(group.members, group.expenses, group.settlements);
  let totalNet = 0;
  for (const b of balances) {
    totalNet += b.netBalance;
    console.log(
      `${b.name.padEnd(10)} | Paid: ₹${b.totalPaid.toFixed(2).padStart(8)} | Share: ₹${b.totalOwed.toFixed(2).padStart(8)} | Net: ${b.netBalance >= 0 ? "+" : ""}₹${b.netBalance.toFixed(2).padStart(8)}`
    );
  }
  console.log(`Sum of Net Balances: ₹${totalNet.toFixed(4)}`);

  console.log("\n--- SETTLEMENT PLAN (MIN CASH FLOW) ---");
  const plan = simplifyDebts(balances, group.name, customRoutes);
  console.log(`Total Transactions Generated: ${plan.length}`);
  plan.forEach((t, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${t.fromMemberName.padEnd(10)} ➔  ${t.toMemberName.padEnd(10)} : ₹${t.amount.toFixed(2)}`
    );
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());


