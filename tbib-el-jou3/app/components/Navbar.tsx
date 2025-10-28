"use client";

import Link from "next/link";
import { ShoppingCart, User, Menu } from "lucide-react";
import { useCartStore } from "../../lib/store";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { items } = useCartStore();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold font-arabic text-deepblue">
              Tbib El Jou3
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/restaurants" className="hover:text-primary transition">
              Restaurants
            </Link>
            <Link
              href="/cart"
              className="relative hover:text-primary transition"
            >
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-terracotta text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {items.length}
                </span>
              )}
            </Link>
            {session ? (
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  <User className="w-6 h-6" />
                  <span>{session.user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link
                    href="/orders"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-2">
            <Link href="/restaurants" className="block py-2">
              Restaurants
            </Link>
            <Link href="/cart" className="block py-2">
              Cart ({items.length})
            </Link>
            {session ? (
              <>
                <Link href="/orders" className="block py-2">
                  My Orders
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block py-2 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/auth/signin" className="block py-2">
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
