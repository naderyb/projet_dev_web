"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChefHat, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const [loading, setLoading] = useState(true);

  const { data: session, status } = useSession();
  const router = useRouter();

  // fetched restaurants from API
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  // optional: cached menu for a restaurant (call fetchMenuForRestaurant to populate)
  const [menuCache, setMenuCache] = useState<Record<string, any[]>>({});

  // modal + cart state
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );
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

        const mapped: Restaurant[] = (Array.isArray(data) ? data : []).map(
          (r: any) => ({
            id: String(r.id),
            name: r.name || "Unnamed",
            // use cuisine_type from API
            type: r.cuisine_type || "",
            // show address (or fallback to city text)
            location: r.address || "",
            rating: Number(r.average_rating ?? r.rating ?? 0) || 0,
            // delivery_time label or compose from min/max
            deliveryTime:
              r.delivery_time ||
              (r.delivery_time_min && r.delivery_time_max
                ? `${r.delivery_time_min}-${r.delivery_time_max} min`
                : ""),
            deliveryFee:
              r.delivery_fee != null
                ? new Intl.NumberFormat("ar-DZ", {
                    style: "currency",
                    currency: "DZD",
                    minimumFractionDigits: 0,
                  }).format(Number(r.delivery_fee))
                : "—",
            // API may not return images; keep placeholder
            image: r.image || "/images/placeholder-restaurant.jpg",
            featured: (Number(r.average_rating ?? 0) || 0) >= 4.5,
          })
        );
        setRestaurants(mapped);
      } catch (err) {
        console.error("Failed to load restaurants", err);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // small helper to fetch menu for a restaurant when needed
  const fetchMenuForRestaurant = async (restaurantId: string) => {
    // If we have a non-empty cached menu, return it.
    const cached = menuCache[restaurantId];
    if (Array.isArray(cached) && cached.length > 0) return cached;

    try {
      // fetch latest menu from server
      const res = await fetch(
        `/api/menu_items?restaurant_id=${encodeURIComponent(restaurantId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch menu");
      const data = await res.json();
      // only cache when we actually received items (avoid caching "empty" result)
      if (Array.isArray(data) && data.length > 0) {
        setMenuCache((prev) => ({ ...prev, [restaurantId]: data }));
      } else {
        // ensure we don't keep stale empty cache entry
        setMenuCache((prev) => {
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
      setCurrentMenu(
        Array.isArray(menu)
          ? menu.map((mi: any) => ({ ...mi, price: Number(mi.price || 0) }))
          : []
      );
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

  const deliveryFeeNumber =
    selectedRestaurant?.raw?.delivery_fee != null
      ? Number(selectedRestaurant.raw.delivery_fee)
      : 0;

  const handleCheckout = async () => {
    if (status === "loading") {
      toast.error("Please wait while we check your session");
      return;
    }

    if (!session) {
      toast.error("You need to sign in to place an order");
      router.push("/signin");
      return;
    }

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
        toast.error(
          created?.error || created?.message || "Failed to create order"
        );
        setCheckoutLoading(false);
        return;
      }
      toast.success("Order placed!");

      // fetch full order details (server returns created order but we want canonical payload with items/tracking)
      try {
        const orderId = created?.id ?? created?.order?.id ?? created?.order_id;
        if (orderId) {
          const orderRes = await fetch(`/api/orders/${orderId}`, {
            credentials: "include",
          });
          const orderData = orderRes.ok
            ? await orderRes.json().catch(() => created)
            : created;
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
      {/* add something in the hero section */}
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
          >
            <div className="bg-white bg-opacity-5 backdrop-blur-md rounded-xl p-8 shadow-lg">
              <div className="items-center">
                <div>
                  {/* add a space between tbib el jou3 and your hunger doctor */}
                  <h1 className="text-5xl md:text-7xl flex justify-center font-bold text-gray-900 mb-6 font-poppins">
                    <span className="text-gradient bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      {" "}
                      your hunger doctor
                    </span>{" "}
                    Tbib El Jou3
                  </h1>
                  <p className="text-xl md:text-2xl flex justify-center text-gray-700 mb-4 leading-relaxed">
                    Discover the best homemade and restaurant dishes from across
                    Algeria, delivered hot and fresh right to your door.
                  </p>
                  <p className="text-lg flex justify-center text-gray-500 mb-6 font-poppins">
                    طبيب الجوع - من قلب الكوزينة الجزائرية إلى باب داركم، أطباق
                    تقليدية، وجبات سريعة، وحلويات… كل شيء في بلاصة وحدة.
                  </p>

                  {/* Feature badges */}
                  <div className="flex flex-wrap gap-3 mb-8 justify-center">
                    <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-600 px-4 py-2 text-sm font-medium">
                      <ChefHat className="w-4 h-4 mr-2" />
                      Verified local chefs
                    </span>
                    <span className="inline-flex items-center rounded-full bg-green-50 text-green-600 px-4 py-2 text-sm font-medium">
                      <Clock className="w-4 h-4 mr-2" />
                      Average delivery under 15 min
                    </span>
                    <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-4 py-2 text-sm font-medium">
                      <Heart className="w-4 h-4 mr-2" />
                      24/7 support & care
                    </span>
                  </div>

                  {/* Primary actions */}
                  <div className="flex justify-center gap-4 mb-3">
                    <Link href="/restaurants">
                      <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105 font-poppins w-full sm:w-auto">
                        Browse restaurants
                      </button>
                    </Link>
                    <Link href="/signup">
                      <button className="border-2 border-orange-500 text-orange-500 px-8 py-4 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all font-poppins w-full sm:w-auto">
                        Become a partner
                      </button>
                    </Link>
                  </div>
                  <p className="text-sm text-gray-500 font-poppins justify-center flex">
                    No minimum order • Cash on delivery available • Live order
                    tracking (where supported)
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row justify-center sm:space-x-8 mt-12 space-y-4 sm:space-y-0 text-center"
              >
                <div>
                  <div className="text-3xl font-bold text-orange-500 font-poppins">
                    50K+
                  </div>
                  <div className="text-gray-600 font-poppins">
                    Orders delivered across Algiers
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-500 font-poppins">
                    100+
                  </div>
                  <div className="text-gray-600 font-poppins">
                    Partner restaurants & home kitchens
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-500 font-poppins">
                    25 min
                  </div>
                  <div className="text-gray-600 font-poppins">
                    Average delivery time in major cities
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          {/* add something interesting in the hero section */}
        </div>
      </section>

      {/* About Us */}
      <section>
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
              About <span className="text-red-500">Tbib El Jou3</span>
            </h2>
            <p className="text-xl text-gray-600 font-poppins">
              Delivering authentic Algerian flavors with love and care
            </p>
          </motion.div>
          <div className="max-w-3xl mx-auto text-gray-700 font-poppins leading-relaxed relative">
            {/* Decorative Moroccan/Algerian corner ornaments */}
            <div className="absolute -top-8 -left-8 w-24 h-24 border-t-4 border-l-4 border-amber-600 opacity-30"></div>
            <div className="absolute -top-8 -right-8 w-24 h-24 border-t-4 border-r-4 border-amber-600 opacity-30"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 border-b-4 border-l-4 border-amber-600 opacity-30"></div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 border-b-4 border-r-4 border-amber-600 opacity-30"></div>

            <motion.div
              className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-8 rounded-lg shadow-xl border-2 border-amber-200 relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Geometric pattern overlay */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px),
                                  repeating-linear-gradient(-45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px)`,
                  color: "#d97706",
                }}
              ></div>

              <motion.p
                className="mb-6 text-lg relative z-10 first-letter:text-5xl first-letter:font-bold first-letter:text-amber-700 first-letter:float-left first-letter:mr-3 first-letter:mt-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                At Tbib El Jou3, we believe that food is more than just
                sustenance — it's a way to connect with culture, family, and
                tradition. Our mission is to bring the rich and diverse flavors
                of Algerian cuisine right to your doorstep, whether you're
                craving a hearty couscous, a spicy chorba, or a sweet baklava.
              </motion.p>

              {/* Decorative divider */}
              <div className="flex items-center justify-center my-6">
                <div className="h-px bg-amber-400 flex-grow"></div>
                <div className="mx-4 text-amber-600">✦</div>
                <div className="h-px bg-amber-400 flex-grow"></div>
              </div>

              <motion.p
                className="mb-6 text-lg relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Founded by a team of food enthusiasts and tech innovators, Tbib
                El Jou3 started as a small platform connecting home cooks with
                local food lovers. Today, we've grown into a trusted food
                delivery service, partnering with both talented home chefs and
                established restaurants across Algeria.
              </motion.p>

              {/* Decorative divider */}
              <div className="flex items-center justify-center my-6">
                <div className="h-px bg-amber-400 flex-grow"></div>
                <div className="mx-4 text-amber-600">✦</div>
                <div className="h-px bg-amber-400 flex-grow"></div>
              </div>

              <motion.p
                className="text-lg relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
              >
                We take pride in our rigorous vetting process, ensuring that
                every dish delivered through Tbib El Jou3 meets our high
                standards for quality, authenticity, and taste. Our dedicated
                delivery team works tirelessly to ensure your food arrives hot
                and fresh, ready to be enjoyed.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
              <span className="text-red-500">?</span>Why Choose{" "}
              <span className="text-red-500">Tbib El Jou3</span>
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
                description:
                  "Traditional Algerian dishes prepared by expert chefs",
                color: "text-orange-500",
              },
              {
                icon: <Clock className="w-12 h-12" />,
                title: "Fast Delivery",
                description:
                  "Fresh food delivered to your door in 30 minutes or less",
                color: "text-green-500",
              },
              {
                icon: <Heart className="w-12 h-12" />,
                title: "Made with Love",
                description:
                  "Every dish prepared with care and authentic ingredients",
                color: "text-red-500",
              },
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

      {/* Menu Modal */}
      <AnimatePresence>
        {menuModalOpen && selectedRestaurant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              className="bg-white rounded-2xl w-full max-w-5xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedRestaurant.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedRestaurant.type} • {selectedRestaurant.location}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Delivery: {selectedRestaurant.deliveryTime} • Fee:{" "}
                      {selectedRestaurant.deliveryFee}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setMenuModalOpen(false)}
                      className="px-3 py-2 border rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
                  {currentMenu.length === 0 ? (
                    <div>No menu items</div>
                  ) : (
                    currentMenu.map((mi: any) => {
                      return (
                        <div
                          key={mi.id}
                          className="flex items-center justify-between p-3 border rounded"
                        >
                          <div>
                            <div className="font-semibold">{mi.name}</div>
                            <div className="text-sm text-gray-500">
                              {mi.description}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="font-semibold">
                              {new Intl.NumberFormat("ar-DZ", {
                                style: "currency",
                                currency: "DZD",
                                minimumFractionDigits: 0,
                              }).format(Number(mi.price || 0))}
                            </div>
                            <div className="flex items-center space-x-2"></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Your Cart</h4>
                <div className="space-y-3 max-h-[40vh] overflow-auto">
                  <div></div>
                  <div className="flex items-center space-x-2"></div>
                </div>
              </div>
              <div className="mt-4 border-t pt-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span>
                    {new Intl.NumberFormat("ar-DZ", {
                      style: "currency",
                      currency: "DZD",
                      minimumFractionDigits: 0,
                    }).format(deliveryFeeNumber)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <input
                  placeholder="Delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                />
                <input
                  placeholder="Phone"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                />
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full mt-2 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {checkoutLoading ? "Placing..." : "Confirm & Pay"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal (order placed successfully) */}
      <AnimatePresence>
        {confirmationOpen && orderConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              className="bg-white rounded-2xl w-full max-w-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Order Confirmed</h3>
                  <p className="text-sm text-gray-500">
                    Order ID:{" "}
                    {orderConfirmation.id ?? orderConfirmation.order?.id}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setConfirmationOpen(false);
                      setOrderConfirmation(null);
                    }}
                    className="px-3 py-2 border rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-auto">
                <div className="text-sm text-gray-600">
                  Restaurant:{" "}
                  {orderConfirmation.restaurant_name ??
                    orderConfirmation.restaurant?.name}
                </div>
                <div className="mt-3">
                  {(
                    orderConfirmation.items ||
                    orderConfirmation.order?.items ||
                    []
                  ).length === 0 ? (
                    <div className="text-sm text-gray-500">No items data</div>
                  ) : (
                    (
                      orderConfirmation.items ||
                      orderConfirmation.order?.items ||
                      []
                    ).map((it: any) => (
                      <div
                        key={it.id ?? `${it.menu_item_id}-${Math.random()}`}
                        className="flex justify-between border-b py-2"
                      >
                        <div>
                          <div className="font-medium">
                            {it.name ?? it.menu_item_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {it.quantity ?? it.qty}
                          </div>
                        </div>
                        <div className="font-semibold">
                          {new Intl.NumberFormat("ar-DZ", {
                            style: "currency",
                            currency: "DZD",
                            minimumFractionDigits: 0,
                          }).format(
                            Number(it.price || 0) * (it.quantity ?? it.qty ?? 1)
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat("ar-DZ", {
                        style: "currency",
                        currency: "DZD",
                        minimumFractionDigits: 0,
                      }).format(
                        orderConfirmation.subtotal ??
                          orderConfirmation.order?.subtotal ??
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Delivery</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat("ar-DZ", {
                        style: "currency",
                        currency: "DZD",
                        minimumFractionDigits: 0,
                      }).format(
                        orderConfirmation.delivery_fee ??
                          orderConfirmation.order?.deliveryFee ??
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat("ar-DZ", {
                        style: "currency",
                        currency: "DZD",
                        minimumFractionDigits: 0,
                      }).format(
                        orderConfirmation.total ??
                          orderConfirmation.order?.total ??
                          0
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Link href="/orders">
                  <button className="px-4 py-2 bg-orange-500 text-white rounded">
                    View My Orders
                  </button>
                </Link>
                <button
                  onClick={() => {
                    setConfirmationOpen(false);
                    setOrderConfirmation(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
