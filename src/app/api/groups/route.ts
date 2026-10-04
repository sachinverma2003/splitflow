import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, currency = "INR", members = [] } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    let slug = generateSlug(name);
    // Ensure slug uniqueness
    let existing = await prisma.group.findUnique({ where: { slug } });
    while (existing) {
      slug = generateSlug(name);
      existing = await prisma.group.findUnique({ where: { slug } });
    }

    // Default members if provided or default 2 members
    const memberNames: string[] = Array.isArray(members) && members.length > 0
      ? members.map((m: string) => m.trim()).filter(Boolean)
      : ["You", "Friend"];

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        slug,
        currency,
        members: {
          create: memberNames.map((mName) => ({
            name: mName,
            isVirtual: true,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ group, slug: group.slug });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
