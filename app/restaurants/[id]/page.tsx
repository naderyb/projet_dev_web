"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Clock,
  Truck,
  MapPin,
  Phone,
  Mail,
  X,
  Plus,
  Minus,
  ShoppingCart,
  ChevronRight,
  Heart,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  is_available: boolean;
}

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
  address: string;
  phone: string;
  email: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCartModal, setShowCartModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchRestaurantDetails();
      fetchMenuItems();
    }
  }, [params.id]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await fetch(`/api/restaurants/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRestaurant(data);
      } else {
        toast.error("Restaurant not found");
        router.push("/restaurants");
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast.error("Failed to load restaurant details");
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`/api/restaurants/${params.id}/menu`);
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      } else {
        console.log("No menu items found");
        setMenuItems([]);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setQuantity(1);
  };

  const addToCart = () => {
    if (!selectedItem) return;

    const existingItem = cart.find((item) => item.id === selectedItem.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === selectedItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { ...selectedItem, quantity }]);
    }

    toast.success(`Added ${quantity}x ${selectedItem.name} to cart`);
    closeModal();
  };

  const updateCartQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter((item) => item.id !== itemId));
    } else {
      setCart(
        cart.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const categories = [
    "all",
    ...Array.from(new Set(menuItems.map((item) => item.category))),
  ];
  const filteredMenuItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = Number(restaurant?.delivery_fee || 0);
  const totalWithDelivery = cartTotal + deliveryFee;

  const confirmOrder = async () => {
    if (!cart.length) {
      toast.error("Your cart is empty");
      return;
    }
    if (!customerName || !customerPhone || !deliveryAddress) {
      toast.error("Please fill all delivery details");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurantId: restaurant!.id, // ✅ CRITICAL
          items: cart.map((item) => ({
            menuItemId: item.id, // cleaner mapping
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: cartTotal,
          deliveryFee,
          total: totalWithDelivery,
          deliveryAddress,
          phone: customerPhone,
          notes: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to create order");
      }

      setCart([]);
      setShowCartModal(false);
      toast.success("Order created successfully");
    } catch (err) {
      console.error("Confirm order failed", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-3xl mb-8"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto px-4">
        {/* Restaurant Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-64 rounded-2xl overflow-hidden mb-6 shadow-xl"
        >
          <img src={restaurant.image} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Heart className="w-4 h-4 text-red-500" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
            </motion.button>
          </div>

          {/* Restaurant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                {restaurant.cuisine_type}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  restaurant.is_open
                    ? "bg-green-500/90 backdrop-blur-md"
                    : "bg-red-500/90 backdrop-blur-md"
                }`}
              >
                {restaurant.is_open ? "Open Now" : "Closed"}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2 font-poppins">
              {restaurant.name}
            </h1>
            <p className="text-sm text-white/90 mb-3 max-w-3xl">
              {restaurant.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="font-semibold">
                  {restaurant.average_rating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-xs">
                  ({restaurant.review_count || 0})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{restaurant.delivery_time || "30"} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-4 h-4" />
                <span>
                  {restaurant.delivery_fee === 0
                    ? "Free"
                    : `${restaurant.delivery_fee || 0} DA`}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium text-sm text-gray-900">
                  {restaurant.address || "Not available"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-sm text-gray-900">
                  {restaurant.phone || "Not available"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-sm text-gray-900">
                  {restaurant.email || "Not available"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Menu Items Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-24"
        >
          {filteredMenuItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No menu items available
              </h3>
              <p className="text-sm text-gray-600">
                This restaurant hasn't added any menu items yet.
              </p>
            </div>
          ) : (
            filteredMenuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8 }}
                onClick={() => item.is_available && openModal(item)}
                className={`glass-card overflow-hidden cursor-pointer card-hover ${
                  !item.is_available ? "opacity-60" : ""
                }`}
              >
                <div className="relative h-5 overflow-hidden">
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-gray-900 font-poppins flex-1">
                      {item.name}
                    </h3>
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg whitespace-nowrap">
                      <span className="text-xs font-bold text-primary">
                        {item.price} DA
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    {item.is_available && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-7 h-7 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
              >
                {/* Modal Header with Image */}
                <div className="relative h-56">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeModal}
                    className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </motion.button>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white mb-2">
                      {selectedItem.category}
                    </span>
                    <h2 className="text-2xl font-bold text-white font-poppins">
                      {selectedItem.name}
                    </h2>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                    {selectedItem.description}
                  </p>

                  <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Price</p>
                      <p className="text-2xl font-bold text-primary">
                        {selectedItem.price} DA
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </motion.button>
                      <span className="text-xl font-bold text-gray-900 w-10 text-center">
                        {quantity}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addToCart}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart • {(selectedItem.price * quantity).toFixed(
                      0
                    )}{" "}
                    DA
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Cart */}
        <AnimatePresence>
          {cartItemCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCartModal(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-base"
              >
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary rounded-full flex items-center justify-center text-xs font-bold">
                    {cartItemCount}
                  </span>
                </div>
                <span>View Cart</span>
                <span>•</span>
                <span>{cartTotal.toFixed(0)} DA</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Modal (local, not /cart route) */}
        <AnimatePresence>
          {showCartModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCartModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <h2 className="text-lg font-bold">Your Cart</h2>
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                <div className="p-4 max-h-[70vh] overflow-auto grid md:grid-cols-3 gap-4">
                  {/* Items */}
                  <div className="md:col-span-2 space-y-3 max-h-[60vh] overflow-auto pr-2">
                    {cart.length === 0 ? (
                      <div className="bg-gray-50 rounded p-4 text-sm text-gray-600 text-center">
                        Your cart is empty.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded"
                        >
                          <div>
                            <div className="font-semibold text-sm">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {item.price} DA each
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border rounded">
                              <button
                                onClick={() =>
                                  updateCartQuantity(
                                    item.id,
                                    Math.max(0, item.quantity - 1)
                                  )
                                }
                                className="px-2 py-1 text-xs"
                              >
                                -
                              </button>
                              <span className="px-3 text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateCartQuantity(item.id, item.quantity + 1)
                                }
                                className="px-2 py-1 text-xs"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-sm font-semibold">
                              {(item.price * item.quantity).toFixed(0)} DA
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary + delivery form */}
                  <div className="space-y-4 bg-gray-50 p-3 rounded">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">
                        Order summary
                      </h3>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Subtotal</span>
                        <span>{cartTotal.toFixed(0)} DA</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Delivery</span>
                        <span>{deliveryFee.toFixed(0)} DA</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{totalWithDelivery.toFixed(0)} DA</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <h4 className="font-semibold">Delivery details</h4>
                      <div>
                        <label className="block text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">
                          Delivery address
                        </label>
                        <textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows={3}
                          className="w-full border rounded px-2 py-1 text-xs resize-none"
                        />
                      </div>
                    </div>

                    <button
                      disabled={submitting}
                      onClick={confirmOrder}
                      className="w-full mt-2 px-3 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {submitting ? "Confirming..." : "Confirm order"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
