"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, User, Search, Menu } from "lucide-react";

export default function Header() {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-white shadow-md sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold text-terracotta-600"
          >
            🍽️ طبيب الجوع
          </motion.div>
        </Link>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث عن مطعم أو وجبة..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracotta-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/restaurants"
            className="text-gray-700 hover:text-terracotta-600 transition-colors"
          >
            المطاعم
          </Link>
          <Link
            href="/cart"
            className="relative p-2 text-gray-700 hover:text-terracotta-600 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-terracotta-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </Link>
          <Link
            href="/profile"
            className="p-2 text-gray-700 hover:text-terracotta-600 transition-colors"
          >
            <User className="w-6 h-6" />
          </Link>
        </nav>

        {/* Mobile Menu */}
        <button className="md:hidden p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </motion.header>
  );
}
