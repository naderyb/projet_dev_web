"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Clock, ChefHat, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import RestaurantCard from "./components/RestaurantCard";
import toast from "react-hot-toast";

type Restaurant = {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  image: string;
  featured: boolean;
};

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("Algiers");
  const [loading, setLoading] = useState(true);

  // fetched restaurants from API
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  // optional: cached menu for a restaurant (call fetchMenuForRestaurant to populate)
  const [menuCache, setMenuCache] = useState<Record<string, any[]>>({});

  // modal + cart state
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<any[]>([]);
  // cart: persisted per-restaurant in localStorage
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // order confirmation state
  const [orderConfirmation, setOrderConfirmation] = useState<any | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/restaurants");
        if (!res.ok) throw new Error("Failed to fetch restaurants");
        const data = await res.json();
        if (!mounted) return;

        const mapped: Restaurant[] = (Array.isArray(data) ? data : []).map((r: any) => ({
          id: String(r.id),
          name: r.name || "Unnamed",
          // use cuisine_type from API
          type: r.cuisine_type || "",
          // show address (or fallback to city text)
          location: r.address || "",
          rating: Number(r.average_rating ?? r.rating ?? 0) || 0,
          // delivery_time label or compose from min/max
          deliveryTime: r.delivery_time || (r.delivery_time_min && r.delivery_time_max ? `${r.delivery_time_min}-${r.delivery_time_max} min` : ""),
          deliveryFee: r.delivery_fee != null ? new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(Number(r.delivery_fee)) : "—",
          // API may not return images; keep placeholder
          image: r.image || "/images/placeholder-restaurant.jpg",
          featured: (Number(r.average_rating ?? 0) || 0) >= 4.5,
        }));
        setRestaurants(mapped);
      } catch (err) {
        console.error("Failed to load restaurants", err);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // small helper to fetch menu for a restaurant when needed
  const fetchMenuForRestaurant = async (restaurantId: string) => {
    // If we have a non-empty cached menu, return it.
    const cached = menuCache[restaurantId];
    if (Array.isArray(cached) && cached.length > 0) return cached;

    try {
      // fetch latest menu from server
      const res = await fetch(`/api/menu_items?restaurant_id=${encodeURIComponent(restaurantId)}`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      const data = await res.json();
      // only cache when we actually received items (avoid caching "empty" result)
      if (Array.isArray(data) && data.length > 0) {
        setMenuCache(prev => ({ ...prev, [restaurantId]: data }));
      } else {
        // ensure we don't keep stale empty cache entry
        setMenuCache(prev => {
          const copy = { ...prev };
          delete copy[restaurantId];
          return copy;
        });
      }
      return data;
    } catch (err) {
      console.error("fetchMenuForRestaurant error", err);
      return [];
    }
  };

  // open restaurant: fetch menu + full restaurant details
  const handleOpenRestaurant = async (restaurant: Restaurant) => {
    setSelectedRestaurant({ ...restaurant, raw: null });
    setMenuModalOpen(true);
    // Load saved cart for this restaurant from localStorage
    setDeliveryAddress("");
    setPhoneInput("");
    try {
      const menu = await fetchMenuForRestaurant(restaurant.id);
      setCurrentMenu(Array.isArray(menu) ? menu.map((mi: any) => ({ ...mi, price: Number(mi.price || 0) })) : []);
    } catch (err) {
      console.error("Failed to load menu", err);
      setCurrentMenu([]);
    }
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRestaurant((prev: any) => ({ ...(prev || {}), raw: data }));
      }
    } catch (err) {
      console.error("Failed to load restaurant details", err);
    }
  };


  const deliveryFeeNumber = selectedRestaurant?.raw?.delivery_fee != null ? Number(selectedRestaurant.raw.delivery_fee) : 0;

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!selectedRestaurant) return toast.error("No restaurant selected");
    if (!deliveryAddress) return toast.error("Enter delivery address");
    if (!phoneInput) return toast.error("Enter phone number");
    setCheckoutLoading(true);
    try {
      const payload = {
        restaurantId: selectedRestaurant.raw?.id ?? selectedRestaurant.id,
        deliveryFee: deliveryFeeNumber,
        deliveryAddress,
        phone: phoneInput,
        notes: "",
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Checkout failed", created);
        toast.error(created?.error || created?.message || "Failed to create order");
        setCheckoutLoading(false);
        return;
      }
      toast.success("Order placed!");

      // fetch full order details (server returns created order but we want canonical payload with items/tracking)
      try {
        const orderId = created?.id ?? created?.order?.id ?? created?.order_id;
        if (orderId) {
          const orderRes = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
          const orderData = orderRes.ok ? await orderRes.json().catch(()=>created) : created;
          setOrderConfirmation(orderData);
          setConfirmationOpen(true);
        } else {
          // fallback: use created response as confirmation payload
          setOrderConfirmation(created);
          setConfirmationOpen(true);
        }
      } catch (fetchErr) {
        console.error("Failed to fetch created order details", fetchErr);
        // still show created response if available
        setOrderConfirmation(created);
        setConfirmationOpen(true);
      }
      setMenuModalOpen(false);
    } catch (err) {
      console.error("Checkout error", err);
      toast.error("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Zelij Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="zelij-pattern w-full h-full"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 font-poppins">
              Welcome to <span className="text-gradient bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Tbib El Jou3</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Authentic Algerian cuisine delivered fresh to your doorstep
            </p>
            <p className="text-lg text-gray-500 mb-12 font-poppins">
              طبيب الجوع - دواء الجوع على بابك
            </p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for restaurants, dishes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-poppins"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-12 pr-8 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-poppins"
                  >
                    <option value="Algiers">Algiers</option>
                    <option value="Oran">Oran</option>
                    <option value="Constantine">Constantine</option>
                  </select>
                </div>
                <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 font-poppins">
                  Search
                </button>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex justify-center space-x-8 mt-12"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500 font-poppins">50K+</div>
                <div className="text-gray-600 font-poppins">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 font-poppins">100+</div>
                <div className="text-gray-600 font-poppins">Restaurants</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 font-poppins">25min</div>
                <div className="text-gray-600 font-poppins">Avg Delivery</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
                Featured <span className="text-green-500">Restaurants</span>
              </h2>
              <p className="text-xl text-gray-600 font-poppins">
                Top-rated places in your area
              </p>
            </div>
            <Link 
              href="/restaurants"
              className="flex items-center space-x-2 text-orange-500 hover:text-orange-600 transition-colors font-poppins font-semibold"
            >
              <span>View All</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="relative" /* make container positioning context for overlay */
                >
                  {/* overlay to capture clicks BEFORE any inner anchor/link in RestaurantCard */}
                  <div
                    // use mouseDown to intercept earlier than some link handlers
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenRestaurant(restaurant);
                    }}
                    // cover whole card and be on top
                    className="absolute inset-0 z-20 cursor-pointer"
                    aria-hidden="true"
                  />
                  {/* Render the card beneath the overlay */}
                  <div className="pointer-events-none">
                    <RestaurantCard
                      {...restaurant}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-orange-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
              Why Choose <span className="text-red-500">Tbib El Jou3?</span>
            </h2>
            <p className="text-xl text-gray-600 font-poppins">
              We're more than just food delivery
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ChefHat className="w-12 h-12" />,
                title: "Authentic Recipes",
                description: "Traditional Algerian dishes prepared by expert chefs",
                color: "text-orange-500"
              },
              {
                icon: <Clock className="w-12 h-12" />,
                title: "Fast Delivery",
                description: "Fresh food delivered to your door in 30 minutes or less",
                color: "text-green-500"
              },
              {
                icon: <Heart className="w-12 h-12" />,
                title: "Made with Love",
                description: "Every dish prepared with care and authentic ingredients",
                color: "text-red-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all"
              >
                <div className={`${feature.color} mb-6 flex justify-center`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-poppins">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-poppins">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-poppins">
              Hungry? Let's Order!
            </h2>
            <p className="text-xl mb-8 opacity-90 font-poppins">
              Join thousands of satisfied customers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/restaurants">
                <button className="bg-white text-orange-500 px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105 font-poppins">
                  Order Now
                </button>
              </Link>
              <Link href="/signup">
                <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-orange-500 transition-all font-poppins">
                  Join Us
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Menu Modal */}
      <AnimatePresence>
        {menuModalOpen && selectedRestaurant && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white rounded-2xl w-full max-w-5xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedRestaurant.name}</h3>
                    <p className="text-sm text-gray-500">{selectedRestaurant.type} • {selectedRestaurant.location}</p>
                    <p className="text-sm text-gray-500 mt-1">Delivery: {selectedRestaurant.deliveryTime} • Fee: {selectedRestaurant.deliveryFee}</p>
                  </div>
                  <div>
                    <button onClick={() => setMenuModalOpen(false)} className="px-3 py-2 border rounded">Close</button>
                  </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
                  {currentMenu.length === 0 ? <div>No menu items</div> : currentMenu.map((mi: any) => {
                    return (
                      <div key={mi.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-semibold">{mi.name}</div>
                          <div className="text-sm text-gray-500">{mi.description}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="font-semibold">{new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(Number(mi.price || 0))}</div>
                          <div className="flex items-center space-x-2">
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Your Cart</h4>
                <div className="space-y-3 max-h-[40vh] overflow-auto">
                      <div>
                      </div>
                      <div className="flex items-center space-x-2">
                      </div>
                    </div>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between text-sm text-gray-600"><span>Delivery</span><span>{new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(deliveryFeeNumber)}</span></div>
                </div>

                <div className="mt-4 space-y-2">
                  <input placeholder="Delivery address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="w-full border px-3 py-2 rounded" />
                  <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full mt-2 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">{checkoutLoading ? "Placing..." : "Confirm & Pay"}</button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal (order placed successfully) */}
      <AnimatePresence>
        {confirmationOpen && orderConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white rounded-2xl w-full max-w-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Order Confirmed</h3>
                  <p className="text-sm text-gray-500">Order ID: {orderConfirmation.id ?? orderConfirmation.order?.id}</p>
                </div>
                <div>
                  <button onClick={() => { setConfirmationOpen(false); setOrderConfirmation(null); }} className="px-3 py-2 border rounded">Close</button>
                </div>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-auto">
                <div className="text-sm text-gray-600">Restaurant: {orderConfirmation.restaurant_name ?? orderConfirmation.restaurant?.name}</div>
                <div className="mt-3">
                  {(orderConfirmation.items || orderConfirmation.order?.items || []).length === 0 ? (
                    <div className="text-sm text-gray-500">No items data</div>
                  ) : (
                    (orderConfirmation.items || orderConfirmation.order?.items || []).map((it: any) => (
                      <div key={it.id ?? `${it.menu_item_id}-${Math.random()}`} className="flex justify-between border-b py-2">
                        <div>
                          <div className="font-medium">{it.name ?? it.menu_item_name}</div>
                          <div className="text-xs text-gray-500">Qty: {it.quantity ?? it.qty}</div>
                        </div>
                        <div className="font-semibold">{new Intl.NumberFormat("ar-DZ",{style:"currency",currency:"DZD",minimumFractionDigits:0}).format(Number(it.price||0) * (it.quantity ?? it.qty ?? 1))}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Subtotal</span><span className="font-semibold">{new Intl.NumberFormat("ar-DZ",{style:"currency",currency:"DZD",minimumFractionDigits:0}).format(orderConfirmation.subtotal ?? orderConfirmation.order?.subtotal ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-600">Delivery</span><span className="font-semibold">{new Intl.NumberFormat("ar-DZ",{style:"currency",currency:"DZD",minimumFractionDigits:0}).format(orderConfirmation.delivery_fee ?? orderConfirmation.order?.deliveryFee ?? 0)}</span></div>
                  <div className="flex justify-between mt-2"><span className="font-semibold">Total</span><span className="font-semibold">{new Intl.NumberFormat("ar-DZ",{style:"currency",currency:"DZD",minimumFractionDigits:0}).format(orderConfirmation.total ?? orderConfirmation.order?.total ?? 0)}</span></div>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Link href="/orders"><button className="px-4 py-2 bg-orange-500 text-white rounded">View My Orders</button></Link>
                <button onClick={() => { setConfirmationOpen(false); setOrderConfirmation(null); }} className="px-4 py-2 border rounded">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}