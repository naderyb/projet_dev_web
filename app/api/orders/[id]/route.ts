import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const orderResult = await pool.query(
      `SELECT o.*, r.name as restaurant_name 
       FROM orders o 
       JOIN restaurants r ON o.restaurant_id = r.id 
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(orderResult.rows[0]);
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const orderResult = await pool.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(orderResult.rows[0]);
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const orderResult = await pool.query(
      "DELETE FROM orders WHERE id = $1 RETURNING *",
      [id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Order deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
