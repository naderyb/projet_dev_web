import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await pool.query(
          "SELECT id, email, password, name, role FROM users WHERE email = $1",
          [credentials.email]
        );
        if (res.rows.length === 0) return null;
        const user = res.rows[0];
        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role || "customer",
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // When user is present (on sign-in), ensure token carries userId and role
      if (user) {
        // user.id may be string or number depending on provider/authorize
        token.userId = (user as any).id ?? token.sub;
        token.role = (user as any).role ?? token.role ?? "customer";
      } else {
        // keep existing token values or defaults
        token.userId = token.userId ?? token.sub;
        token.role = token.role ?? "customer";
      }
      return token;
    },
    async session({ session, token }) {
      // Populate session.user with id and role from token, avoid noisy logging
      (session as any).user = {
        ...(session as any).user,
        id: token.userId,
        role: token.role ?? "customer",
      };
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [user.email]
          );

          if (existingUser.rows.length === 0) {
            await pool.query(
              "INSERT INTO users (email, name, provider, provider_id, email_verified, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
              [user.email, user.name, "google", user.id, true, "customer"]
            );
          }
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/signin",
    newUser: "/signup",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
