import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    let query = `
      SELECT rv.*, u.name as user_name, r.name as restaurant_name
      FROM reviews rv
      JOIN users u ON rv.user_id = u.id
      JOIN restaurants r ON rv.restaurant_id = r.id
    `;
    const params: any[] = [];

    if (restaurantId) {
      query += ' WHERE rv.restaurant_id = $1';
      params.push(restaurantId);
    }

    query += ' ORDER BY rv.created_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [session.user.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.rows[0].id;
    const { restaurantId, rating, comment } = await request.json();

    // Check if user already reviewed this restaurant
    const existingReview = await pool.query(
      "SELECT id FROM reviews WHERE user_id = $1 AND restaurant_id = $2",
      [userId, restaurantId]
    );

    if (existingReview.rows.length > 0) {
      return NextResponse.json(
        { error: "You have already reviewed this restaurant" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, restaurant_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, restaurantId, rating, comment]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
