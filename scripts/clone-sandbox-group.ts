import { prisma } from "../src/lib/prisma";

async function main() {
  const sourceSlug = "airbnb-lh7o";
  const targetSlug = "airbnb-dev";
  const targetName = "Airbnb (Dev Sandbox)";

  console.log(`Cloning group '${sourceSlug}' to '${targetSlug}'...`);

  // 1. Fetch Source Group
  const source = await prisma.group.findUnique({
    where: { slug: sourceSlug },
    include: {
      members: true,
      expenses: {
        include: { splits: true },
        orderBy: { date: "asc" },
      },
      settlements: true,
    },
  });

  if (!source) {
    console.error(`Source group '${sourceSlug}' not found!`);
    return;
  }

  // 2. Check if target already exists; if so, clean up cleanly
  const existingTarget = await prisma.group.findUnique({
    where: { slug: targetSlug },
  });

  if (existingTarget) {
    console.log(`Target group '${targetSlug}' already exists. Recreating...`);
    await prisma.group.delete({ where: { slug: targetSlug } });
  }

  // 3. Create Target Group
  const targetGroup = await prisma.group.create({
    data: {
      slug: targetSlug,
      name: targetName,
      currency: source.currency,
      adminPasswordHash: source.adminPasswordHash,
    },
  });

  // 4. Map Members
  const memberIdMap = new Map<string, string>();
  for (const m of source.members) {
    const newMember = await prisma.member.create({
      data: {
        name: m.name,
        upiId: m.upiId,
        phone: m.phone,
        isVirtual: m.isVirtual,
        isAdmin: m.isAdmin,
        groupId: targetGroup.id,
      },
    });
    memberIdMap.set(m.id, newMember.id);
  }

  // 5. Update adminMemberId on target group if set
  if (source.adminMemberId && memberIdMap.has(source.adminMemberId)) {
    await prisma.group.update({
      where: { id: targetGroup.id },
      data: { adminMemberId: memberIdMap.get(source.adminMemberId) },
    });
  }

  // 6. Map and Create Expenses with nested splits in batches
  for (const exp of source.expenses) {
    const newPayerId = memberIdMap.get(exp.payerId);
    if (!newPayerId) continue;

    const validSplits = exp.splits
      .map((s) => ({
        memberId: memberIdMap.get(s.memberId),
        amountOwed: s.amountOwed,
        shareValue: s.shareValue,
      }))
      .filter((s): s is { memberId: string; amountOwed: number; shareValue: number | null } => !!s.memberId);

    await prisma.expense.create({
      data: {
        title: exp.title,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        splitType: exp.splitType,
        groupId: targetGroup.id,
        payerId: newPayerId,
        splits: {
          create: validSplits,
        },
      },
    });
  }

  // 7. Map and Create Settlements
  const validSettlements = source.settlements
    .map((st) => ({
      groupId: targetGroup.id,
      payerId: memberIdMap.get(st.payerId)!,
      payeeId: memberIdMap.get(st.payeeId)!,
      amount: st.amount,
      notes: st.notes,
      settledAt: st.settledAt,
    }))
    .filter((st) => st.payerId && st.payeeId);

  if (validSettlements.length > 0) {
    await prisma.settlement.createMany({
      data: validSettlements,
    });
  }

  // 8. Map Custom Routes if any
  if (source.customRoutes) {
    try {
      const routes = JSON.parse(source.customRoutes);
      const mappedRoutes = routes.map((r: any) => ({
        ...r,
        fromMemberId: memberIdMap.get(r.fromMemberId) || r.fromMemberId,
        toMemberId: memberIdMap.get(r.toMemberId) || r.toMemberId,
      }));
      await prisma.group.update({
        where: { id: targetGroup.id },
        data: { customRoutes: JSON.stringify(mappedRoutes) },
      });
    } catch (e) {
      console.warn("Could not parse or map custom routes:", e);
    }
  }

  console.log(`✔ Sandbox group '${targetSlug}' created successfully!`);
  console.log(`Members copied: ${source.members.length}`);
  console.log(`Expenses copied: ${source.expenses.length}`);
  console.log(`Settlements copied: ${source.settlements.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
