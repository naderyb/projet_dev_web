"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  Eye,
  Package,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  User,
  Coffee,
  LogOut,
} from "lucide-react";
import useRealtime from "../../hooks/useRealtime";

type ApiOrderRow = any; // raw DB row

type Order = {
  id: string;
  orderNumber: string;
  customer: { name?: string; phone?: string; email?: string };
  restaurant: { name?: string };
  status: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  estimatedTime?: string; // ISO or text
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null); // items + tracking

  // default to orders and remove analytics tab
  const [activeTab, setActiveTab] = useState<"orders" | "restaurants">("orders");

  // admin display name & logout modal
  const [adminName, setAdminName] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // new state for restaurants
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [restLoading, setRestLoading] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  // include all common restaurant fields so the UI fills them on create/update
  const [restaurantForm, setRestaurantForm] = useState<any>({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    cuisine_type: "",
    delivery_fee: "",
    minimum_order: "",
    delivery_time_min: "",
    delivery_time_max: "",
    delivery_time: "",
    opening_hours: "",
    owner_id: "",
    is_active: true,
  });
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);

  // menu items state
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [menuForm, setMenuForm] = useState<any>({
    restaurant_id: null,
    category: "",
    name: "",
    description: "",
    price: 0,
    is_available: true,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    calories: null,
    preparation_time: null,
    ingredients: "",
    allergens: "",
    sort_order: 0,
  });
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  const [categories, setCategories] = useState<any[]>([]); // optional: populate if you have categories endpoint

  // ensure current user is admin (NextAuth session or admin_jwt)
  const ensureAdmin = async () => {
    try {
      // try next-auth session first
      const s = await fetch("/api/auth/session", { credentials: "include" });
      if (s.ok) {
        const data = await s.json().catch(() => ({}));
        if (data?.user?.role === "admin") return true;
      }
      // fallback to admin-login debug cookie check
      const dbg = await fetch("/api/auth/admin-login", { credentials: "include" });
      if (dbg.ok) {
        const d = await dbg.json().catch(() => ({}));
        // admin-login debug returns { ok: true, payload: ... } when cookie valid
        if ((d as any)?.ok) return true;
      }
      return false;
    } catch (err) {
      console.error("ensureAdmin check failed", err);
      return false;
    }
  };

  const mapRowToOrder = (r: ApiOrderRow): Order => ({
    id: String(r.id),
    orderNumber: r.order_number || r.orderNumber || "",
    customer: {
      name: r.user_name || r.customer_name || r.customer?.name,
      phone: r.customer_phone || r.phone || r.customer?.phone,
      email: r.user_email || r.customer?.email,
    },
    restaurant: { name: r.restaurant_name || (r.restaurant && r.restaurant.name) },
    status: r.status,
    total: Number(r.total || 0),
    subtotal: Number(r.subtotal || 0),
    deliveryFee: Number(r.delivery_fee || 0),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    estimatedTime: r.estimated_delivery_time || r.estimatedTime,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const handleRealtime = useCallback((msg: any) => {
    if (!msg) return;
    const type = msg.type || msg.event;
    const payload = msg.data || msg.payload || msg;
    if ((type === "order:update" || type === "order:updated") && payload?.order) {
      setOrders((prev) => prev.map((o) => (o.id === String(payload.order.id) ? mapRowToOrder(payload.order) : o)));
    } else if ((type === "order:new" || type === "order:created") && payload?.order) {
      setOrders((prev) => [mapRowToOrder(payload.order), ...prev]);
    }
  }, []);

  useRealtime("admin", handleRealtime);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", { credentials: "include" }); // include cookies
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      const mapped = Array.isArray(data) ? data.map(mapRowToOrder) : [];
      setOrders(mapped);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // optimistic
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o)));
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // server will broadcast back; optimistic is fine
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setOrderDetails(data); // data includes items, tracking per API
    } catch (err) {
      console.error("Error loading order details:", err);
      setOrderDetails(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (order.orderNumber || "").toLowerCase().includes(term) ||
      (order.customer?.name || "").toLowerCase().includes(term) ||
      (order.restaurant?.name || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fetchRestaurants = async () => {
    setRestLoading(true);
    try {
      const res = await fetch("/api/restaurants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load restaurants");
      const data = await res.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchRestaurants error", err);
    } finally {
      setRestLoading(false);
    }
  };

  const saveRestaurant = async () => {
    try {
      // build payload that matches DB schema + include optional UI fields
      const payload: any = {
        name: restaurantForm.name || null,
        address: restaurantForm.address || null,
        phone: restaurantForm.phone || null,
        email: restaurantForm.email || null,
        cuisine_type: restaurantForm.cuisine_type || null,
        delivery_fee:
          restaurantForm.delivery_fee !== "" && restaurantForm.delivery_fee != null
            ? Number(restaurantForm.delivery_fee)
            : null,
        minimum_order:
          restaurantForm.minimum_order !== "" && restaurantForm.minimum_order != null
            ? Number(restaurantForm.minimum_order)
            : null,
        delivery_time_min:
          restaurantForm.delivery_time_min !== "" && restaurantForm.delivery_time_min != null
            ? Number(restaurantForm.delivery_time_min)
            : null,
        delivery_time_max:
          restaurantForm.delivery_time_max !== "" && restaurantForm.delivery_time_max != null
            ? Number(restaurantForm.delivery_time_max)
            : null,
        delivery_time: restaurantForm.delivery_time || null,
        // optional fields — server may ignore if schema doesn't include them
        description: restaurantForm.description || null,
        opening_hours: restaurantForm.opening_hours || null,
        owner_id: restaurantForm.owner_id ? Number(restaurantForm.owner_id) : null,
        is_active: typeof restaurantForm.is_active === "boolean" ? restaurantForm.is_active : !!restaurantForm.is_active,
      };

      let res;
      if (editingRestaurant) {
        res = await fetch(`/api/restaurants/${editingRestaurant.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/restaurants", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Failed to save");
      }

      // refresh list and reset form
      await fetchRestaurants();
      setEditingRestaurant(null);
      setRestaurantForm({
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        cuisine_type: "",
        delivery_fee: "",
        minimum_order: "",
        delivery_time_min: "",
        delivery_time_max: "",
        delivery_time: "",
        opening_hours: "",
        owner_id: "",
        is_active: true,
      });
      setShowRestaurantModal(false);
    } catch (err) {
      console.error("saveRestaurant error", err);
      alert(String(err));
    }
  };

  const deleteRestaurant = async (id: number) => {
    if (!confirm("Delete restaurant? This will remove its menu items.")) return;
    try {
      const res = await fetch(`/api/restaurants/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchRestaurants();
    } catch (err) {
      console.error("deleteRestaurant error", err);
      alert(String(err));
    }
  };

  // Menu management
  const fetchMenuForRestaurant = async (restaurantId: number) => {
    setMenuLoading(true);
    try {
      // correct endpoint to fetch menu items for a restaurant
      const res = await fetch(`/api/menu_items?restaurant_id=${restaurantId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Failed to load menu");
      }
      const data = await res.json();
      // normalize items
      setMenuItems(Array.isArray(data) ? data.map((mi: any) => ({ ...mi, price: Number(mi.price || 0) })) : []);
      setSelectedRestaurantId(restaurantId);
      // ensure menuForm knows the restaurant when creating
      setMenuForm((prev: any) => ({ ...prev, restaurant_id: restaurantId }));
      // make sure modal is closed when fetching
      setShowMenuModal(false);
    } catch (err) {
      console.error("fetchMenuForRestaurant", err);
      alert(String(err));
    } finally {
      setMenuLoading(false);
    }
  };

  const saveMenuItem = async () => {
    try {
      // authorization check: ensure admin before saving
      const ok = await ensureAdmin();
      if (!ok) {
        alert("Unauthorized: admin access required to create/update menu items.");
        return;
      }
      // ensure we have a restaurant id
      const rid = selectedRestaurantId ?? menuForm.restaurant_id;
      if (!rid) {
        alert("Select a restaurant before adding a menu item.");
        return;
      }

      // build typed payload matching schema.json (menu_items)
      const payload: any = {
        restaurant_id: Number(rid),
        // category is text
        category: menuForm.category && String(menuForm.category).trim() !== "" ? String(menuForm.category) : null,
        name: menuForm.name || null,
        description: menuForm.description || null,
        price: menuForm.price !== undefined && menuForm.price !== "" ? Number(menuForm.price) : 0,
        is_available: !!menuForm.is_available,
        is_vegetarian: !!menuForm.is_vegetarian,
        is_vegan: !!menuForm.is_vegan,
        is_gluten_free: !!menuForm.is_gluten_free,
        calories: menuForm.calories !== undefined && menuForm.calories !== "" ? Number(menuForm.calories) : null,
        preparation_time: menuForm.preparation_time !== undefined && menuForm.preparation_time !== "" ? Number(menuForm.preparation_time) : null,
        ingredients: menuForm.ingredients || null,
        allergens: menuForm.allergens || null,
        sort_order: menuForm.sort_order !== undefined && menuForm.sort_order !== "" ? Number(menuForm.sort_order) : 0,
      };

      let res;
      if (editingMenuItem) {
        // ensure restaurant_id is present on edit as well
        payload.restaurant_id = Number(payload.restaurant_id);
        res = await fetch(`/api/menu_items/${editingMenuItem.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || err?.message || "Failed to update menu item");
        }
      } else {
        res = await fetch("/api/menu_items", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || err?.message || "Failed to create menu item");
        }
      }

      // refresh and reset
      if (selectedRestaurantId) await fetchMenuForRestaurant(Number(selectedRestaurantId));
      setEditingMenuItem(null);
      setMenuForm({
        restaurant_id: null,
        category: "",
        name: "",
        description: "",
        price: 0,
        is_available: true,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        calories: null,
        preparation_time: null,
        ingredients: "",
        allergens: "",
        sort_order: 0,
      });
      // close modal after successful save
      setShowMenuModal(false);
    } catch (err) {
      console.error("saveMenuItem", err);
      alert(String(err));
    }
  };

  const deleteMenuItem = async (id: number) => {
    if (!confirm("Delete menu item?")) return;
    try {
      const res = await fetch(`/api/menu_items/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      if (selectedRestaurantId) await fetchMenuForRestaurant(selectedRestaurantId);
    } catch (err) {
      console.error("deleteMenuItem", err);
      alert(String(err));
    }
  };

  // Hide global site navbar while admin is mounted
  useEffect(() => {
    const el = document.getElementById("site-navbar");
    const prevDisplay = el?.style.display;
    if (el) el.style.display = "none";
    return () => {
      if (el) el.style.display = prevDisplay ?? "";
    };
  }, []);

  // fetch orders, restaurants when tab changes
  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "restaurants") fetchRestaurants();
  }, [activeTab]);

  // fetch admin name from session or debug endpoint (server-side will check admin_jwt)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (res.ok) {
          const s = await res.json();
          const name = s?.user?.name;
          if (name) { setAdminName(String(name)); return; }
        }
        // fallback to admin-login debug payload
        const dbg = await fetch("/api/auth/admin-login", { credentials: "include" });
        if (dbg.ok) {
          const d = await dbg.json();
          if (d?.payload?.email) setAdminName(d.payload.email);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const formatCurrency = (amount?: number) => new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(amount || 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      preparing: "bg-orange-100 text-orange-800 border-orange-200",
      ready_for_pickup: "bg-purple-100 text-purple-800 border-purple-200",
      out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pending: <Clock className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      preparing: <Package className="w-4 h-4" />,
      ready_for_pickup: <Package className="w-4 h-4" />,
      out_for_delivery: <Truck className="w-4 h-4" />,
      delivered: <CheckCircle className="w-4 h-4" />,
      cancelled: <AlertCircle className="w-4 h-4" />,
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl"></div>
              <div className="h-96 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top header with tab chooser - removed strong white background */}
      <header className="border-b bg-transparent">
         <div className="container mx-auto px-4 py-3 flex items-center justify-between">
           <div className="flex items-center space-x-4">
             <div className="text-lg font-bold font-poppins">Admin Dashboard</div>
            <nav className="flex items-center space-x-2 ml-6">
              <button className={`px-3 py-1 rounded ${activeTab === "orders" ? "bg-orange-100 text-orange-600" : "text-gray-600"}`} onClick={() => setActiveTab("orders")}>Orders</button>
              <button className={`px-3 py-1 rounded ${activeTab === "restaurants" ? "bg-orange-100 text-orange-600" : "text-gray-600"}`} onClick={() => setActiveTab("restaurants")}>Restaurants</button>
            </nav>
           </div>
 
           <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700 hidden sm:block">{adminName ? `Hi, ${adminName}` : "Admin"}</div>
            <button onClick={() => setShowLogoutModal(true)} className="flex items-center space-x-2 px-3 py-1 border rounded hover:bg-gray-100">
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
           </div>
         </div>
       </header>
 
       <main className="container mx-auto px-4 py-6">
        {/* Orders tab */}
        {activeTab === "orders" && (
          <>
            {/* Filters */}
            <div className="glass-card p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
                </div>
 
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
 
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-field">
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
 
                <select className="input-field">
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
 
            {/* Orders Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Order</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Customer</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Restaurant</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Amount</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Payment</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Time</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredOrders.map((order, index) => (
                        <motion.tr key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-semibold text-gray-900 font-poppins">{order.orderNumber}</div>
                              <div className="text-sm text-gray-500 font-poppins">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-medium text-gray-900 font-poppins">{order.customer?.name}</div>
                              <div className="text-sm text-gray-500 font-poppins">{order.customer?.phone}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6"><div className="font-medium text-gray-900 font-poppins">{order.restaurant?.name}</div></td>
                          <td className="py-4 px-6"><div className="font-semibold text-gray-900 font-poppins">{formatCurrency(order.total)}</div></td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)} font-poppins`}>
                              {getStatusIcon(order.status)}<span>{(order.status || "").replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} font-poppins`}>{order.paymentStatus || '—'}</span>
                          </td>
                          <td className="py-4 px-6"><div className="text-sm text-gray-500 font-poppins">{order.estimatedTime ? order.estimatedTime : 'N/A'}</div></td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <button onClick={() => openOrderDetails(order)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                              <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 font-poppins">
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready_for_pickup">Ready</option>
                                <option value="out_for_delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
 
              {filteredOrders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">No orders found</h3>
                  <p className="text-gray-500 font-poppins">Try adjusting your filters</p>
                </div>
              )}
            </div>
 
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-gray-600 font-poppins">Showing {filteredOrders.length} of {orders.length} orders</div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-poppins">Previous</button>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-poppins">1</button>
                <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-poppins">Next</button>
              </div>
            </div>
          </>
        )}
 
        {activeTab === "restaurants" && (
          <>
            {/* Header with action button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-3">
              <h2 className="text-2xl font-bold font-poppins">Restaurants Management</h2>
              <button
                onClick={() => {
                  setRestaurantForm({
                    name: "",
                    description: "",
                    address: "",
                    phone: "",
                    email: "",
                    cuisine_type: "",
                    delivery_fee: "",
                    minimum_order: "",
                    delivery_time_min: "",
                    delivery_time_max: "",
                    delivery_time: "",
                    opening_hours: "",
                    owner_id: "",
                    is_active: true,
                  });
                  setEditingRestaurant(null);
                  setShowRestaurantModal(true);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-poppins w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Add Restaurant</span>
              </button>
            </div>

            {/* Restaurants Table */}
            <div className="glass-card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                   <thead className="bg-gray-50 border-b border-gray-200">
                     <tr>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Restaurant</th>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Cuisine</th>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Contact</th>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Delivery Info</th>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Status</th>
                       <th className="text-left py-4 px-6 font-semibold text-gray-900 font-poppins">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {restLoading ? (
                       <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading restaurants...</td></tr>
                     ) : restaurants.length === 0 ? (
                       <tr><td colSpan={6} className="py-12 text-center">
                         <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                         <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">No restaurants yet</h3>
                         <p className="text-gray-500 font-poppins">Add your first restaurant to get started</p>
                       </td></tr>
                     ) : (
                       restaurants.map((r) => (
                         <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                           <td className="py-4 px-6">
                             <div className="flex items-center space-x-3">
                               <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold text-lg font-poppins">
                                 {(r.name || "").charAt(0).toUpperCase()}
                               </div>
                               <div>
                                 <div className="font-semibold text-gray-900 font-poppins">{r.name}</div>
                                 <div className="text-sm text-gray-500 font-poppins">{r.address}</div>
                               </div>
                             </div>
                           </td>
                           <td className="py-4 px-6">
                             <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium font-poppins">
                               {r.cuisine_type || "—"}
                             </span>
                           </td>
                           <td className="py-4 px-6">
                             <div>
                               <div className="text-sm text-gray-900 font-poppins">{r.phone || "—"}</div>
                               <div className="text-sm text-gray-500 font-poppins">{r.email || "—"}</div>
                             </div>
                           </td>
                           <td className="py-4 px-6">
                             <div className="text-sm">
                               <div className="text-gray-900 font-poppins">Fee: {formatCurrency(r.delivery_fee)}</div>
                               <div className="text-gray-500 font-poppins">{r.delivery_time_min}-{r.delivery_time_max} min</div>
                             </div>
                           </td>
                           <td className="py-4 px-6">
                             <span className={`px-3 py-1 rounded-full text-sm font-medium font-poppins ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                               {r.is_active ? 'Active' : 'Inactive'}
                             </span>
                           </td>
                           <td className="py-4 px-6">
                             <div className="flex items-center space-x-2">
                               <button onClick={() => { setEditingRestaurant(r); setRestaurantForm({ ...r }); setShowRestaurantModal(true); }} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                                 <Eye className="w-4 h-4" />
                               </button>
                               <button onClick={() => { setSelectedRestaurantId(r.id); fetchMenuForRestaurant(r.id); }} className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors">
                                 <Package className="w-4 h-4" />
                               </button>
                               <button onClick={() => deleteRestaurant(r.id)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors">
                                 <AlertCircle className="w-4 h-4" />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>

            {/* Menu Items Section - shows when restaurant is selected */}
            {selectedRestaurantId && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold font-poppins">Menu Items</h3>
                    <p className="text-sm text-gray-500 font-poppins">
                      {restaurants.find(r => r.id === selectedRestaurantId)?.name}
                    </p>
                  </div>
                  <button onClick={() => { setEditingMenuItem(null); setMenuForm((prev: any) => ({ ...prev, restaurant_id: selectedRestaurantId })); setShowMenuModal(true); }} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-poppins">
                    Add Menu Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 font-poppins">Item</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 font-poppins">Price</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 font-poppins">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 font-poppins">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 font-poppins">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuLoading ? (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading menu...</td></tr>
                      ) : menuItems.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-500">No menu items yet</td></tr>
                      ) : (
                        menuItems.map(mi => (
                          <tr key={mi.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-semibold text-gray-900 font-poppins">{mi.name}</div>
                                <div className="text-sm text-gray-500 font-poppins line-clamp-1">{mi.description}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-900 font-poppins">{formatCurrency(mi.price)}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 font-poppins">{mi.category || "—"}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium font-poppins ${mi.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {mi.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <button onClick={() => { setEditingMenuItem(mi); setMenuForm({ ...mi, restaurant_id: mi.restaurant_id ?? selectedRestaurantId, category: mi.category ?? "" }); setShowMenuModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteMenuItem(mi.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
 
      </main>
 
      {/* Restaurant Modal (create / edit) */}
      <AnimatePresence>
        {showRestaurantModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl p-6 w-full max-w-2xl">
              <h3 className="text-xl font-semibold mb-4">{editingRestaurant ? "Edit Restaurant" : "Create Restaurant"}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Name" value={restaurantForm.name} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Cuisine" value={restaurantForm.cuisine_type} onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisine_type: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <textarea placeholder="Short description" value={restaurantForm.description} onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <input placeholder="Address" value={restaurantForm.address} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Phone" value={restaurantForm.phone} onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Email" value={restaurantForm.email} onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Delivery fee" value={restaurantForm.delivery_fee} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_fee: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Min order" value={restaurantForm.minimum_order} onChange={(e) => setRestaurantForm({ ...restaurantForm, minimum_order: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Delivery time min" value={restaurantForm.delivery_time_min} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time_min: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Delivery time max" value={restaurantForm.delivery_time_max} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time_max: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <input placeholder="Delivery time (label)" value={restaurantForm.delivery_time} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <input placeholder="Opening hours (e.g. 09:00-22:00)" value={restaurantForm.opening_hours} onChange={(e) => setRestaurantForm({ ...restaurantForm, opening_hours: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Owner user id (optional)" value={restaurantForm.owner_id} onChange={(e) => setRestaurantForm({ ...restaurantForm, owner_id: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!restaurantForm.is_active} onChange={(e) => setRestaurantForm({ ...restaurantForm, is_active: e.target.checked })} />
                  <span className="text-sm">Is active</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4">
                <button onClick={() => { setShowRestaurantModal(false); setEditingRestaurant(null); }} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={saveRestaurant} className="px-4 py-2 bg-green-600 text-white rounded">{editingRestaurant ? "Update" : "Create"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-600 mb-4">Are you sure you want to log out?</p>
              <div className="flex items-center justify-end space-x-2">
                <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                      // redirect to home or login page
                      window.location.href = "/";
                    } catch (e) {
                      console.error("Logout failed", e);
                      // fallback: reload to clear session state
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Item Modal */}
      <AnimatePresence>
        {showMenuModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl p-6 w-full max-w-lg">
              <h3 className="text-xl font-semibold mb-4">{editingMenuItem ? "Edit Menu Item" : "Create Menu Item"}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Name" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Category (text)" value={menuForm.category ?? ""} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Price" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })} className="w-full border px-3 py-2 rounded" />
                </div>
                <textarea placeholder="Description" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center mb-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!menuForm.is_available} onChange={(e) => setMenuForm({ ...menuForm, is_available: e.target.checked })} /> Available</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!menuForm.is_vegetarian} onChange={(e) => setMenuForm({ ...menuForm, is_vegetarian: e.target.checked })} /> Vegetarian</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!menuForm.is_vegan} onChange={(e) => setMenuForm({ ...menuForm, is_vegan: e.target.checked })} /> Vegan</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!menuForm.is_gluten_free} onChange={(e) => setMenuForm({ ...menuForm, is_gluten_free: e.target.checked })} /> Gluten-free</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input placeholder="Calories" value={menuForm.calories ?? ""} onChange={(e) => setMenuForm({ ...menuForm, calories: e.target.value ? Number(e.target.value) : null })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Preparation (min)" value={menuForm.preparation_time ?? ""} onChange={(e) => setMenuForm({ ...menuForm, preparation_time: e.target.value ? Number(e.target.value) : null })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Sort order" value={menuForm.sort_order ?? 0} onChange={(e) => setMenuForm({ ...menuForm, sort_order: Number(e.target.value) })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Ingredients (comma)" value={menuForm.ingredients} onChange={(e) => setMenuForm({ ...menuForm, ingredients: e.target.value })} className="w-full border px-3 py-2 rounded" />
                  <input placeholder="Allergens (comma)" value={menuForm.allergens} onChange={(e) => setMenuForm({ ...menuForm, allergens: e.target.value })} className="w-full border px-3 py-2 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 mt-4">
                <button onClick={() => { setShowMenuModal(false); setEditingMenuItem(null); }} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={saveMenuItem} className="px-4 py-2 bg-green-600 text-white rounded">{editingMenuItem ? "Update" : "Create"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}