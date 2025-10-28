"use client";

import { useEffect, useState } from "react";
import RestaurantCard from "./components/RestaurantCard";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Home() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching restaurants:", error);
        setRestaurants([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-primary via-deepblue to-terracotta text-white py-20">
        <div className="absolute inset-0 opacity-10 bg-zelij-pattern"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold font-arabic mb-6">
              Tbib El Jou3
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Authentic Algerian Cuisine Delivered to Your Door
            </p>
            <div className="max-w-2xl mx-auto bg-white rounded-full p-2 flex items-center">
              <Search className="text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Search for restaurants or dishes..."
                className="flex-1 px-4 py-3 outline-none text-gray-800"
              />
              <button className="bg-primary text-white px-8 py-3 rounded-full hover:bg-primary-dark transition">
                Search
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Restaurants</h2>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-200 animate-pulse h-80 rounded-xl"
              ></div>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No restaurants available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {restaurants.slice(0, 6).map((restaurant: any) => (
              <RestaurantCard key={restaurant.id} {...restaurant} />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Popular Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Couscous", "Pizza", "Tacos", "Burgers"].map((category) => (
              <motion.div
                key={category}
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center cursor-pointer"
              >
                <div className="w-20 h-20 bg-linear-to-br from-primary to-terracotta rounded-full mx-auto mb-4"></div>
                <h3 className="font-semibold">{category}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
