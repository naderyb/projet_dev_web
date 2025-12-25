import { NextResponse } from "next/server";
import { Pool } from "pg";
import * as Realtime from "../../../../lib/realtime";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const orderRes = await pool.query(
      `SELECT o.*, r.name AS restaurant_name, u.email AS user_email, u.name AS user_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT oi.*, mi.name as name
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const trackingRes = await pool.query(
      `SELECT * FROM order_tracking WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId]
    );

    return NextResponse.json({
      ...order,
      items: itemsRes.rows,
      tracking: trackingRes.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session as any).user?.role;
    const isAdmin = role === "admin";
    const isDelivery = role === "delivery";

    if (!isAdmin && !isDelivery) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.status) {
      fields.push(`status = $${idx++}`);
      values.push(body.status);
    }
    if (body.payment_status) {
      fields.push(`payment_status = $${idx++}`);
      values.push(body.payment_status);
    }
    // If client requests assignment to a driver
    const assignDriverId = body.assignDeliveryUserId ?? body.assignDriverId;

    if (fields.length === 0 && !assignDriverId) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    let updated: any = null;

    // Update orders table fields if any
    if (fields.length > 0) {
      values.push(orderId);
      const q = `UPDATE orders SET ${fields.join(
        ", "
      )}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
      const res = await pool.query(q, values);
      updated = res.rows[0];
    }

    // Handle assignment: set delivery_user_id + tracking row
    if (assignDriverId) {
      await pool.query(
        `UPDATE orders SET delivery_user_id = $1, updated_at = NOW() WHERE id = $2`,
        [assignDriverId, orderId]
      );

      await pool.query(
        `INSERT INTO order_tracking (order_id, status, notes, created_at) VALUES ($1, $2, $3, NOW())`,
        [orderId, "assigned", `assigned:${assignDriverId}`]
      );

      const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [
        orderId,
      ]);
      updated = orderRes.rows[0];
    }

    // broadcast updates
    try {
      (Realtime as any).broadcastToRole("admin", {
        order: updated || null,
        type: "order:update",
      } as any);
      (Realtime as any).broadcastToRole("delivery", {
        order: updated || null,
        type: "order:update",
      } as any);
      if (assignDriverId) {
        (Realtime as any).broadcastToUser(assignDriverId, {
          order: updated || null,
          type: "order:assigned",
        } as any);
      }
      if (updated?.user_id) {
        (Realtime as any).broadcastToUser(updated.user_id, {
          order: updated,
          type: "order:update",
        } as any);
      }
    } catch (err) {
      console.error("Broadcast failed", err);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    await pool.query("DELETE FROM order_tracking WHERE order_id = $1", [
      orderId,
    ]);
    await pool.query("DELETE FROM orders WHERE id = $1", [orderId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
