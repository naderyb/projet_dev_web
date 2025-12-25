"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import useRealtime from "../../hooks/useRealtime";
import toast from "react-hot-toast";
import Link from "next/link";

export default function DeliveryDashboard() {
  const { data: session, status } = useSession();
  const [online, setOnline] = useState<boolean>(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [todayDeliveries, setTodayDeliveries] = useState<number>(0);

  // confirmation modal state
  const [confirm, setConfirm] = useState<{
    open: boolean;
    orderId?: number;
    action?: "accept" | "delivered" | "picked_up";
  }>({ open: false });

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
    if (status === "authenticated") fetchOrders();
  }, [status, fetchOrders]);

  // Recalculate today's stats whenever orders change
  useEffect(() => {
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
      if (
        t >= start &&
        o.status === "delivered" &&
        o.delivery_user_id &&
        String(o.delivery_user_id) === String(myUserId)
      ) {
        earnings += Number(o.total || 0);
        deliveries += 1;
      }
    });
    setTodayEarnings(earnings);
    setTodayDeliveries(deliveries);
  }, [orders, myUserId]);

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
        if (found) {
          return prev.map((o) => (o.id === updated.id ? updated : o));
        }
        if (
          updated.delivery_user_id &&
          String(updated.delivery_user_id) ===
            String((session as any)?.user?.id)
        ) {
          return [updated, ...prev];
        }
        return prev;
      });
    }
  });

  // Accept flow now requires confirmation modal
  const onAcceptClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "accept" });
  };
  const onDeliveredClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "delivered" });
  };
  const onPickedUpClicked = (orderId: number) => {
    setConfirm({ open: true, orderId, action: "picked_up" });
  };

  const performConfirmedAction = async () => {
    if (!confirm.orderId || !confirm.action) return setConfirm({ open: false });
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

  // Accept an order: assign to current delivery user and update status to 'accepted'
  const acceptOrder = async (orderId: number) => {
    if (!(session as any)?.user?.id) {
      toast.error("Not authenticated");
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignDeliveryUserId: Number((session as any).user.id),
          status: "accepted",
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        toast.success("Order accepted");
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to accept order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  // Update status flow
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
        toast.success("Status updated");
      } else {
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

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-blue-100 text-blue-700";
      case "preparing":
        return "bg-orange-100 text-orange-700";
      case "ready_for_pickup":
        return "bg-purple-100 text-purple-700";
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const myActiveOrders = orders.filter(
    (o) =>
      o.delivery_user_id &&
      String(o.delivery_user_id) === String(myUserId) &&
      o.status !== "delivered" &&
      o.status !== "cancelled"
  );
  const availableOrders = orders.filter((o) => !o.delivery_user_id);

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header + stats */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={
                  online
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {online ? "Online" : "Offline"}
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-sm text-gray-500">Today's earnings</div>
              <div className="text-xl font-semibold">
                {formatCurrency(todayEarnings)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Deliveries</div>
              <div className="text-xl font-semibold">{todayDeliveries}</div>
            </div>
            <button
              onClick={() => {
                setOnline((s) => !s);
                fetchOrders();
              }}
              className={`px-4 py-2 rounded text-sm font-medium ${
                online
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {online ? "Go Offline" : "Go Online"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: My active orders */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">My active orders</h2>
              {loading ? (
                <div className="p-4 bg-white rounded shadow">
                  Loading orders...
                </div>
              ) : myActiveOrders.length === 0 ? (
                <div className="p-4 bg-white rounded shadow text-sm text-gray-500">
                  No active orders assigned to you yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {myActiveOrders.map((o) => {
                    const customerName =
                      o.customer_name ?? o.user_name ?? o.user_email;
                    const customerPhone = o.customer_phone ?? o.phone;
                    return (
                      <div
                        key={o.id}
                        className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold">
                            Order #{o.id} — {o.restaurant_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {o.delivery_address}
                          </div>
                          <div className="text-sm text-gray-600">
                            Customer: {customerName}{" "}
                            {customerPhone ? `— ${customerPhone}` : ""}
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: {formatCurrency(o.total)}
                          </div>
                          <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-50">
                            <span className={statusBadgeClass(o.status)}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {o.status === "ready_for_pickup" && (
                            <button
                              onClick={() => onPickedUpClicked(o.id)}
                              className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
                            >
                              Mark as picked up
                            </button>
                          )}
                          {o.status === "out_for_delivery" && (
                            <button
                              onClick={() => onDeliveredClicked(o.id)}
                              className="px-3 py-2 bg-gray-800 text-white rounded text-sm"
                            >
                              Mark as delivered
                            </button>
                          )}
                          <Link
                            href={`/orders/${o.id}`}
                            className="text-xs text-gray-600 underline"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available orders */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Available nearby orders
              </h2>
              {loading ? (
                <div className="p-4 bg-white rounded shadow">
                  Loading orders...
                </div>
              ) : availableOrders.length === 0 ? (
                <div className="p-4 bg-white rounded shadow text-sm text-gray-500">
                  No available orders right now.
                </div>
              ) : (
                <div className="space-y-4">
                  {availableOrders.map((o) => {
                    const customerName =
                      o.customer_name ?? o.user_name ?? o.user_email;
                    const customerPhone = o.customer_phone ?? o.phone;
                    const canAccept = online;
                    return (
                      <div
                        key={o.id}
                        className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold">
                            Order #{o.id} — {o.restaurant_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {o.delivery_address}
                          </div>
                          <div className="text-sm text-gray-600">
                            Customer: {customerName}{" "}
                            {customerPhone ? `— ${customerPhone}` : ""}
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: {formatCurrency(o.total)}
                          </div>
                          <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-50">
                            <span className={statusBadgeClass(o.status)}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <button
                            disabled={!canAccept}
                            onClick={() => onAcceptClicked(o.id)}
                            className={`px-3 py-2 rounded text-sm ${
                              canAccept
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            Accept order
                          </button>
                          <Link
                            href={`/orders/${o.id}`}
                            className="text-xs text-gray-600 underline"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: small helper panel */}
          <aside className="space-y-4">
            <div className="p-4 bg-white rounded shadow text-sm text-gray-700">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Go Online to start receiving orders.</li>
                <li>Accept an order to assign it to yourself.</li>
                <li>Mark it as picked up when you leave the restaurant.</li>
                <li>Mark it as delivered when the customer receives it.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {confirm.action === "accept"
                ? "Confirm accept"
                : confirm.action === "picked_up"
                ? "Confirm picked up"
                : "Confirm delivered"}
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to{" "}
              {confirm.action === "accept"
                ? "accept"
                : confirm.action === "picked_up"
                ? "mark as picked up"
                : "mark as delivered"}{" "}
              order #{confirm.orderId}?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirm({ open: false })}
                className="px-3 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={performConfirmedAction}
                className="px-3 py-2 bg-green-500 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}