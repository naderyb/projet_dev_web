import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Pool } from "pg";

// Use the exact same pool configuration as your orders route
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json();

    console.log("Registration attempt for:", email);

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user - match the exact column order from your orders route
    const result = await pool.query(
      "INSERT INTO users (name, email, phone, password, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email",
      [name, email, phone, hashedPassword]
    );

    const user = result.rows[0];
    console.log("User created successfully:", user.email);

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
