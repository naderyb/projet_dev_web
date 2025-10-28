"use client";

import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface RestaurantCardProps {
  id: string;
  name: string;
  logo?: string;
  type: string;
  location: string;
  rating: number;
}

export default function RestaurantCard({
  id,
  name,
  logo,
  type,
  location,
  rating,
}: RestaurantCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
      <Link href={`/restaurant/${id}`}>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
          <div className="h-48 bg-linear-to-br from-primary to-terracotta flex items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-4xl font-bold">{name[0]}</span>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-2">{name}</h3>
            <p className="text-gray-600 text-sm mb-2">{type}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                {location}
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="ml-1 font-semibold">{rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
