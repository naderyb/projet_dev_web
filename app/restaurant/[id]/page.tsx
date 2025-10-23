"use client";
import { motion } from "framer-motion";
import Header from "../../../components/Header";
import { mockRestaurants, mockMenuItems } from "../../../lib/mock-data";
import { Star, Clock, Truck, Plus } from "lucide-react";

export default function RestaurantPage({ params }: { params: { id: string } }) {
  const restaurant = mockRestaurants.find((r) => r.id === parseInt(params.id));
  const menuItems = mockMenuItems.filter(
    (item) => item.restaurant_id === parseInt(params.id)
  );

  if (!restaurant) {
    return <div>المطعم غير موجود</div>;
  }

  const categories = [...new Set(menuItems.map((item) => item.category))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Restaurant Header */}
      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6"
          >
            <div className="w-full md:w-64 h-64 bg-gradient-to-br from-sand-200 to-terracotta-200 rounded-xl flex items-center justify-center text-6xl">
              🏪
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {restaurant.name}
              </h1>
              <p className="text-gray-600 text-lg mb-4">
                {restaurant.description}
              </p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-medium">{restaurant.rating}</span>
                </div>
                <div className="flex items-center space-x-1 bg-blue-100 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{restaurant.delivery_time}</span>
                </div>
                <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span>{restaurant.delivery_fee} دج</span>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                أقل طلب:{" "}
                <span className="font-medium">{restaurant.min_order} دج</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Menu */}
      <div className="container mx-auto px-4 py-8">
        {categories.map((category, categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuItems
                .filter((item) => item.category === category)
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-sand-200 to-terracotta-200 rounded-lg flex items-center justify-center text-2xl">
                        🍽️
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-terracotta-600">
                            {item.price} دج
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-terracotta-500 hover:bg-terracotta-600 text-white p-2 rounded-full transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
