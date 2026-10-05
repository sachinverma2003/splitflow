import Decimal from "decimal.js";

// Configure Decimal precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface MemberBalance {
  memberId: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
  isVirtual: boolean;
  totalPaid: number;      // Expenses paid + Settlements paid
  totalOwed: number;      // Splits owed + Settlements received
  netBalance: number;     // totalPaid - totalOwed (> 0 gets back, < 0 owes)
}

export interface SimplifiedTransaction {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  toUpiId?: string | null;
  toPhone?: string | null;
  amount: number;
  upiPaymentLink?: string;
  isCustomRoute?: boolean;
}

export interface CustomRoute {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface ParticipantInput {
  memberId: string;
  shareValue?: number;
}

export interface CalculatedSplit {
  memberId: string;
  amountOwed: number;
  shareValue?: number;
}

/**
 * 1. Net Balance Calculation
 * Net Balance = Sum(Expenses Paid) + Sum(Settlement Payments Made)
 *             - Sum(Splits Allocated) - Sum(Settlement Payments Received)
 */
export function calculateNetBalances(
  members: { id: string; name: string; upiId?: string | null; phone?: string | null; isVirtual?: boolean }[],
  expenses: { payerId: string; amount: number; splits: { memberId: string; amountOwed: number }[] }[],
  settlements: { payerId: string; payeeId: string; amount: number }[]
): MemberBalance[] {
  const memberMap = new Map<string, {
    member: typeof members[0];
    expensesPaid: Decimal;
    settlementsPaid: Decimal;
    splitsAllocated: Decimal;
    settlementsReceived: Decimal;
  }>();

  for (const m of members) {
    memberMap.set(m.id, {
      member: m,
      expensesPaid: new Decimal(0),
      settlementsPaid: new Decimal(0),
      splitsAllocated: new Decimal(0),
      settlementsReceived: new Decimal(0),
    });
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    const payerData = memberMap.get(exp.payerId);
    if (payerData) {
      payerData.expensesPaid = payerData.expensesPaid.plus(new Decimal(exp.amount));
    }

    for (const split of exp.splits) {
      const splitMember = memberMap.get(split.memberId);
      if (splitMember) {
        splitMember.splitsAllocated = splitMember.splitsAllocated.plus(new Decimal(split.amountOwed));
      }
    }
  }

  // 2. Process Settlements
  for (const st of settlements) {
    const payerData = memberMap.get(st.payerId);
    if (payerData) {
      payerData.settlementsPaid = payerData.settlementsPaid.plus(new Decimal(st.amount));
    }
    const payeeData = memberMap.get(st.payeeId);
    if (payeeData) {
      payeeData.settlementsReceived = payeeData.settlementsReceived.plus(new Decimal(st.amount));
    }
  }

  // 3. Compute Net Balances
  return Array.from(memberMap.values()).map(({ member, expensesPaid, settlementsPaid, splitsAllocated, settlementsReceived }) => {
    const totalPaid = expensesPaid.plus(settlementsPaid);
    const totalOwed = splitsAllocated.plus(settlementsReceived);
    const netBalance = totalPaid.minus(totalOwed);

    return {
      memberId: member.id,
      name: member.name,
      upiId: member.upiId ?? null,
      phone: member.phone ?? null,
      isVirtual: member.isVirtual ?? true,
      totalPaid: totalPaid.toDecimalPlaces(2).toNumber(),
      totalOwed: totalOwed.toDecimalPlaces(2).toNumber(),
      netBalance: netBalance.toDecimalPlaces(2).toNumber(),
    };
  });
}

/**
 * 2. Min-Cash-Flow Greedy Matching Engine
 * Takes net balances and computes the minimum number of transactions
 * required to completely settle all debts in the group.
 */
export function simplifyDebts(
  balances: MemberBalance[],
  groupName?: string,
  customRoutes?: CustomRoute[]
): SimplifiedTransaction[] {
  interface Party {
    memberId: string;
    name: string;
    upiId?: string | null;
    phone?: string | null;
    balance: Decimal;
  }

  const partyMap = new Map<string, Party>();
  for (const b of balances) {
    partyMap.set(b.memberId, {
      memberId: b.memberId,
      name: b.name,
      upiId: b.upiId,
      phone: b.phone,
      balance: new Decimal(b.netBalance),
    });
  }

  const transactions: SimplifiedTransaction[] = [];

  // 1. Process custom routes designated by Admin first
  if (customRoutes && customRoutes.length > 0) {
    for (const route of customRoutes) {
      const debtor = partyMap.get(route.fromMemberId);
      const creditor = partyMap.get(route.toMemberId);

      if (!debtor || !creditor) continue;

      const debtorRemainingDebt = debtor.balance.lessThan(-0.01) ? debtor.balance.abs() : new Decimal(0);
      const creditorRemainingCredit = creditor.balance.greaterThan(0.01) ? creditor.balance : new Decimal(0);

      const effectiveAmount = Decimal.min(
        new Decimal(route.amount),
        debtorRemainingDebt,
        creditorRemainingCredit
      ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      if (effectiveAmount.greaterThan(0.009)) {
        const upiLink = creditor.upiId
          ? generateUpiLink({
              upiId: creditor.upiId,
              name: creditor.name,
              amount: effectiveAmount.toNumber(),
              groupName,
            })
          : undefined;

        transactions.push({
          id: `custom-${route.id}`,
          fromMemberId: debtor.memberId,
          fromMemberName: debtor.name,
          toMemberId: creditor.memberId,
          toMemberName: creditor.name,
          toUpiId: creditor.upiId,
          toPhone: creditor.phone,
          amount: effectiveAmount.toNumber(),
          upiPaymentLink: upiLink,
          isCustomRoute: true,
        });

        // Deduct from balances (debtor was negative, so + adds toward 0; creditor was positive, so - subtracts toward 0)
        debtor.balance = debtor.balance.plus(effectiveAmount);
        creditor.balance = creditor.balance.minus(effectiveAmount);
      }
    }
  }

  // 2. Partition remaining balances into debtors and creditors
  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const party of partyMap.values()) {
    if (party.balance.lessThan(-0.01)) {
      debtors.push(party);
    } else if (party.balance.greaterThan(0.01)) {
      creditors.push(party);
    }
  }

  let txIndex = 1;

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort debtors ascending (most negative first, e.g. -500 before -100)
    debtors.sort((a, b) => a.balance.minus(b.balance).toNumber());
    // Sort creditors descending (most positive first, e.g. 500 before 100)
    creditors.sort((a, b) => b.balance.minus(a.balance).toNumber());

    const topDebtor = debtors[0];
    const topCreditor = creditors[0];

    const debtorOwes = topDebtor.balance.abs();
    const creditorReceives = topCreditor.balance;

    const settleAmount = Decimal.min(debtorOwes, creditorReceives).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    if (settleAmount.greaterThan(0.009)) {
      const upiLink = topCreditor.upiId
        ? generateUpiLink({
            upiId: topCreditor.upiId,
            name: topCreditor.name,
            amount: settleAmount.toNumber(),
            groupName,
          })
        : undefined;

      transactions.push({
        id: `tx-${txIndex++}-${topDebtor.memberId}-${topCreditor.memberId}`,
        fromMemberId: topDebtor.memberId,
        fromMemberName: topDebtor.name,
        toMemberId: topCreditor.memberId,
        toMemberName: topCreditor.name,
        toUpiId: topCreditor.upiId,
        toPhone: topCreditor.phone,
        amount: settleAmount.toNumber(),
        upiPaymentLink: upiLink,
        isCustomRoute: false,
      });
    }

    // Adjust balances
    topDebtor.balance = topDebtor.balance.plus(settleAmount);
    topCreditor.balance = topCreditor.balance.minus(settleAmount);

    if (topDebtor.balance.abs().lessThan(0.01)) {
      debtors.shift();
    }
    if (topCreditor.balance.lessThan(0.01)) {
      creditors.shift();
    }
  }

  return transactions;
}

/**
 * 3. Split Allocation Engine
 * Supports EQUAL, EXACT, PERCENTAGE, and SHARES with penny-perfect round-off absorption.
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: ParticipantInput[],
  payerId?: string
): CalculatedSplit[] {
  if (participants.length === 0) return [];

  const total = new Decimal(totalAmount);
  if (total.lessThanOrEqualTo(0)) {
    return participants.map((p) => ({
      memberId: p.memberId,
      amountOwed: 0,
      shareValue: p.shareValue,
    }));
  }

  const results: CalculatedSplit[] = [];

  switch (splitType) {
    case "EQUAL": {
      const count = new Decimal(participants.length);
      const baseShare = total.dividedBy(count).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      const remainder = total.minus(baseShare.times(count));

      // Absorb remainder to payer if part of participants, or first participant
      let absorbed = false;
      const targetAbsorptionId = participants.some((p) => p.memberId === payerId)
        ? payerId
        : participants[0].memberId;

      for (const p of participants) {
        let memberShare = baseShare;
        if (!absorbed && p.memberId === targetAbsorptionId) {
          memberShare = memberShare.plus(remainder);
          absorbed = true;
        }
        results.push({
          memberId: p.memberId,
          amountOwed: memberShare.toDecimalPlaces(2).toNumber(),
          shareValue: 1,
        });
      }
      break;
    }

    case "EXACT": {
      for (const p of participants) {
        const val = new Decimal(p.shareValue || 0).toDecimalPlaces(2);
        results.push({
          memberId: p.memberId,
          amountOwed: val.toNumber(),
          shareValue: val.toNumber(),
        });
      }
      break;
    }

    case "PERCENTAGE": {
      let allocatedTotal = new Decimal(0);
      const shares: { memberId: string; amount: Decimal; pct: number }[] = [];

      for (const p of participants) {
        const pct = new Decimal(p.shareValue || 0);
        const amount = total.times(pct).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        allocatedTotal = allocatedTotal.plus(amount);
        shares.push({ memberId: p.memberId, amount, pct: pct.toNumber() });
      }

      const remainder = total.minus(allocatedTotal);
      const targetId = participants.some((p) => p.memberId === payerId)
        ? payerId
        : participants[0].memberId;

      for (const s of shares) {
        let finalAmt = s.amount;
        if (s.memberId === targetId && remainder.greaterThan(0)) {
          finalAmt = finalAmt.plus(remainder);
        }
        results.push({
          memberId: s.memberId,
          amountOwed: finalAmt.toDecimalPlaces(2).toNumber(),
          shareValue: s.pct,
        });
      }
      break;
    }

    case "SHARES": {
      let totalShares = new Decimal(0);
      for (const p of participants) {
        totalShares = totalShares.plus(new Decimal(p.shareValue || 1));
      }

      if (totalShares.isZero()) {
        totalShares = new Decimal(participants.length);
      }

      let allocatedTotal = new Decimal(0);
      const sharesList: { memberId: string; amount: Decimal; share: number }[] = [];

      for (const p of participants) {
        const shareCount = new Decimal(p.shareValue || 1);
        const amount = total.times(shareCount).dividedBy(totalShares).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        allocatedTotal = allocatedTotal.plus(amount);
        sharesList.push({ memberId: p.memberId, amount, share: shareCount.toNumber() });
      }

      const remainder = total.minus(allocatedTotal);
      const targetId = participants.some((p) => p.memberId === payerId)
        ? payerId
        : participants[0].memberId;

      for (const s of sharesList) {
        let finalAmt = s.amount;
        if (s.memberId === targetId && remainder.greaterThan(0)) {
          finalAmt = finalAmt.plus(remainder);
        }
        results.push({
          memberId: s.memberId,
          amountOwed: finalAmt.toDecimalPlaces(2).toNumber(),
          shareValue: s.share,
        });
      }
      break;
    }
  }

  return results;
}

/**
 * 4. Direct UPI Deep-Linking
 * Generates valid standard UPI payment URI
 */
export function generateUpiLink({
  upiId,
  name,
  amount,
  groupName,
}: {
  upiId: string;
  name: string;
  amount: number;
  groupName?: string;
}): string {
  const cleanUpi = upiId.trim();
  const payeeName = encodeURIComponent(name.trim());
  const formattedAmount = amount.toFixed(2);
  const note = encodeURIComponent(`${groupName ? groupName.trim() + " - " : ""}SplitFlow Settlement`);

  return `upi://pay?pa=${cleanUpi}&pn=${payeeName}&am=${formattedAmount}&cu=INR&tn=${note}`;
}

/**
 * 5. Automated WhatsApp Ledger Summary Generator
 */
export function generateWhatsAppSummary({
  groupName,
  groupUrl,
  totalSpend,
  simplifiedTransactions,
}: {
  groupName: string;
  groupUrl: string;
  totalSpend: number;
  simplifiedTransactions: SimplifiedTransaction[];
}): string {
  const formattedSpend = totalSpend.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const lines = [
    `📊 *Expense Summary for ${groupName}*`,
    `Total Group Spend: ₹${formattedSpend}`,
    ``,
    `💸 *Settlement Plan (Simplified)*:`,
  ];

  if (simplifiedTransactions.length === 0) {
    lines.push(`✨ *All settled up!* Nobody owes any balance.`);
  } else {
    simplifiedTransactions.forEach((tx) => {
      const formattedAmt = tx.amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const upiTag = tx.toUpiId ? ` (UPI: ${tx.toUpiId})` : "";
      lines.push(`• *${tx.fromMemberName}* pays *${tx.toMemberName}*: ₹${formattedAmt}${upiTag}`);
    });
  }

  lines.push(``);
  lines.push(`🔗 *View breakdown & pay directly on SplitFlow:*`);
  lines.push(groupUrl);

  return lines.join("\n");
}
