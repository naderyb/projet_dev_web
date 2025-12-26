"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import useRealtime from "../../hooks/useRealtime";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Package,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Truck,
  AlertCircle,
} from "lucide-react";

export default function DeliveryDashboard() {
  const { data: session } = useSession();
  const [online, setOnline] = useState<boolean>(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    orderId?: number;
    action?: "accept" | "delivered" | "picked_up";
  }>({ open: false });

  // NEW: local stats increments when driver confirms delivery
  const [confirmedTodayIds, setConfirmedTodayIds] = useState<number[]>([]);
  const [manualStats, setManualStats] = useState({
    earningsDelta: 0,
    deliveriesDelta: 0,
  });

  const myUserId = (session as any)?.user?.id;

  const getCurrentPosition = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/orders";
      try {
        const pos = await getCurrentPosition();
        const radiusKm = 10;
        url += `?lat=${pos.lat}&lng=${pos.lng}&radius=${radiusKm}`;
      } catch (_err) {
        // ignore geolocation errors
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to load delivery orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Today stats: if logged in -> only own delivered orders, otherwise all delivered
  const stats = useMemo(() => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    let earnings = 0;
    let deliveries = 0;

    orders.forEach((o) => {
      const t = new Date(o.created_at).getTime();
      if (t < start) return;
      if (o.status !== "delivered") return;

      const isMine = myUserId
        ? o.delivery_user_id && String(o.delivery_user_id) === String(myUserId)
        : true; // when not logged in, count all delivered

      if (!isMine) return;

      // use delivery fee if available, fallback to total
      const earningPerOrder = Number(
        o.delivery_fee ?? o.deliveryFee ?? o.fee ?? o.total ?? 0
      );
      earnings += earningPerOrder;
      deliveries += 1;
    });

    return { earnings, deliveries };
  }, [orders, myUserId]);

  // final values shown in header (base from statuses + manual confirms)
  const totalEarnings = stats.earnings + manualStats.earningsDelta;
  const totalDeliveries = stats.deliveries + manualStats.deliveriesDelta;

  // Realtime updates
  useRealtime("delivery", (msg: any) => {
    if (!msg) return;

    if (msg.type === "order:assigned" && msg.payload?.order) {
      setOrders((prev) => [
        msg.payload.order,
        ...prev.filter((o) => o.id !== msg.payload.order.id),
      ]);
      toast.success("New assigned order received");
      return;
    }

    if (msg.type === "order:update" && msg.payload?.order) {
      const updated = msg.payload.order;
      setOrders((prev) => {
        const found = prev.find((o) => o.id === updated.id);
        const next = found
          ? prev.map((o) => (o.id === updated.id ? updated : o))
          : updated.delivery_user_id &&
            String(updated.delivery_user_id) === String(myUserId)
          ? [updated, ...prev]
          : prev;

        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated);
        }

        return next;
      });
    }
  });

  const onAcceptClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "accept" });
  };

  const onDeliveredClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "delivered" });
  };

  const onPickedUpClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "picked_up" });
  };

  const onConfirmDeliveryStats = (order: any) => {
    if (!order) return;
    const id = Number(order.id);
    if (!id || confirmedTodayIds.includes(id)) return;

    const earningPerOrder = Number(
      order.delivery_fee ?? order.deliveryFee ?? order.fee ?? order.total ?? 0
    );

    setConfirmedTodayIds((prev) => [...prev, id]);
    setManualStats((prev) => ({
      earningsDelta: prev.earningsDelta + earningPerOrder,
      deliveriesDelta: prev.deliveriesDelta + 1,
    }));
  };

  const performConfirmedAction = async () => {
    if (!confirm.orderId || !confirm.action) {
      setConfirm({ open: false });
      return;
    }

    const orderId = confirm.orderId;

    if (confirm.action === "accept") {
      await acceptOrder(orderId);
    } else if (confirm.action === "picked_up") {
      await updateOrderStatus(orderId, "out_for_delivery");
    } else if (confirm.action === "delivered") {
      await updateOrderStatus(orderId, "delivered");
    }

    setConfirm({ open: false });
  };

  const acceptOrder = async (orderId: number) => {
    try {
      const body: any = { status: "accepted" };
      const userId = (session as any)?.user?.id;
      if (userId) {
        body.assignDeliveryUserId = Number(userId);
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        setSelectedOrder(updated);
        toast.success("Order accepted successfully");
        fetchOrders();
      } else {
        if (res.status === 401) {
          toast.error(
            "Unauthorized. Please contact admin for delivery access."
          );
          return;
        }
        const err = await res.json();
        toast.error(err?.error || "Failed to accept order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const updateOrderStatus = async (orderId: number, statusValue: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: statusValue }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        setSelectedOrder(updated);
        toast.success("Status updated successfully");
        fetchOrders();
      } else {
        if (res.status === 401) {
          toast.error(
            "Unauthorized. Please contact admin for delivery access."
          );
          return;
        }
        const err = await res.json();
        toast.error(err?.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const formatCurrency = (amount: number) =>
    `${Number(amount || 0).toFixed(0)} DA`;

  const getStatusConfig = (status: string) => {
    const configs = {
      accepted: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        label: "Accepted",
      },
      preparing: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        label: "Preparing",
      },
      ready_for_pickup: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        label: "Ready for Pickup",
      },
      out_for_delivery: {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200",
        label: "Out for Delivery",
      },
      delivered: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        label: "Delivered",
      },
      cancelled: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        label: "Cancelled",
      },
      default: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        label: status,
      },
    };
    return configs[status as keyof typeof configs] || configs.default;
  };

  // Active orders: all non-delivered / non-cancelled orders that are either:
  // - assigned to this delivery user, or
  // - unassigned (for setups without auth assigning)
  const myActiveOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.status === "delivered" || o.status === "cancelled") return false;
        if (!o.delivery_user_id) return true;
        if (!myUserId) return true;
        return String(o.delivery_user_id) === String(myUserId);
      }),
    [orders, myUserId]
  );

  const OrderCard = ({ order }: { order: any }) => {
    const customerName =
      order.customer_name ?? order.user_name ?? order.user_email;
    const customerPhone = order.customer_phone ?? order.phone;
    const items = order.items || order.order_items || [];
    const statusConfig = getStatusConfig(order.status);

    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-900">
                  Order #{order.id}
                </span>
              </div>
              <p className="text-sm text-gray-600">{order.restaurant_name}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{order.delivery_address}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">
                {customerName}
                {customerPhone ? ` • ${customerPhone}` : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Items */}
          {Array.isArray(items) && items.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Items:
              </div>
              <ul className="space-y-1">
                {items.map((it: any, idx: number) => {
                  const itemName =
                    it.name ||
                    it.item_name ||
                    it.menu_item_name ||
                    it.menu_name ||
                    `Item #${it.menu_item_id || idx + 1}`;
                  const qty = it.quantity || it.qty || it.quantity_ordered || 1;
                  return (
                    <li
                      key={it.id || it.menu_item_id || idx}
                      className="text-xs text-gray-600 flex items-center gap-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-medium">
                        {qty}
                      </span>
                      <span>{itemName}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Actions for active orders */}
          <div className="flex gap-2">
            {/* NEW: accept button for pending/confirmed/preparing */}
            {(order.status === "pending" ||
              order.status === "confirmed" ||
              order.status === "preparing") && (
              <button
                onClick={() => onAcceptClicked(order.id)}
                disabled={!online}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Accept
              </button>
            )}

            {order.status === "ready_for_pickup" && (
              <button
                onClick={() => onPickedUpClicked(order.id)}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Picked Up
              </button>
            )}
            {order.status === "out_for_delivery" && (
              <button
                onClick={() => onDeliveredClicked(order.id)}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Delivered
              </button>
            )}
            {/* NEW: confirm delivery stats when status is already delivered */}
            {order.status === "delivered" &&
              !confirmedTodayIds.includes(Number(order.id)) && (
                <button
                  onClick={() => onConfirmDeliveryStats(order)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm delivery
                </button>
              )}
            <button
              onClick={() => setSelectedOrder(order)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              View details
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Delivery Dashboard
              </h1>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    online ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                ></div>
                <span className="text-sm text-gray-600">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      online ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {online ? "Online" : "Offline"}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalEarnings)}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Today's Earnings
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {totalDeliveries}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Deliveries
                  </div>
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={() => {
                  setOnline((s) => !s);
                  fetchOrders();
                }}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  online
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                }`}
              >
                {online ? "Go Offline" : "Go Online"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Orders only */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Active Orders
                </h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {myActiveOrders.length}
                </span>
              </div>

              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading orders...</p>
                </div>
              ) : myActiveOrders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myActiveOrders.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: only tips now (details moved to modal) */}
          <aside className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Quick Guide
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>
                    Go <strong>Online</strong> to receive orders
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>
                    Orders assigned to you appear in{" "}
                    <strong>Active Orders</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>
                    Mark <strong>Picked Up</strong> when leaving restaurant
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>
                    Mark <strong>Delivered</strong> upon completion
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Order details modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{selectedOrder.id}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedOrder.restaurant_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                    getStatusConfig(selectedOrder.status).bg
                  } ${getStatusConfig(selectedOrder.status).text} ${
                    getStatusConfig(selectedOrder.status).border
                  }`}
                >
                  {getStatusConfig(selectedOrder.status).label}
                </span>
                {selectedOrder.created_at && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {selectedOrder.delivery_address}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">
                    {selectedOrder.customer_name ??
                      selectedOrder.user_name ??
                      selectedOrder.user_email}
                    {selectedOrder.customer_phone &&
                      ` • ${selectedOrder.customer_phone}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Items in modal */}
              {Array.isArray(
                (selectedOrder as any).items ||
                  (selectedOrder as any).order_items
              ) &&
                (
                  ((selectedOrder as any).items ||
                    (selectedOrder as any).order_items) as any[]
                ).length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      Items:
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                      {(
                        ((selectedOrder as any).items ||
                          (selectedOrder as any).order_items) as any[]
                      ).map((it: any, idx: number) => {
                        const itemName =
                          it.name ||
                          it.item_name ||
                          it.menu_item_name ||
                          it.menu_name ||
                          `Item #${it.menu_item_id || idx + 1}`;
                        const qty =
                          it.quantity || it.qty || it.quantity_ordered || 1;
                        return (
                          <li
                            key={it.id || it.menu_item_id || idx}
                            className="flex items-center justify-between text-xs text-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                                {qty}
                              </span>
                              <span>{itemName}</span>
                            </span>
                            {it.price && (
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(Number(it.price || 0) * qty)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {confirm.action === "accept"
                  ? "Accept Order"
                  : confirm.action === "picked_up"
                  ? "Confirm Pickup"
                  : "Confirm Delivery"}
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to{" "}
                {confirm.action === "accept"
                  ? "accept"
                  : confirm.action === "picked_up"
                  ? "mark as picked up"
                  : "mark as delivered"}{" "}
                <strong>order #{confirm.orderId}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm({ open: false })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performConfirmedAction}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
