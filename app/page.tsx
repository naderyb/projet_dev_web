"use client";
import { motion } from "framer-motion";
import Header from "../components/Header";
import RestaurantCard from "../components/RestaurantCard";
import { mockRestaurants } from "../lib/mock-data";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-terracotta-500 via-sand-400 to-mint-400 py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-white"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-glow">
              طبيب الجوع
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              أشهى الأطباق توصل لباب بيتك
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-terracotta-600 font-bold py-4 px-8 rounded-full text-lg hover:shadow-xl transition-all duration-300"
            >
              اطلب الآن
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              المطاعم المميزة
            </h2>
            <p className="text-gray-600 text-lg">
              اكتشف أفضل المطاعم في مدينتك
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockRestaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <RestaurantCard restaurant={restaurant} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🚚",
                title: "توصيل سريع",
                desc: "توصيل في أقل من 30 دقيقة",
              },
              { icon: "💳", title: "دفع آمن", desc: "طرق دفع متعددة وآمنة" },
              { icon: "⭐", title: "جودة عالية", desc: "مطاعم مختارة بعناية" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
                className="text-center p-8 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="text-6xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
