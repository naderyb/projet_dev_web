"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import UserGreeting from "../components/greeting";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationLinks = [
    { href: "/", label: "Home" },
    { href: "/restaurants", label: "Restaurants" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "nav-glass shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-xl font-poppins">
                  T
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-poppins text-gray-900 group-hover:text-orange-500 transition-colors">
                Tbib El Jou3
              </span>
              <span className="text-xs text-gray-500 font-poppins">
                طبيب الجوع
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-orange-500 font-medium transition-colors relative group font-poppins"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* My Orders Link (visible when logged in) */}
            {session && (
              <Link
                href="/orders"
                className="text-gray-700 hover:text-orange-500 font-medium transition-colors relative group font-poppins hidden lg:inline-block"
              >
                My Orders
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            )}

            {/* User Section */}
            {session ? (
              <UserGreeting />
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/signin"
                  className="text-gray-700 hover:text-orange-500 font-medium transition-colors font-poppins"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all transform hover:scale-105 font-poppins font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm"
            >
              <div className="py-4 space-y-2">
                {/* Mobile User Greeting */}
                {session && (
                  <div className="px-4 py-3 border-b border-gray-200">
                    <UserGreeting />
                  </div>
                )}

                {/* Mobile Navigation Links */}
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-3 text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-colors font-poppins"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Mobile My Orders Link */}
                {session && (
                  <Link
                    href="/orders"
                    className="block px-4 py-3 text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-colors font-poppins"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                )}

                {/* Mobile Auth Links */}
                {!session && (
                  <div className="px-4 py-3 space-y-3 border-t border-gray-200">
                    <Link
                      href="/signin"
                      className="block text-center py-2 text-gray-700 hover:text-orange-500 transition-colors font-poppins"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block text-center bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:shadow-lg transition-all font-poppins font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}

                {/* Mobile Location */}
                <button className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-colors w-full text-left font-poppins">
                  <MapPin className="w-5 h-5" />
                  <span>Change Location</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
