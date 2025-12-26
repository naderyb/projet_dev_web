"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<
    { menu_item_id: number; name: string; price: number; qty: number }[]
  >([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [rRes, mRes] = await Promise.all([
          fetch(`/api/restaurants/${id}`),
          fetch(`/api/menu_items/${id}`),
        ]);
        if (!mounted) return;
        if (rRes.ok) {
          const r = await rRes.json();
          setRestaurant(r);
        } else {
          // not found -> navigate back
          router.push("/");
          return;
        }
        if (mRes.ok) {
          const items = await mRes.json();
          setMenu(
            Array.isArray(items)
              ? items.map((mi: any) => ({
                  ...mi,
                  price: Number(mi.price || 0),
                }))
              : []
          );
        } else {
          setMenu([]);
        }
      } catch (err) {
        console.error("Failed to load restaurant page", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, router]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.menu_item_id === Number(item.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [
        ...prev,
        {
          menu_item_id: Number(item.id),
          name: item.name,
          price: Number(item.price || 0),
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (menu_item_id: number, qty: number) => {
    setCart((prev) =>
      prev
        .map((p) =>
          p.menu_item_id === menu_item_id ? { ...p, qty: Math.max(0, qty) } : p
        )
        .filter((p) => p.qty > 0)
    );
  };

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const deliveryFee =
    restaurant?.delivery_fee != null ? Number(restaurant.delivery_fee) : 0;
  const total = subtotal + (Number.isFinite(deliveryFee) ? deliveryFee : 0);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!restaurant) return;
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    if (!address || !phone) {
      alert("Please enter delivery address and phone");
      return;
    }

    setCheckoutLoading(true);
    try {
      const payload = {
        // send both shapes so backend is satisfied
        restaurantId: restaurant.id,
        restaurant_id: restaurant.id,
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.qty,
          price: c.price,
        })),
        total,
        subtotal,
        deliveryFee, // keep original camelCase in case API uses it
        delivery_fee: deliveryFee,
        deliveryAddress: address,
        delivery_address: address,
        phone,
        notes: "",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Order error", data);
        alert(data?.error || data?.message || "Failed to create order");
        setCheckoutLoading(false);
        return;
      }
      alert("Order placed successfully");
      setCart([]);
      // navigate to orders or thank-you
      router.push("/orders");
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!restaurant) {
    return <div className="p-8">Restaurant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">
              {restaurant.cuisine_type} • {restaurant.address}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Delivery:{" "}
              {restaurant.delivery_time ||
                `${restaurant.delivery_time_min}-${restaurant.delivery_time_max} min`}{" "}
              • Fee:{" "}
              {new Intl.NumberFormat("ar-DZ", {
                style: "currency",
                currency: "DZD",
                minimumFractionDigits: 0,
              }).format(deliveryFee)}
            </p>
            {restaurant.description && (
              <p className="mt-2 text-gray-700">{restaurant.description}</p>
            )}
            {restaurant.opening_hours && (
              <p className="mt-1 text-sm text-gray-500">
                Hours:{" "}
                {typeof restaurant.opening_hours === "string"
                  ? restaurant.opening_hours
                  : JSON.stringify(restaurant.opening_hours)}
              </p>
            )}
          </div>

          <h2 className="text-2xl font-semibold mb-3">Menu</h2>
          <div className="space-y-3">
            {menu.length === 0 && (
              <div className="text-gray-500">No menu items</div>
            )}
            {menu.map((mi) => (
              <div
                key={mi.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-medium">{mi.name}</div>
                  <div className="text-sm text-gray-500">{mi.description}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="font-semibold">
                    {new Intl.NumberFormat("ar-DZ", {
                      style: "currency",
                      currency: "DZD",
                      minimumFractionDigits: 0,
                    }).format(Number(mi.price || 0))}
                  </div>
                  <button
                    onClick={() => addToCart(mi)}
                    className="px-3 py-1 bg-orange-500 text-white rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Your Cart</h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {cart.length === 0 ? (
              <div className="text-sm text-gray-500">Cart empty</div>
            ) : (
              cart.map((c) => (
                <div
                  key={c.menu_item_id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Intl.NumberFormat("ar-DZ", {
                        style: "currency",
                        currency: "DZD",
                        minimumFractionDigits: 0,
                      }).format(c.price)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQty(c.menu_item_id, c.qty - 1)}
                      className="px-2 border rounded"
                    >
                      -
                    </button>
                    <div>{c.qty}</div>
                    <button
                      onClick={() => updateQty(c.menu_item_id, c.qty + 1)}
                      className="px-2 border rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>
                {new Intl.NumberFormat("ar-DZ", {
                  style: "currency",
                  currency: "DZD",
                  minimumFractionDigits: 0,
                }).format(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery</span>
              <span>
                {new Intl.NumberFormat("ar-DZ", {
                  style: "currency",
                  currency: "DZD",
                  minimumFractionDigits: 0,
                }).format(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>
                {new Intl.NumberFormat("ar-DZ", {
                  style: "currency",
                  currency: "DZD",
                  minimumFractionDigits: 0,
                }).format(total)}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input
              placeholder="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
        </aside>
      </div>
    </div>
  );
}
