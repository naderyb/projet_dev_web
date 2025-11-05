import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;

    // Get restaurant details
    const restaurantResult = await pool.query(
      `SELECT r.*,
       COALESCE(AVG(rv.rating), 0) as average_rating,
       COUNT(rv.id) as review_count
       FROM restaurants r
       LEFT JOIN reviews rv ON r.id = rv.restaurant_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurant = restaurantResult.rows[0];

    // Get menu items
    const menuResult = await pool.query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 
       ORDER BY category, name`,
      [restaurantId]
    );

    // Get recent reviews
    const reviewsResult = await pool.query(
      `SELECT rv.*, u.name as user_name
       FROM reviews rv
       JOIN users u ON rv.user_id = u.id
       WHERE rv.restaurant_id = $1
       ORDER BY rv.created_at DESC
       LIMIT 10`,
      [restaurantId]
    );

    return NextResponse.json({
      ...restaurant,
      menu_items: menuResult.rows,
      reviews: reviewsResult.rows
    });
  } catch (error) {
    console.error("Restaurant fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}
