"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Clock, Truck } from "lucide-react";
import { Restaurant } from "../lib/db";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden card-hover"
    >
      <Link href={`/restaurant/${restaurant.id}`}>
        <div className="relative h-48 bg-gradient-to-br from-sand-200 to-terracotta-200">
          {/* Placeholder for restaurant image */}
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🏪
          </div>
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{restaurant.rating}</span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {restaurant.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {restaurant.description}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{restaurant.delivery_time}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Truck className="w-4 h-4" />
              <span>{restaurant.delivery_fee} دج</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs bg-mint-100 text-mint-800 px-3 py-1 rounded-full">
              {restaurant.cuisine_type}
            </span>
            <span className="text-sm text-gray-600">
              أقل طلب: {restaurant.min_order} دج
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
