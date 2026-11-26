import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bus,
  Check,
  ClipboardList,
  Home,
  IndianRupee,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Store,
  ToggleLeft,
  ToggleRight,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { DesktopBrowserFrame } from '../components/DesktopBrowserFrame';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import type { OrderStatus, PlatformState } from '../types/platform';

/**
 * Resolve menu image paths for the GitHub Pages deployment (/busbite/).
 * Supports API paths (/assets/images/...), legacy source paths
 * (/src/assets/images/...), and absolute external image URLs.
 */
const getRestaurantImageUrl = (imagePath?: string | null): string => {
  if (!imagePath) return '';
  const value = imagePath.trim();
  if (!value) return '';

  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) {
    return value;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = value
    .replace(/^\/+/, '')
    .replace(/^src\/assets\//, 'assets/');
  const baseWithoutLeadingSlash = base.replace(/^\/+/, '');

  if (cleanPath.startsWith(baseWithoutLeadingSlash)) {
    return `/${cleanPath}`;
  }

  return `${base}${cleanPath}`;
};

interface RestaurantPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

export function RestaurantPortal({ state, post, patch, tourSignal }: RestaurantPortalProps) {
  const approvedRestaurants = useMemo(
    () => state.restaurants.filter((r) => r.status === 'APPROVED'),
    [state.restaurants]
  );

  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    if (!tourSignal) return;
    if (tourSignal.restaurantMode === 'toggle') {
      setViewMode((prev) => (prev === 'mobile' ? 'desktop' : 'mobile'));
    } else if (tourSignal.restaurantMode) {
      setViewMode(tourSignal.restaurantMode);
    }
  }, [tourSignal?.nonce]);
  const [selectedRestId, setSelectedRestId] = useState<string>(approvedRestaurants[0]?.id || 'rest-a2b');
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'buses' | 'menu' | 'payouts'>('home');
  const [desktopSection, setDesktopSection] = useState<'dispatch' | 'buses' | 'menu' | 'payouts'>('dispatch');
  const [orderStageFilter, setOrderStageFilter] = useState<'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED'>('NEW');
  const [pickupVerifyCode, setPickupVerifyCode] = useState<string>('');
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Add Menu Item State
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCat, setDishCat] = useState('South Indian Classics');
  const [dishPrice, setDishPrice] = useState('180');
  const [dishDesc, setDishDesc] = useState('');
  const [dishVeg, setDishVeg] = useState(true);

  const restaurant = useMemo(
    () => state.restaurants.find((r) => r.id === selectedRestId) || approvedRestaurants[0],
    [state.restaurants, selectedRestId, approvedRestaurants]
  );

  const restaurantOrders = useMemo(
    () =>
      state.orders.filter(
        (o) => o.restaurantId === restaurant?.id && o.paymentStatus !== 'FAILED'
      ),
    [state.orders, restaurant]
  );

  const incomingBuses = useMemo(() => {
    if (!restaurant) return [];
    return state.trips
      .map((trip) => {
        const stopEta = trip.stopEtas.find((s) => s.restaurantId === restaurant.id);
        if (!stopEta) return null;
        const vehicle = state.vehicles.find((v) => v.id === trip.vehicleId);
        const route = state.routes.find((r) => r.id === trip.routeId);
        const queuedOrders = restaurantOrders.filter(
          (o) =>
            o.tripId === trip.id &&
            ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
        );
        return { trip, stopEta, vehicle, route, queuedOrders };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [state.trips, state.vehicles, state.routes, restaurant, restaurantOrders]);

  const restaurantMenu = useMemo(
    () => state.menuItems.filter((m) => m.restaurantId === restaurant?.id),
    [state.menuItems, restaurant]
  );

  const restaurantAlerts = useMemo(
    () =>
      state.notifications
        .filter((n) => n.targetRole === 'RESTAURANT' && (!n.targetId || n.targetId === restaurant?.id))
        .slice(0, 8),
    [state.notifications, restaurant]
  );

  const restaurantSettlements = useMemo(
    () => state.settlements.filter((s) => s.restaurantId === restaurant?.id),
    [state.settlements, restaurant]
  );

  const financialSummary = useMemo(() => {
    const valid = restaurantOrders.filter((o) => o.status !== 'REJECTED' && o.status !== 'CANCELLED');
    const gross = valid.reduce((s, o) => s + o.subtotal, 0);
    const commission = valid.reduce((s, o) => s + o.platformCommission, 0);
    const netPayable = valid.reduce((s, o) => s + o.restaurantPayable, 0);
    const settledIds = new Set(restaurantSettlements.flatMap((s) => s.orderIds));
    const pendingSettlement = valid
      .filter((o) => !settledIds.has(o.id))
      .reduce((s, o) => s + o.restaurantPayable, 0);
    return { gross, commission, netPayable, pendingSettlement, count: valid.length };
  }, [restaurantOrders, restaurantSettlements]);

  if (!restaurant) return null;

  const advanceOrder = async (orderId: string, status: OrderStatus, reason?: string) => {
    await patch(`/api/orders/${orderId}/status`, {
      status,
      reason,
      actorRole: 'RESTAURANT',
    });
  };

  const handleVerifyPickup = async () => {
    const code = pickupVerifyCode.trim();
    if (!code) return;
    const match = restaurantOrders.find(
      (o) => (o.pickupCode === code || o.id.toLowerCase() === code.toLowerCase()) && o.status === 'READY'
    );
    if (!match) {
      setVerifyFeedback('No READY order matches that code.');
      return;
    }
    await advanceOrder(match.id, 'COMPLETED');
    setPickupVerifyCode('');
    setVerifyFeedback(`Completed ${match.id} (${match.passengerName}).`);
    window.setTimeout(() => setVerifyFeedback(null), 3500);
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    await post('/api/menu-items', {
      restaurantId: restaurant.id,
      category: dishCat,
      name: dishName,
      description: dishDesc,
      price: Number(dishPrice) || 150,
      isVeg: dishVeg,
    });
    setDishName('');
    setDishDesc('');
    setShowAddDish(false);
  };

  const activeOrderCount = restaurantOrders.filter((o) =>
    ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
  ).length;

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[28px] p-4 max-h-[75%] overflow-y-auto space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Kitchen & Bus ETA Alerts</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {restaurantAlerts.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No new alerts for {restaurant.name}.</p>
        ) : (
          restaurantAlerts.map((n) => (
            <div key={n.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
              <div className="font-semibold text-emerald-950">{n.title}</div>
              <div className="text-slate-600 mt-0.5">{n.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  const modeSwitcher = (
    <div className="inline-flex flex-wrap justify-center items-center gap-1 rounded-xl bg-white border border-emerald-200/80 p-1 shadow-xs max-w-full">
      <button
        type="button"
        onClick={() => setViewMode('mobile')}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
          viewMode === 'mobile'
            ? 'bg-emerald-900 text-white'
            : 'text-slate-600 hover:text-emerald-900'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        Mobile App (320px)
      </button>
      <button
        type="button"
        onClick={() => setViewMode('desktop')}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
          viewMode === 'desktop'
            ? 'bg-emerald-900 text-white'
            : 'text-slate-600 hover:text-emerald-900'
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
        Desktop View
      </button>
    </div>
  );

  if (viewMode === 'desktop') {
    const kanbanColumns: {
      stage: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY';
      title: string;
      accent: string;
    }[] = [
      { stage: 'NEW', title: 'New Paid Orders', accent: 'border-emerald-300 bg-emerald-50/70 text-emerald-900' },
      { stage: 'ACCEPTED', title: 'Accepted Queue', accent: 'border-slate-200 bg-slate-50 text-slate-900' },
      { stage: 'PREPARING', title: 'Cooking in Kitchen', accent: 'border-amber-200 bg-amber-50/60 text-amber-950' },
      { stage: 'READY', title: 'Ready for Pickup', accent: 'border-emerald-500 bg-emerald-900 text-white' },
    ];

    const desktopHistoryOrders = restaurantOrders.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'REJECTED' || o.status === 'CANCELLED'
    );

    return (
      <DesktopBrowserFrame
        url={`kitchen.busbite.app/${restaurant.id}/${desktopSection}`}
        title={`${restaurant.name} — Kitchen Dispatch`}
        subtitle={`${restaurant.city} · BusBite Partner POS`}
        topBarSlot={modeSwitcher}
      >
        <div className="p-3.5 sm:p-5 flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Desktop Left Sidebar */}
          <aside className="lg:w-56 shrink-0 space-y-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{restaurant.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{restaurant.city}</div>
                </div>
              </div>

              <select
                value={restaurant.id}
                onChange={(e) => setSelectedRestId(e.target.value)}
                aria-label="Switch Restaurant Partner Desktop"
                className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2"
              >
                {approvedRestaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.city})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  patch(`/api/restaurants/${restaurant.id}`, {
                    acceptingOrders: !restaurant.acceptingOrders,
                  })
                }
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                  restaurant.acceptingOrders
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {restaurant.acceptingOrders ? (
                  <>
                    <ToggleRight className="w-4 h-4" /> Accepting Pre-Orders
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" /> Kitchen Paused
                  </>
                )}
              </button>
            </div>

            <nav className="bg-white border border-slate-200 rounded-xl p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {(
                [
                  { id: 'dispatch', label: 'Kitchen Dispatch', icon: ClipboardList, badge: activeOrderCount || undefined },
                  { id: 'buses', label: 'Incoming Buses & Map', icon: Bus, badge: incomingBuses.length || undefined },
                  { id: 'menu', label: 'Menu & Inventory', icon: UtensilsCrossed },
                  { id: 'payouts', label: 'Sales & Settlements', icon: IndianRupee },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = desktopSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDesktopSection(item.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-emerald-900 text-white'
                        : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {'badge' in item && item.badge ? (
                      <span className={`font-mono text-[11px] font-bold ${active ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Live Kitchen Alerts Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-700" /> Kitchen Alerts
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  {restaurantAlerts.length}
                </span>
              </div>
              {restaurantAlerts.length === 0 ? (
                <p className="text-[11px] text-slate-500">No recent alerts.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {restaurantAlerts.slice(0, 4).map((n) => (
                    <div key={n.id} className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5 text-[11px]">
                      <div className="font-semibold text-emerald-950">{n.title}</div>
                      <div className="text-slate-600 mt-0.5">{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Desktop Main Content */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Top Desktop Action Bar with Pickup Code Verifier */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {desktopSection === 'dispatch' && 'Live Kitchen Order Board'}
                  {desktopSection === 'buses' && 'Approaching Buses & Highway Corridor'}
                  {desktopSection === 'menu' && 'Menu & Real-Time Stock Control'}
                  {desktopSection === 'payouts' && 'Revenue, Commissions & Settlements'}
                </h1>
                <p className="text-xs text-slate-500">
                  {restaurant.name} · {restaurant.operatingHours} · Commission {restaurant.commissionPct}%
                </p>
              </div>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickupVerifyCode}
                    onChange={(e) => setPickupVerifyCode(e.target.value)}
                    placeholder="Verify pickup code (e.g. 4821)"
                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono w-full sm:w-56"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyPickup}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 whitespace-nowrap"
                >
                  Complete Handover
                </button>
                {verifyFeedback && (
                  <span className="text-xs font-semibold text-emerald-800">{verifyFeedback}</span>
                )}
              </div>
            </div>

            {desktopSection === 'dispatch' && (
              <div className="space-y-6">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">New Paid Orders</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                      {restaurantOrders.filter((o) => o.status === 'NEW').length}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Cooking & Ready</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {restaurantOrders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Incoming Buses</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {incomingBuses.length}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Pending Payable</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      ₹{financialSummary.pendingSettlement.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* 2x2 Responsive Desktop Kanban Kitchen Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {kanbanColumns.map((col) => {
                    const colOrders = restaurantOrders.filter((o) => o.status === col.stage);
                    return (
                      <div key={col.stage} className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
                        <div className={`px-4 py-3 border-b flex items-center justify-between ${col.accent}`}>
                          <span className="text-xs font-bold">{col.title}</span>
                          <span className="text-xs font-mono font-bold">{colOrders.length}</span>
                        </div>
                        <div className="p-3 space-y-3 flex-1 bg-slate-50/50 min-h-[260px]">
                          {colOrders.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-400">
                              No {col.stage.toLowerCase()} orders
                            </div>
                          ) : (
                            colOrders.map((ord) => {
                              const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
                              const trip = state.trips.find((t) => t.id === ord.tripId);
                              const stopEta = trip?.stopEtas.find((s) => s.restaurantId === restaurant.id);
                              return (
                                <div key={ord.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-xs">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                                    <span className="font-mono font-bold text-emerald-700">#{ord.pickupCode}</span>
                                  </div>
                                  <div className="text-xs text-slate-700">
                                    <span className="font-semibold">{ord.passengerName}</span> · Seat {ord.seatNumber || '—'} ·{' '}
                                    <span className="font-medium">{ord.orderType}</span>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 flex justify-between text-[11px] font-mono">
                                    <span>{veh?.regNumber}</span>
                                    <span className="text-emerald-700 font-semibold">
                                      {stopEta?.passed ? 'At Stop' : `ETA ${stopEta?.etaMinutes ?? ord.etaMinutesAtOrder}m`}
                                    </span>
                                  </div>
                                  <ul className="text-xs text-slate-800 space-y-0.5">
                                    {ord.items.map((it) => (
                                      <li key={it.menuItemId}>
                                        {it.qty}× {it.name}
                                      </li>
                                    ))}
                                  </ul>
                                  {(ord.specialInstructions || ord.dietaryNotes) && (
                                    <div className="text-[11px] text-emerald-900 bg-emerald-50 rounded-lg px-2 py-1">
                                      {ord.specialInstructions || ord.dietaryNotes}
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 pt-1">
                                    {ord.status === 'NEW' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => advanceOrder(ord.id, 'ACCEPTED')}
                                          className="flex-1 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => advanceOrder(ord.id, 'REJECTED', 'Kitchen busy')}
                                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    {ord.status === 'ACCEPTED' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'PREPARING')}
                                        className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                                      >
                                        Start Preparing
                                      </button>
                                    )}
                                    {ord.status === 'PREPARING' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'READY')}
                                        className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                                      >
                                        Mark Ready
                                      </button>
                                    )}
                                    {ord.status === 'READY' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'COMPLETED')}
                                        className="w-full py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                                      >
                                        Confirm Handover
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Completed & Rejected History */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                    Completed & Closed Orders ({desktopHistoryOrders.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">Order ID</th>
                          <th className="py-2.5 px-4 font-medium">Passenger & Bus</th>
                          <th className="py-2.5 px-4 font-medium">Items</th>
                          <th className="py-2.5 px-4 font-medium text-right">Net Payable</th>
                          <th className="py-2.5 px-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {desktopHistoryOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No completed or closed orders yet.
                            </td>
                          </tr>
                        ) : (
                          desktopHistoryOrders.map((ord) => {
                            const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
                            return (
                              <tr key={ord.id}>
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{ord.id}</td>
                                <td className="py-2.5 px-4">
                                  {ord.passengerName} · <span className="font-mono text-slate-500">{veh?.regNumber}</span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-600">
                                  {ord.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-semibold">
                                  ₹{ord.restaurantPayable.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-emerald-800">{ord.status}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {desktopSection === 'buses' && (
              <div className="space-y-5">
                {incomingBuses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    No active buses approaching {restaurant.name}.
                  </div>
                ) : (
                  incomingBuses.map(({ trip, stopEta, vehicle, route, queuedOrders }) => (
                    <div key={trip.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-mono font-bold text-slate-900">{vehicle?.regNumber}</div>
                          <div className="text-xs text-slate-500">{route?.name}</div>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div>
                            <div className="text-slate-400">Distance</div>
                            <div className="font-mono font-bold text-slate-900">{stopEta.distanceRemainingKm} km</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Live ETA</div>
                            <div className="font-mono font-bold text-emerald-700">
                              {stopEta.passed ? 'Passed Stop' : `${stopEta.etaMinutes} mins`}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Queued Orders</div>
                            <div className="font-mono font-bold text-slate-900">{queuedOrders.length}</div>
                          </div>
                        </div>
                      </div>
                      {route && (
                        <RouteMapVisualizer
                          route={route}
                          trip={trip}
                          restaurants={state.restaurants}
                          highlightedRestaurantId={restaurant.id}
                          compact
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {desktopSection === 'menu' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Active Dishes ({restaurantMenu.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDish((v) => !v)}
                    className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Dish
                  </button>
                </div>

                {showAddDish && (
                  <form
                    onSubmit={handleCreateDish}
                    className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                  >
                    <input
                      type="text"
                      required
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      placeholder="Dish name"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs md:col-span-2"
                    />
                    <select
                      value={dishCat}
                      onChange={(e) => setDishCat(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                    >
                      <option>South Indian Classics</option>
                      <option>Rice & Biryani</option>
                      <option>Executive Meals</option>
                      <option>Beverages & Quick Bites</option>
                    </select>
                    <input
                      type="number"
                      min={20}
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      placeholder="Price ₹"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <input type="checkbox" checked={dishVeg} onChange={(e) => setDishVeg(e.target.checked)} />
                        Veg
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {restaurantMenu.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getRestaurantImageUrl(item.image)}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                          onError={(event) => {
                            console.error('Restaurant menu image failed:', event.currentTarget.src);
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.category}</div>
                          <div className="text-xs font-mono font-semibold text-slate-800 mt-0.5">
                            ₹{item.price} · {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => patch(`/api/menu-items/${item.id}`, { available: !item.available })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                          item.available
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.available ? 'In Stock' : 'Sold Out'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {desktopSection === 'payouts' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">Gross Food Sales ({financialSummary.count} orders)</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      ₹{financialSummary.gross.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">Platform Commission ({restaurant.commissionPct}%)</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1">
                      ₹{financialSummary.commission.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">Pending Settlement Payable</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      ₹{financialSummary.pendingSettlement.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400">FSSAI License</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.fssaiNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">GSTIN</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.gstNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Settlement Bank Account</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.bankAccount}</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                    Disbursed Settlement Ledger
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">Settlement ID</th>
                          <th className="py-2.5 px-4 font-medium">UTR Reference</th>
                          <th className="py-2.5 px-4 font-medium">Orders</th>
                          <th className="py-2.5 px-4 font-medium text-right">Net Disbursed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {restaurantSettlements.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              No disbursed settlements yet.
                            </td>
                          </tr>
                        ) : (
                          restaurantSettlements.map((stl) => (
                            <tr key={stl.id}>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{stl.id}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{stl.utrRef}</td>
                              <td className="py-2.5 px-4 font-mono">{stl.orderIds.length}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                ₹{stl.netPayable.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </DesktopBrowserFrame>
    );
  }

  return (
    <MobilePhoneFrame
      appName={restaurant.name}
      subtitle={`${restaurant.city} · BusBite Partner`}
      brandIcon={<Store className="w-5 h-5 text-emerald-900" />}
      unreadNotifications={restaurantAlerts.length}
      onBellClick={() => setShowNotifications(true)}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      topBarSlot={modeSwitcher}
      overlay={notificationsSheet}
      tabs={[
        { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
        {
          id: 'orders',
          label: 'Orders',
          icon: <ClipboardList className="w-4 h-4" />,
          badgeCount: activeOrderCount || undefined,
        },
        {
          id: 'buses',
          label: 'Buses',
          icon: <Bus className="w-4 h-4" />,
          badgeCount: incomingBuses.length || undefined,
        },
        { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> },
        { id: 'payouts', label: 'Payouts', icon: <IndianRupee className="w-4 h-4" /> },
      ]}
    >
      {/* Partner Switcher + Accept Toggle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <select
            value={restaurant.id}
            onChange={(e) => setSelectedRestId(e.target.value)}
            aria-label="Switch Restaurant Partner"
            className="flex-1 min-w-0 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            {approvedRestaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.city})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              patch(`/api/restaurants/${restaurant.id}`, {
                acceptingOrders: !restaurant.acceptingOrders,
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ${
              restaurant.acceptingOrders
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {restaurant.acceptingOrders ? (
              <>
                <ToggleRight className="w-3.5 h-3.5" /> Open
              </>
            ) : (
              <>
                <ToggleLeft className="w-3.5 h-3.5" /> Paused
              </>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setOrderStageFilter('NEW');
                setActiveTab('orders');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">NEW PAID ORDERS</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-800 mt-1">
                {restaurantOrders.filter((o) => o.status === 'NEW').length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tap to accept</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderStageFilter('PREPARING');
                setActiveTab('orders');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">PREPARING / READY</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {restaurantOrders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active kitchen</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('buses')}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">INCOMING BUSES</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {incomingBuses.length}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Live GPS ETA</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payouts')}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">PENDING PAYABLE</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
                ₹{financialSummary.pendingSettlement.toFixed(0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{restaurant.commissionPct}% comm</div>
            </button>
          </div>

          {/* Express Pickup Code Verifier */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-900">Verify Passenger Pickup Code</div>
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickupVerifyCode}
                  onChange={(e) => setPickupVerifyCode(e.target.value)}
                  placeholder="Code e.g. 4821"
                  className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyPickup}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-800 text-white text-[11px] font-semibold shrink-0"
              >
                Verify
              </button>
            </div>
            {verifyFeedback && <div className="text-[11px] font-medium text-emerald-800">{verifyFeedback}</div>}
          </div>

          {/* Latest Alert Card */}
          {restaurantAlerts[0] && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs">
              <div className="font-bold text-emerald-950">{restaurantAlerts[0].title}</div>
              <div className="text-emerald-900 mt-0.5">{restaurantAlerts[0].message}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS PIPELINE */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {/* Stage Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] as const).map((st) => {
              const count = restaurantOrders.filter((o) => o.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStageFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    orderStageFilter === st
                      ? 'bg-emerald-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const list = restaurantOrders.filter((o) => o.status === orderStageFilter);
            if (list.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                  No orders in {orderStageFilter} stage.
                </div>
              );
            }
            return list.map((ord) => {
              const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
              const trip = state.trips.find((t) => t.id === ord.tripId);
              const stopEta = trip?.stopEtas.find((s) => s.restaurantId === restaurant.id);

              return (
                <div key={ord.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                    <span className="font-mono font-bold text-emerald-700">Code {ord.pickupCode}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{ord.passengerName}</span> · Seat{' '}
                    {ord.seatNumber || '—'} · {ord.orderType}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between text-[11px] font-mono">
                    <span>{veh?.regNumber}</span>
                    <span className="text-emerald-700 font-semibold">
                      {stopEta?.passed ? 'At Stop' : `ETA ${stopEta?.etaMinutes ?? ord.etaMinutesAtOrder}m`}
                    </span>
                  </div>
                  <ul className="text-xs text-slate-800 space-y-0.5">
                    {ord.items.map((it) => (
                      <li key={it.menuItemId}>
                        {it.qty}× {it.name}
                      </li>
                    ))}
                  </ul>
                  {(ord.specialInstructions || ord.dietaryNotes) && (
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 rounded-lg px-2.5 py-1">
                      Note: {ord.specialInstructions || ord.dietaryNotes}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {ord.status === 'NEW' && (
                      <>
                        <button
                          type="button"
                          onClick={() => advanceOrder(ord.id, 'ACCEPTED')}
                          className="flex-1 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => advanceOrder(ord.id, 'REJECTED', 'Kitchen busy')}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {ord.status === 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'PREPARING')}
                        className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Start Preparing
                      </button>
                    )}
                    {ord.status === 'PREPARING' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'READY')}
                        className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Mark Food Ready
                      </button>
                    )}
                    {ord.status === 'READY' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'COMPLETED')}
                        className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        Confirm Handover
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* TAB 3: INCOMING BUSES & LIVE MAP */}
      {activeTab === 'buses' && (
        <div className="space-y-3">
          {incomingBuses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No active buses approaching {restaurant.name}.
            </div>
          ) : (
            incomingBuses.map(({ trip, stopEta, vehicle, route, queuedOrders }) => (
              <div key={trip.id} className="space-y-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-mono font-bold text-slate-900">{vehicle?.regNumber}</div>
                      <div className="text-[11px] text-slate-500">{route?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-emerald-700">
                        {stopEta.passed ? 'Passed' : `${stopEta.etaMinutes} mins`}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {stopEta.distanceRemainingKm} km · {queuedOrders.length} orders
                      </div>
                    </div>
                  </div>
                </div>
                {route && (
                  <RouteMapVisualizer
                    route={route}
                    trip={trip}
                    restaurants={state.restaurants}
                    highlightedRestaurantId={restaurant.id}
                    mobileLayout
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: MENU & AVAILABILITY */}
      {activeTab === 'menu' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Menu Stock ({restaurantMenu.length})</h2>
            <button
              type="button"
              onClick={() => setShowAddDish((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Dish
            </button>
          </div>

          {showAddDish && (
            <form
              onSubmit={handleCreateDish}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5"
            >
              <input
                type="text"
                required
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Dish name"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dishCat}
                  onChange={(e) => setDishCat(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white"
                >
                  <option>South Indian Classics</option>
                  <option>Rice & Biryani</option>
                  <option>Executive Meals</option>
                  <option>Beverages & Quick Bites</option>
                </select>
                <input
                  type="number"
                  min={20}
                  value={dishPrice}
                  onChange={(e) => setDishPrice(e.target.value)}
                  placeholder="Price ₹"
                  className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={dishVeg} onChange={(e) => setDishVeg(e.target.checked)} />
                  Vegetarian
                </label>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                >
                  Save Dish
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {restaurantMenu.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={getRestaurantImageUrl(item.image)}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                    onError={(event) => {
                      console.error('Restaurant menu image failed:', event.currentTarget.src);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      ₹{item.price} · {item.isVeg ? 'Veg' : 'Non-Veg'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => patch(`/api/menu-items/${item.id}`, { available: !item.available })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 ${
                    item.available
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {item.available ? 'In Stock' : 'Sold Out'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SALES, COMMISSION & SETTLEMENTS */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
              <div className="text-[10px] text-slate-500">Gross Sales</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                ₹{financialSummary.gross.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
              <div className="text-[10px] text-slate-500">Pending Payout</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                ₹{financialSummary.pendingSettlement.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="font-bold text-slate-900">Partner Compliance & Bank</div>
            <div className="text-slate-600">FSSAI: {restaurant.fssaiNumber}</div>
            <div className="text-slate-600">GST: {restaurant.gstNumber}</div>
            <div className="text-slate-600 font-mono">{restaurant.bankAccount}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="text-xs font-bold text-slate-900">Settlement History</div>
            {restaurantSettlements.length === 0 ? (
              <p className="text-xs text-slate-500">No disbursed settlements yet.</p>
            ) : (
              restaurantSettlements.map((stl) => (
                <div key={stl.id} className="border border-slate-100 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex justify-between font-mono font-bold">
                    <span>{stl.id}</span>
                    <span className="text-emerald-700">₹{stl.netPayable.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">UTR: {stl.utrRef}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </MobilePhoneFrame>
  );
}
