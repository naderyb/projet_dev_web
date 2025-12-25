import { NextResponse } from "next/server";
import { Pool } from "pg";
import { authOptions } from "../../../lib/auth";
import { broadcastToRole } from "../../../lib/realtime";
import { logger, wrapHandler } from "../../../lib/logger";
import getAuthUser from "../../../lib/getAuthUser";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // find user id
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [authUser.email]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const body = await request.json();
    const { restaurantId, items, total, subtotal, deliveryFee, deliveryAddress, phone, notes } = body;

    // Create order
    const orderInsert = await pool.query(
      `INSERT INTO orders 
        (user_id, restaurant_id, total, subtotal, delivery_fee, delivery_address, phone, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [userId, restaurantId, total, subtotal, deliveryFee ?? 0, deliveryAddress, phone, notes]
    );
    const order = orderInsert.rows[0];

    // Insert order items
    const createdItems: any[] = [];
    for (const item of items || []) {
      const menuItemId = item.menu_item_id ?? item.menuItemId;
      const quantity = item.quantity ?? 1;
      const price = item.price ?? 0;
      const r = await pool.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, price, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
        [order.id, menuItemId, quantity, price]
      );
      createdItems.push(r.rows[0]);
    }

    // Fetch full order with items, restaurant and user info to broadcast
    const fullOrderRes = await pool.query(
      `SELECT o.*, r.name as restaurant_name, u.email as user_email, u.name as user_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [order.id]
    );
    const fullOrder = fullOrderRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT oi.*, mi.name as menu_item_name
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const payload = { ...fullOrder, items: itemsRes.rows };

    // Broadcast to admin and delivery roles so UIs receive update immediately
    try {
      await broadcastToRole("admin", { type: "order:created", order: payload });
      await broadcastToRole("delivery", { type: "order:created", order: payload });
      // also optional broadcast to all
      try { await broadcastToRole("all", { type: "order:created", order: payload }); } catch(_) {}
    } catch (bErr) {
      console.error("Realtime broadcast failed:", bErr);
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const radiusKm = Number(url.searchParams.get("radius") || "10");

    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = authUser.role;

    // Admin: return all orders
    if (role === "admin") {
      const allOrders = await pool.query(
        `SELECT o.*, r.name as restaurant_name, u.email as user_email, u.name as user_name
         FROM orders o
         LEFT JOIN restaurants r ON o.restaurant_id = r.id
         LEFT JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC`
      );
      return NextResponse.json(allOrders.rows);
    }

    // Delivery: assigned to this user OR unassigned ready orders
    if (role === "delivery") {
      const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [authUser.email]);
      if (userRes.rows.length === 0)
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      const userId = userRes.rows[0].id;

      const deliveryOrders = await pool.query(
        `
        SELECT o.*,
               r.name as restaurant_name,
               u.name as customer_name,
               u.phone as customer_phone
        FROM orders o
        LEFT JOIN restaurants r ON o.restaurant_id = r.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE
          (
            o.delivery_user_id = $1
            AND o.status NOT IN ('delivered', 'cancelled')
          )
          OR
          (
            o.delivery_user_id IS NULL
            AND o.status IN ('accepted', 'preparing', 'ready_for_pickup')
          )
        ORDER BY o.created_at DESC
        `,
        [userId]
      );

      return NextResponse.json(deliveryOrders.rows);
    }

    // Customer: return customer's orders
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [authUser.email]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userResult.rows[0].id;
    const customerOrders = await pool.query(
      `SELECT o.*, r.name as restaurant_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return NextResponse.json(customerOrders.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}