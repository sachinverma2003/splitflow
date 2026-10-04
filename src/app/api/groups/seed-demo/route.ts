import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { calculateSplits } from "@/lib/settlement-engine";

export async function POST() {
  try {
    const slug = generateSlug("goa-beach-trip");

    // Create group with 4 members
    const group = await prisma.group.create({
      data: {
        name: "Goa Beach Trip 🏖️",
        slug,
        currency: "INR",
        members: {
          create: [
            { name: "Sachin (You)", upiId: "sachin@okhdfcbank", phone: "+91 98765 43210", isVirtual: false },
            { name: "Rahul", upiId: "rahul@oksbi", phone: "+91 98111 22233", isVirtual: true },
            { name: "Amit", upiId: "amit@icici", phone: "+91 98444 55566", isVirtual: true },
            { name: "Priya", upiId: "priya@paytm", phone: "+91 98999 88877", isVirtual: true },
          ],
        },
      },
      include: {
        members: true,
      },
    });

    const mSachin = group.members.find((m) => m.name.includes("Sachin"))!;
    const mRahul = group.members.find((m) => m.name === "Rahul")!;
    const mAmit = group.members.find((m) => m.name === "Amit")!;
    const mPriya = group.members.find((m) => m.name === "Priya")!;

    // 1. Villa Booking: Sachin paid ₹12,000 for all 4 (Equal)
    const exp1Splits = calculateSplits(
      12000,
      "EQUAL",
      [{ memberId: mSachin.id }, { memberId: mRahul.id }, { memberId: mAmit.id }, { memberId: mPriya.id }],
      mSachin.id
    );
    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: mSachin.id,
        title: "Beachside Villa (2 Nights)",
        category: "Stay",
        amount: 12000,
        splitType: "EQUAL",
        splits: {
          create: exp1Splits.map((s) => ({
            memberId: s.memberId,
            amountOwed: s.amountOwed,
            shareValue: s.shareValue,
          })),
        },
      },
    });

    // 2. Dinner at Fisherman's Wharf: Rahul paid ₹4,800 for all 4 (Equal)
    const exp2Splits = calculateSplits(
      4800,
      "EQUAL",
      [{ memberId: mSachin.id }, { memberId: mRahul.id }, { memberId: mAmit.id }, { memberId: mPriya.id }],
      mRahul.id
    );
    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: mRahul.id,
        title: "Seafood Feast @ Fisherman's Wharf",
        category: "Food",
        amount: 4800,
        splitType: "EQUAL",
        splits: {
          create: exp2Splits.map((s) => ({
            memberId: s.memberId,
            amountOwed: s.amountOwed,
            shareValue: s.shareValue,
          })),
        },
      },
    });

    // 3. Self-Drive Thar Rental: Amit paid ₹6,000 (Sachin, Rahul, Amit)
    const exp3Splits = calculateSplits(
      6000,
      "EQUAL",
      [{ memberId: mSachin.id }, { memberId: mRahul.id }, { memberId: mAmit.id }],
      mAmit.id
    );
    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: mAmit.id,
        title: "Self-Drive Thar 4x4",
        category: "Travel",
        amount: 6000,
        splitType: "EQUAL",
        splits: {
          create: exp3Splits.map((s) => ({
            memberId: s.memberId,
            amountOwed: s.amountOwed,
            shareValue: s.shareValue,
          })),
        },
      },
    });

    // 4. Sunset Drinks & Cocktails: Priya paid ₹3,200 (Custom Shares: Rahul & Amit had extra cocktails: 2 shares, Sachin & Priya: 1 share)
    const exp4Splits = calculateSplits(
      3200,
      "SHARES",
      [
        { memberId: mSachin.id, shareValue: 1 },
        { memberId: mRahul.id, shareValue: 2 },
        { memberId: mAmit.id, shareValue: 2 },
        { memberId: mPriya.id, shareValue: 1 },
      ],
      mPriya.id
    );
    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: mPriya.id,
        title: "Sunset Cocktails at Curlies",
        category: "Drinks",
        amount: 3200,
        splitType: "SHARES",
        splits: {
          create: exp4Splits.map((s) => ({
            memberId: s.memberId,
            amountOwed: s.amountOwed,
            shareValue: s.shareValue,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, slug: group.slug });
  } catch (error) {
    console.error("Error creating demo group:", error);
    return NextResponse.json({ error: "Failed to create demo group" }, { status: 500 });
  }
}
