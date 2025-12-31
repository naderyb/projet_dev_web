"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Play, Star, Users, Clock } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  const stats = [
    { icon: <Users className="w-6 h-6" />, value: "50K+", label: "Happy Customers" },
    { icon: <Star className="w-6 h-6" />, value: "4.9", label: "Average Rating" },
    { icon: <Clock className="w-6 h-6" />, value: "15min", label: "Delivery Time" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Content */}
      <div className="container mx-auto px-4 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-block bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6"
            >
              🎉 Now delivering in 25+ cities
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Authentic
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                {" "}Algerian{" "}
              </span>
              Cuisine
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-xl text-gray-600 mb-8 max-w-2xl"
            >
              Experience the rich flavors of Algeria delivered fresh to your doorstep. 
              From traditional couscous to savory tagines, taste the heritage in every bite.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <Link href="/restaurants" className="btn-primary group">
                Order Now
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="grid grid-cols-3 gap-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-2 text-blue-600">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative z-10">
              {/* Placeholder for food image - you can replace with actual image */}
              <div className="w-full aspect-square bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-3xl flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
                🥘
              </div>
              
              {/* Floating cards */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -left-4 glass-card p-4 shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-semibold">4.9 Rating</span>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -right-4 glass-card p-4 shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">15 min</span>
                </div>
              </motion.div>
            </div>

            {/* Background decorations */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl"></div>
              <div className="absolute top-3/4 left-1/2 w-20 h-20 bg-orange-400/20 rounded-full blur-xl"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}