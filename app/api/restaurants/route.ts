import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT r.*, 
       COALESCE(AVG(rv.rating), 0) as average_rating,
       COUNT(rv.id) as review_count
       FROM restaurants r
       LEFT JOIN reviews rv ON r.id = rv.restaurant_id
       GROUP BY r.id
       ORDER BY r.name`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Restaurants fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, image, cuisine_type, delivery_time, delivery_fee } = body;

    const result = await pool.query(
      `INSERT INTO restaurants (name, description, image, cuisine_type, delivery_time, delivery_fee, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [name, description, image, cuisine_type, delivery_time, delivery_fee]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Restaurant creation error:", error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
