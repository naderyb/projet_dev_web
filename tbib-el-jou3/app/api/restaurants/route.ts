import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const restaurants = await prisma.restaurant.findMany({
      where: type ? { type } : undefined,
      include: {
        menuItems: true,
        _count: {
          select: { reviews: true },
        },
      },
    });

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch restaurants",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logo, type, location, description, phone } = body;

    const restaurant = await prisma.restaurant.create({
      data: { name, logo, type, location, description, phone },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
