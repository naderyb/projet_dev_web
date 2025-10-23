"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Header from "../../components/Header";
import RestaurantCard from "../../components/RestaurantCard";
import { mockRestaurants } from "../../lib/mock-data";
import { Filter } from "lucide-react";

export default function RestaurantsPage() {
  const [selectedCuisine, setSelectedCuisine] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const cuisineTypes = [
    "all",
    ...new Set(mockRestaurants.map((r) => r.cuisine_type)),
  ];
  const cities = ["all", ...new Set(mockRestaurants.map((r) => r.city))];

  const filteredRestaurants = mockRestaurants.filter((restaurant) => {
    const cuisineMatch =
      selectedCuisine === "all" || restaurant.cuisine_type === selectedCuisine;
    const cityMatch =
      selectedCity === "all" || restaurant.city === selectedCity;
    return cuisineMatch && cityMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            جميع المطاعم
          </h1>

          {/* Filters */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-gray-600" />
              <h3 className="text-lg font-semibold">فلترة النتائج</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع المطبخ
                </label>
                <select
                  value={selectedCuisine}
                  onChange={(e) => setSelectedCuisine(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracotta-500"
                >
                  <option value="all">جميع الأنواع</option>
                  {cuisineTypes.slice(1).map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracotta-500"
                >
                  <option value="all">جميع المدن</option>
                  {cities.slice(1).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRestaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <RestaurantCard restaurant={restaurant} />
            </motion.div>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-xl">لا توجد مطاعم تطابق البحث</p>
          </div>
        )}
      </div>
    </div>
  );
}
