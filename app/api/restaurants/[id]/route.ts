import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import getAuthUser from "../../../../lib/getAuthUser";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const res = await pool.query("SELECT * FROM restaurants WHERE id = $1", [id]);
  if (res.rows.length === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(res.rows[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // require admin (NextAuth OR admin_jwt)
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // await params before use
    const { id } = await params;

    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // allowed fields and safe coercion for numeric/boolean types
    const allowed = [
      "name",
      "description",
      "address",
      "phone",
      "email",
      "cuisine_type",
      "delivery_fee",
      "minimum_order",
      "delivery_time_min",
      "delivery_time_max",
      "is_active",
      "delivery_time",
      "opening_hours",
      "owner_id"
    ];

    const numericKeys = new Set([
      "delivery_fee",
      "minimum_order",
      "delivery_time_min",
      "delivery_time_max",
      "owner_id",
    ]);
    const booleanKeys = new Set(["is_active"]);
    // treat these DB columns as JSON; ensure we pass valid JSON text to Postgres
    const jsonKeys = new Set(["opening_hours"]);

    for (const key of allowed) {
      if (body[key] === undefined) continue;

      // Skip empty-string values (treat as "no update")
      if (body[key] === "") continue;

      let val = body[key];

      // normalize numeric fields: null stays null, otherwise Number(...)
      if (numericKeys.has(key)) {
        if (val === null) {
          val = null;
        } else {
          const n = Number(val);
          if (Number.isNaN(n)) {
            return NextResponse.json({ error: `Invalid numeric value for ${key}` }, { status: 400 });
          }
          val = n;
        }
      }

      // normalize boolean-like fields
      if (booleanKeys.has(key)) {
        if (val === null) {
          val = false;
        } else {
          val = (val === true || val === "true" || val === "1" || val === 1);
        }
      }

      // normalize JSON fields: accept objects or strings; ensure we pass valid JSON text
      if (jsonKeys.has(key)) {
        if (val === null) {
          val = null;
        } else if (typeof val === "object") {
          // already an object/array -> stringify
          val = JSON.stringify(val);
        } else if (typeof val === "string") {
          const txt = val.trim();
          // if it already looks like JSON, try to validate; otherwise wrap as JSON string
          if ((txt.startsWith("{") && txt.endsWith("}")) || (txt.startsWith("[") && txt.endsWith("]"))) {
            try {
              // validate parse
              JSON.parse(txt);
              val = txt;
            } catch (_e) {
              // invalid JSON string -> store as JSON string value
              val = JSON.stringify(val);
            }
          } else {
            // plain label like "10h-22h" -> store as JSON string
            val = JSON.stringify(val);
          }
        } else {
          // primitives (number/boolean) -> stringify to JSON
          val = JSON.stringify(val);
        }
      }

      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
    if (fields.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
    values.push(id);
    const q = `UPDATE restaurants SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(q, values);
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error("PUT restaurant error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser || authUser.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await pool.query("DELETE FROM menu_items WHERE restaurant_id = $1", [id]);
  await pool.query("DELETE FROM restaurants WHERE id = $1", [id]);

  return NextResponse.json({ ok: true });
}
