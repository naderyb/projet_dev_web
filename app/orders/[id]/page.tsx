"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type OrderItem = {
  id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  name?: string;
};

type TrackingRow = {
  id: number;
  status: string;
  notes?: string | null;
  created_at: string;
};

type OrderDetails = {
  id: number;
  restaurant_name?: string;
  user_name?: string;
  user_email?: string;
  status: string;
  total: number;
  subtotal?: number;
  delivery_fee?: number;
  delivery_address?: string;
  phone?: string;
  created_at?: string;
  items: OrderItem[];
  tracking: TrackingRow[];
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${id}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load order");
        }
        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        console.error("Order detail fetch error", err);
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatCurrency = (amount?: number) =>
    new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("delivered") || s.includes("completed"))
      return "bg-green-100 text-green-700 border-green-200";
    if (s.includes("preparing") || s.includes("progress"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (s.includes("transit") || s.includes("way"))
      return "bg-purple-100 text-purple-700 border-purple-200";
    if (s.includes("cancelled") || s.includes("failed"))
      return "bg-red-100 text-red-700 border-red-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
              <div
                className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-center mt-4 text-gray-600">
              Loading order details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="container mx-auto px-4 max-w-6xl space-y-4">
          <Link
            href="/delivery"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to orders
          </Link>
          <div className="bg-red-50 text-red-700 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-semibold mb-1">Error loading order</h3>
                <p className="text-sm">{error || "Order not found"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = order.subtotal ?? 0;
  const deliveryFee = order.delivery_fee ?? 0;
  const total = order.total ?? subtotal + deliveryFee;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <svg
            className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Order #{order.id}
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {order.restaurant_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : ""}
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatCurrency(total)}
              </div>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                  order.status || ""
                )}`}
              >
                <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                {(order.status || "").replace("_", " ")}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Delivery Details</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              {order.delivery_address || "—"}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {order.phone || "—"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Customer</h2>
            </div>
            <p className="text-sm text-gray-700 font-medium">
              {order.user_name || order.user_email || "—"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Payment Summary</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Delivery Fee</span>
                <span className="font-medium">
                  {formatCurrency(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-orange-200 pt-2 mt-2">
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items and Tracking */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Order Items</h2>
            </div>
            {!order.items || order.items.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                No items found.
              </div>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-bold text-orange-600 shadow-sm">
                        {item.quantity}×
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.name || `Item #${item.menu_item_id}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(item.price)} each
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Status Timeline</h2>
            </div>
            {!order.tracking || order.tracking.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                No tracking updates yet.
              </div>
            ) : (
              <ol className="relative border-l-2 border-gray-200 ml-5 space-y-6">
                {order.tracking.map((t, idx) => (
                  <li key={t.id} className="ml-6 relative">
                    <div
                      className={`absolute -left-8 w-4 h-4 rounded-full border-2 border-white ${
                        idx === 0
                          ? "bg-orange-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <div
                      className={`${
                        idx === 0
                          ? "bg-orange-50 border-orange-200"
                          : "bg-gray-50 border-gray-200"
                      } border rounded-lg p-3`}
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {(t.status || "").replace("_", " ")}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {t.created_at
                          ? new Date(t.created_at).toLocaleString()
                          : ""}
                      </div>
                      {t.notes && (
                        <div className="text-xs text-gray-600 mt-2 italic">
                          {t.notes}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
