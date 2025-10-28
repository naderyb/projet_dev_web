import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { restaurantId, rating, comment } = body;

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        restaurantId,
        rating,
        comment,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    // Update restaurant rating
    const reviews = await prisma.review.findMany({
      where: { restaurantId },
    });
    const total = reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0);
    const avgRating = reviews.length ? total / reviews.length : 0;

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { rating: avgRating },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
