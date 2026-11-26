import { useEffect, useMemo, useState } from 'react';
import {
  Bus,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  Home,
  MapPin,
  MapPinned,
  Navigation,
  Play,
  Route,
  Square,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import type { PlatformState } from '../types/platform';

interface DriverPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

export function DriverPortal({ state, post, patch, tourSignal }: DriverPortalProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>(state.trips[0]?.id || 'trip-1');
  const [activeTab, setActiveTab] = useState<'home' | 'trips' | 'gps' | 'orders' | 'profile'>('home');
  const [crewMode, setCrewMode] = useState<'DRIVER' | 'CONDUCTOR'>('DRIVER');

  useEffect(() => {
    if (!tourSignal?.driverTab) return;
    setActiveTab(tourSignal.driverTab);
    if (tourSignal.driverTab === 'gps' || tourSignal.driverTab === 'trips') setCrewMode('DRIVER');
    if (tourSignal.driverTab === 'orders') setCrewMode('CONDUCTOR');
  }, [tourSignal?.nonce]);
  const [speedKmh, setSpeedKmh] = useState<number>(68);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [queuedUpdates, setQueuedUpdates] = useState<{ progressPct: number; speedKmh: number; ts: string }[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const trip = useMemo(
    () => state.trips.find((t) => t.id === selectedTripId) || state.trips[0],
    [state.trips, selectedTripId]
  );

  const vehicle = useMemo(
    () => state.vehicles.find((v) => v.id === trip?.vehicleId),
    [state.vehicles, trip]
  );

  const route = useMemo(
    () => state.routes.find((r) => r.id === trip?.routeId),
    [state.routes, trip]
  );

  const driver = useMemo(
    () => state.staff.find((s) => s.id === trip?.driverId),
    [state.staff, trip]
  );

  const conductor = useMemo(
    () => state.staff.find((s) => s.id === trip?.conductorId),
    [state.staff, trip]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === vehicle?.companyId),
    [state.companies, vehicle]
  );

  const tripOrders = useMemo(
    () =>
      state.orders.filter(
        (o) =>
          o.tripId === trip?.id &&
          o.paymentStatus === 'VERIFIED' &&
          o.status !== 'REJECTED' &&
          o.status !== 'CANCELLED'
      ),
    [state.orders, trip]
  );

  const nextRestaurantStop = useMemo(() => {
    if (!trip) return null;
    return trip.stopEtas.find((s) => s.restaurantId && !s.passed) || null;
  }, [trip]);

  const nextRestaurant = useMemo(
    () =>
      nextRestaurantStop?.restaurantId
        ? state.restaurants.find((r) => r.id === nextRestaurantStop.restaurantId)
        : null,
    [nextRestaurantStop, state.restaurants]
  );

  const driverAlerts = useMemo(() => {
    const items = state.notifications.filter((n) => n.targetRole === 'DRIVER').slice(0, 5);
    return items;
  }, [state.notifications]);

  if (!trip || !vehicle || !route) return null;

  const pushGpsUpdate = async (nextPct: number) => {
    const clamped = Math.max(0, Math.min(100, nextPct));
    if (trip.status !== 'IN_PROGRESS') return;

    if (offlineMode) {
      setQueuedUpdates((prev) => [
        ...prev,
        { progressPct: clamped, speedKmh, ts: new Date().toLocaleTimeString() },
      ]);
      setStatusMessage(`Offline buffer: queued GPS point (${clamped}%).`);
      return;
    }

    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/gps`, { progressPct: clamped, speedKmh });
      setStatusMessage(`GPS synced (${clamped}% route progress).`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOffline = async () => {
    if (offlineMode) {
      setOfflineMode(false);
      if (queuedUpdates.length > 0 && trip.status === 'IN_PROGRESS') {
        const latest = queuedUpdates[queuedUpdates.length - 1];
        setBusy(true);
        try {
          await post(`/api/trips/${trip.id}/gps`, {
            progressPct: latest.progressPct,
            speedKmh: latest.speedKmh,
          });
          setStatusMessage(`Network restored: flushed ${queuedUpdates.length} queued GPS update(s).`);
          setQueuedUpdates([]);
        } finally {
          setBusy(false);
        }
      }
    } else {
      setOfflineMode(true);
      setStatusMessage('Offline mode active: GPS packets buffer locally.');
    }
  };

  const handleStartTrip = async () => {
    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/start`);
      setStatusMessage('Trip started. Live GPS broadcasting active.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndTrip = async () => {
    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/end`);
      setQueuedUpdates([]);
      setStatusMessage('Trip completed. GPS broadcasting stopped.');
    } finally {
      setBusy(false);
    }
  };

  const pendingOrdersCount = tripOrders.filter((o) => o.status !== 'COMPLETED').length;

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[28px] p-4 max-h-[75%] overflow-y-auto space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Trip & Stop Notifications</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
          <div className="font-semibold text-emerald-950">
            Assigned Trip · {vehicle.regNumber}
          </div>
          <div className="text-slate-600 mt-0.5">
            {route.name} · {pendingOrdersCount} active passenger pre-order(s).
          </div>
        </div>
        {nextRestaurant && nextRestaurantStop && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-900">
              Next Stop: {nextRestaurant.name}
            </div>
            <div className="text-slate-600 mt-0.5">
              {nextRestaurantStop.distanceRemainingKm} km ahead · ETA {nextRestaurantStop.etaMinutes} mins
            </div>
          </div>
        )}
        {driverAlerts.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-900">{n.title}</div>
            <div className="text-slate-600 mt-0.5">{n.message}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <MobilePhoneFrame
      appName="BusBite"
      subtitle={`${crewMode === 'DRIVER' ? 'Driver' : 'Conductor'} · ${vehicle.regNumber}`}
      brandIcon={
        <img
          src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
          alt="BusBite"
          className="w-full h-full object-contain"
        />
      }
      unreadNotifications={pendingOrdersCount || 1}
      onBellClick={() => setShowNotifications(true)}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'orders') setCrewMode('CONDUCTOR');
        if (tab === 'gps' || tab === 'trips') setCrewMode('DRIVER');
      }}
      overlay={notificationsSheet}
      tabs={[
        { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
        { id: 'trips', label: 'Trips', icon: <Route className="w-4 h-4" /> },
        { id: 'gps', label: 'Live GPS', icon: <MapPinned className="w-4 h-4" /> },
        {
          id: 'orders',
          label: 'Orders',
          icon: <ClipboardList className="w-4 h-4" />,
          badgeCount: pendingOrdersCount || undefined,
        },
        { id: 'profile', label: 'Profile', icon: <UserRound className="w-4 h-4" /> },
      ]}
    >
      {/* Greeting & Trip State Header */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500">On Duty</p>
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
            {crewMode === 'DRIVER' ? driver?.name : conductor?.name}
          </h1>
        </div>
        <span
          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide shrink-0 ${
            trip.status === 'IN_PROGRESS'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {trip.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Assigned Trip Switcher + Start/End Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-[0_6px_18px_rgba(6,78,59,0.05)]">
        <div>
          <div className="text-[10px] font-bold text-slate-400">{company?.name}</div>
          <select
            value={trip.id}
            onChange={(e) => {
              setSelectedTripId(e.target.value);
              setQueuedUpdates([]);
              setStatusMessage(null);
            }}
            aria-label="Select Assigned Trip"
            className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 mt-1"
          >
            {state.trips.map((t) => {
              const v = state.vehicles.find((veh) => veh.id === t.vehicleId);
              const r = state.routes.find((rt) => rt.id === t.routeId);
              return (
                <option key={t.id} value={t.id}>
                  {v?.regNumber} — {r?.name} ({t.status})
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setCrewMode('DRIVER')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors truncate px-1 ${
              crewMode === 'DRIVER' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500'
            }`}
          >
            Driver ({driver?.name.split(' ')[0]})
          </button>
          <button
            type="button"
            onClick={() => setCrewMode('CONDUCTOR')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors truncate px-1 ${
              crewMode === 'CONDUCTOR' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500'
            }`}
          >
            Conductor ({conductor?.name.split(' ')[0]})
          </button>
        </div>

        {trip.status === 'ASSIGNED' || trip.status === 'READY_TO_START' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleStartTrip}
            className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 inline-flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" /> Start Trip & Enable GPS
          </button>
        ) : trip.status === 'IN_PROGRESS' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleEndTrip}
            className="w-full min-h-[44px] px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 inline-flex items-center justify-center gap-2"
          >
            <Square className="w-3.5 h-3.5" /> End Trip & Stop GPS
          </button>
        ) : (
          <div className="text-center py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
            Trip Completed
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="bg-emerald-950 text-white rounded-xl px-3 py-2 text-[11px] flex items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-emerald-300 shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">NEXT RESTAURANT</div>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                {nextRestaurant ? nextRestaurant.name : 'End of Route'}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium truncate">
                {nextRestaurantStop ? nextRestaurantStop.stopName : route.destination}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">DISTANCE & ETA</div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {nextRestaurantStop ? `${nextRestaurantStop.distanceRemainingKm} km` : '0 km'}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-emerald-700 font-semibold">
                {nextRestaurantStop ? `ETA ${nextRestaurantStop.etaMinutes} mins` : 'Arrived'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">PRE-ORDERS</div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {pendingOrdersCount} Active
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {tripOrders.filter((o) => o.status === 'READY').length} Ready
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">VEHICLE</div>
              <div className="text-xs font-bold font-mono text-slate-900 mt-1">{vehicle.regNumber}</div>
              <div className="text-[11px] text-slate-500">
                {vehicle.type} · {vehicle.seatingCapacity}s
              </div>
            </div>
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={nextRestaurant?.id}
            mobileLayout
          />
        </div>
      )}

      {/* TAB 2: TRIPS & PARTNER STOPS */}
      {activeTab === 'trips' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-slate-900">
            Assigned Route Stops & Order Counts
          </div>
          <div className="divide-y divide-slate-100">
            {trip.stopEtas.map((stopEta) => {
              const rest = stopEta.restaurantId
                ? state.restaurants.find((r) => r.id === stopEta.restaurantId)
                : null;
              const stopOrders = stopEta.restaurantId
                ? tripOrders.filter((o) => o.restaurantId === stopEta.restaurantId)
                : [];
              const dineInCount = stopOrders.filter((o) => o.orderType === 'DINE_IN').length;
              const takeawayCount = stopOrders.filter((o) => o.orderType === 'TAKEAWAY').length;

              return (
                <div key={stopEta.stopId} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        stopEta.passed
                          ? 'text-slate-300'
                          : rest
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {rest ? rest.name : stopEta.stopName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {stopEta.kmFromOrigin} km
                        {rest ? ` · ${stopOrders.length} orders (${dineInCount}D / ${takeawayCount}T)` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono tabular-nums shrink-0">
                    {stopEta.passed ? (
                      <span className="text-slate-400">Passed</span>
                    ) : stopEta.kmFromOrigin === 0 ? (
                      <span className="text-slate-500">Origin</span>
                    ) : (
                      <>
                        <div className="font-bold text-emerald-700">{stopEta.etaMinutes}m</div>
                        <div className="text-slate-500">{stopEta.distanceRemainingKm} km</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE GPS BROADCAST CONTROLS */}
      {activeTab === 'gps' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900">GPS Telemetry Broadcast</h2>
                <p className="text-[11px] text-slate-500">Updates restaurant & passenger ETAs</p>
              </div>
              <button
                type="button"
                onClick={handleToggleOffline}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border ${
                  offlineMode
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {offlineMode ? `Offline (${queuedUpdates.length})` : 'Online'}
              </button>
            </div>

            {trip.status !== 'IN_PROGRESS' ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                {trip.status === 'COMPLETED'
                  ? 'Completed trips cannot broadcast GPS.'
                  : 'Start the trip above to unlock live GPS controls.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">Corridor Progress</span>
                    <span className="font-mono font-bold tabular-nums text-slate-900">
                      {trip.progressPct}% ({trip.currentKm}/{route.totalKm} km)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trip.progressPct}
                    onChange={(e) => pushGpsUpdate(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Speed (km/h)
                    </label>
                    <input
                      type="number"
                      min={25}
                      max={105}
                      value={speedKmh}
                      onChange={(e) => setSpeedKmh(Number(e.target.value) || 65)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => pushGpsUpdate(Math.min(100, trip.progressPct + 6))}
                      className="w-full h-[34px] rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> Drive +25 km
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400 block text-[9px]">LAT</span>
                    <span>{trip.currentLat.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">LNG</span>
                    <span>{trip.currentLng.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">HDG</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Compass className="w-3 h-3" /> {trip.headingDeg}°
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={nextRestaurant?.id}
            mobileLayout
          />
        </div>
      )}

      {/* TAB 4: CONDUCTOR PASSENGER ORDER ASSIST */}
      {activeTab === 'orders' && (
        <div className="space-y-2.5">
          <div className="px-0.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Passenger Orders ({tripOrders.length})
            </h2>
            <span className="text-[11px] text-slate-500">Conductor Assist</span>
          </div>

          {tripOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No passenger pre-orders on this trip yet.
            </div>
          ) : (
            tripOrders.map((ord) => {
              const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
              return (
                <div key={ord.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {ord.id} · <span className="text-emerald-700">Code {ord.pickupCode}</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">
                        {ord.passengerName} · Seat {ord.seatNumber || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rest?.name} ({ord.orderType})
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        ord.status === 'READY'
                          ? 'text-emerald-700'
                          : ord.status === 'COMPLETED'
                            ? 'text-slate-400'
                            : 'text-amber-700'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  {ord.status === 'READY' ? (
                    <button
                      type="button"
                      onClick={() =>
                        patch(`/api/orders/${ord.id}/status`, {
                          status: 'COMPLETED',
                          actorRole: 'CONDUCTOR',
                        })
                      }
                      className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Collection
                    </button>
                  ) : ord.status === 'COMPLETED' ? (
                    <div className="text-center text-[11px] text-slate-400">Collected</div>
                  ) : (
                    <div className="text-center text-[11px] text-slate-400 inline-flex items-center justify-center gap-1 w-full">
                      <Clock className="w-3 h-3" /> Preparing in kitchen
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 5: PROFILE & VEHICLE DETAILS */}
      {activeTab === 'profile' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shrink-0">
              <UserRound className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {crewMode === 'DRIVER' ? driver?.name : conductor?.name}
              </h2>
              <p className="text-xs text-slate-500">
                {crewMode === 'DRIVER' ? 'Driver' : 'Conductor'} · {company?.name}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Lic: {crewMode === 'DRIVER' ? driver?.licenseNo : conductor?.licenseNo}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
            <h3 className="font-bold text-slate-900">Assigned Vehicle & Route</h3>
            <div className="flex justify-between">
              <span className="text-slate-500">Vehicle Reg</span>
              <span className="font-mono font-semibold">{vehicle.regNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Coach Type</span>
              <span className="font-semibold">{vehicle.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Seating</span>
              <span className="font-mono font-semibold">{vehicle.seatingCapacity} seats</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 shrink-0">Route</span>
              <span className="font-semibold text-right truncate">{route.name}</span>
            </div>
          </div>
        </div>
      )}
    </MobilePhoneFrame>
  );
}
