"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Clock, Truck, Search, Filter, MapPin } from "lucide-react";
import toast from "react-hot-toast";

interface Restaurant {
  id: number;
  name: string;
  description: string;
  image: string;
  cuisine_type: string;
  delivery_time: string;
  delivery_fee: number;
  average_rating: number;
  review_count: number;
  is_open: boolean;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch("/api/restaurants");
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data);
      } else {
        toast.error("Failed to load restaurants");
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast.error("Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort restaurants
  const filteredRestaurants = restaurants
    .filter((restaurant) => {
      const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           restaurant.cuisine_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCuisine = selectedCuisine === "all" || restaurant.cuisine_type === selectedCuisine;
      return matchesSearch && matchesCuisine;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.average_rating - a.average_rating;
        case "delivery_time":
          return parseInt(a.delivery_time) - parseInt(b.delivery_time);
        case "delivery_fee":
          return a.delivery_fee - b.delivery_fee;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const cuisineTypes = ["all", ...Array.from(new Set(restaurants.map(r => r.cuisine_type)))];

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
            Discover Amazing Restaurants
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Explore the finest Algerian cuisine and international flavors
          </p>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search restaurants or cuisine..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 backdrop-blur-sm"
                />
              </div>

              {/* Cuisine Filter */}
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="px-6 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white/80 backdrop-blur-sm"
              >
                {cuisineTypes.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine === "all" ? "All Cuisines" : cuisine}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-6 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white/80 backdrop-blur-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="rating">Sort by Rating</option>
                <option value="delivery_time">Sort by Delivery Time</option>
                <option value="delivery_fee">Sort by Delivery Fee</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-8">
          <p className="text-gray-600">
            Showing {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Restaurants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRestaurants.map((restaurant) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8 }}
              className="glass-card overflow-hidden card-hover"
            >
              <Link href={`/restaurants/${restaurant.id}`}>
                {/* Restaurant Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={restaurant.image || "/placeholder-restaurant.jpg"}
                    alt={restaurant.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  {!restaurant.is_open && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Closed</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-sm font-semibold text-primary">
                      {restaurant.cuisine_type}
                    </span>
                  </div>
                </div>

                {/* Restaurant Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">
                    {restaurant.name}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {restaurant.description}
                  </p>

                  {/* Rating and Reviews */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-semibold text-gray-900">
                        {restaurant.average_rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({restaurant.review_count} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{restaurant.delivery_time} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Truck className="w-4 h-4" />
                      <span>
                        {restaurant.delivery_fee === 0 
                          ? "Free delivery" 
                          : `${restaurant.delivery_fee} DA delivery`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      restaurant.is_open 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {restaurant.is_open ? "Open Now" : "Closed"}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {filteredRestaurants.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filters to find more restaurants.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}