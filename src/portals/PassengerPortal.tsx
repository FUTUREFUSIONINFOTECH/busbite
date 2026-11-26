import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Armchair,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  MapPin,
  Minus,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Route,
  ShoppingBag,
  Smartphone,
  Ticket,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import type { BusTicketBooking, Order, OrderType, PlatformState, Restaurant } from '../types/platform';

interface PassengerPortalProps {
  state: PlatformState;
  activeQrToken: string;
  onSelectQrToken: (token: string) => void;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

type PassengerStep = 'tickets' | 'landing' | 'menu' | 'checkout' | 'tracking';

/**
 * Resolve image paths returned by the API against the Vite base path.
 * Supports absolute URLs, data/blob URLs, and backend paths such as
 * /assets/images/example.jpg. This is required for GitHub Pages /busbite/.
 */
function resolveImageUrl(imagePath?: string | null): string {
  if (!imagePath) return '';

  const value = imagePath.trim();
  if (!value) return '';

  if (/^(https?:)?\/\//i.test(value) || /^(data:|blob:)/i.test(value)) {
    return value;
  }

  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = value.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`;
}

const ORDER_STEPS: { key: Order['status']; label: string }[] = [
  { key: 'NEW', label: 'Paid' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Cooking' },
  { key: 'READY', label: 'Ready' },
  { key: 'COMPLETED', label: 'Picked' },
];

function getSeatDecks(vehicleType: string): { lower: string[]; upper: string[]; isSleeper: boolean } {
  if (vehicleType === 'AC Sleeper') {
    return {
      isSleeper: true,
      lower: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'],
      upper: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12'],
    };
  }
  return {
    isSleeper: false,
    lower: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    upper: ['S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24'],
  };
}

export function PassengerPortal({
  state,
  activeQrToken,
  onSelectQrToken,
  post,
  patch,
  tourSignal,
}: PassengerPortalProps) {
  const [displayMode, setDisplayMode] = useState<'app' | 'browser'>('app');
  const [step, setStep] = useState<PassengerStep>('landing');

  useEffect(() => {
    if (!tourSignal) return;
    if (tourSignal.passengerTab) setStep(tourSignal.passengerTab);
    if (tourSignal.passengerDisplay === 'toggle') {
      setDisplayMode((prev) => (prev === 'app' ? 'browser' : 'app'));
    } else if (tourSignal.passengerDisplay) {
      setDisplayMode(tourSignal.passengerDisplay);
    }
  }, [tourSignal?.nonce]);
  const [historyStack, setHistoryStack] = useState<PassengerStep[]>(['landing']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Food Pre-Order State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Order Preferences
  const [orderType, setOrderType] = useState<OrderType>('TAKEAWAY');
  const [dineInGuests, setDineInGuests] = useState<number>(2);
  const [passengerName, setPassengerName] = useState<string>('Karthik Subramanian');
  const [passengerPhone, setPassengerPhone] = useState<string>('+91 98401 77412');
  const [seatNumber, setSeatNumber] = useState<string>('U6');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [dietaryNotes, setDietaryNotes] = useState<string>('');

  // Food Checkout & Tracking State
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idem-${Date.now()}`);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);

  // Bus Ticket Booking State
  const [ticketSubTab, setTicketSubTab] = useState<'search' | 'my-tickets'>('search');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [bookingTripId, setBookingTripId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [activeDeck, setActiveDeck] = useState<'lower' | 'upper'>('lower');
  const [boardingPoint, setBoardingPoint] = useState<string>('');
  const [droppingPoint, setDroppingPoint] = useState<string>('');
  const [passengerAge, setPassengerAge] = useState<string>('27');
  const [passengerGender, setPassengerGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = useState<boolean>(false);
  const [latestTicketId, setLatestTicketId] = useState<string | null>(null);

  const navigateStep = (nextStep: PassengerStep) => {
    setStep(nextStep);
    if (historyStack[historyIndex] !== nextStep) {
      const sliced = historyStack.slice(0, historyIndex + 1);
      const updated = [...sliced, nextStep];
      setHistoryStack(updated);
      setHistoryIndex(updated.length - 1);
    }
  };

  const handleBrowserBack = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setStep(historyStack[idx]);
    }
  };

  const handleBrowserForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setStep(historyStack[idx]);
    }
  };

  const activeQr = useMemo(
    () => state.qrCodes.find((q) => q.token === activeQrToken) || state.qrCodes[0],
    [state.qrCodes, activeQrToken]
  );

  const partnership = useMemo(
    () => state.partnerships.find((p) => p.id === activeQr?.partnershipId),
    [state.partnerships, activeQr]
  );

  const vehicle = useMemo(
    () => state.vehicles.find((v) => v.id === activeQr?.vehicleId),
    [state.vehicles, activeQr]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === partnership?.companyId),
    [state.companies, partnership]
  );

  const route = useMemo(
    () => state.routes.find((r) => r.id === activeQr?.routeId),
    [state.routes, activeQr]
  );

  const trip = useMemo(
    () => state.trips.find((t) => t.vehicleId === activeQr?.vehicleId && t.routeId === activeQr?.routeId),
    [state.trips, activeQr]
  );

  const partnerRestaurants = useMemo(() => {
    if (!partnership || partnership.status !== 'APPROVED' || company?.status !== 'APPROVED') return [];
    return partnership.restaurantIds
      .map((id) => state.restaurants.find((r) => r.id === id))
      .filter((r): r is Restaurant => Boolean(r && r.status === 'APPROVED'));
  }, [partnership, company, state.restaurants]);

  useEffect(() => {
    if (!selectedRestaurantId && partnerRestaurants.length > 0) {
      const firstAccepting = partnerRestaurants.find((r) => r.acceptingOrders) || partnerRestaurants[0];
      setSelectedRestaurantId(firstAccepting.id);
    }
  }, [partnerRestaurants, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () => state.restaurants.find((r) => r.id === selectedRestaurantId),
    [state.restaurants, selectedRestaurantId]
  );

  const nextAvailableStop = useMemo(() => {
    for (const rest of partnerRestaurants) {
      const eta = trip?.stopEtas.find((s) => s.restaurantId === rest.id);
      if (rest.acceptingOrders && (!eta || !eta.passed)) {
        return { restaurant: rest, eta };
      }
    }
    return null;
  }, [partnerRestaurants, trip]);

  const restaurantMenu = useMemo(
    () => state.menuItems.filter((m) => m.restaurantId === selectedRestaurantId),
    [state.menuItems, selectedRestaurantId]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(restaurantMenu.map((m) => m.category)));
    return ['All', ...cats];
  }, [restaurantMenu]);

  const filteredMenu = useMemo(() => {
    return restaurantMenu.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (vegOnly && !item.isVeg) return false;
      return true;
    });
  }, [restaurantMenu, selectedCategory, vegOnly]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, qty]) => {
        const item = state.menuItems.find((m) => m.id === menuItemId);
        return item ? { item, qty } : null;
      })
      .filter((entry): entry is { item: (typeof state.menuItems)[number]; qty: number } => Boolean(entry));
  }, [cart, state.menuItems]);

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, entry) => sum + entry.qty, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, { item, qty }) => sum + item.price * qty, 0),
    [cartItems]
  );
  const gstAmount = Number((subtotal * 0.05).toFixed(2));
  const serviceFee = subtotal > 0 ? 10 : 0;
  const totalPayable = Number((subtotal + gstAmount + serviceFee).toFixed(2));

  const busOrders = useMemo(
    () => state.orders.filter((o) => o.vehicleId === activeQr?.vehicleId),
    [state.orders, activeQr]
  );

  const activeTrackedOrder = useMemo(() => {
    if (trackedOrderId) {
      return state.orders.find((o) => o.id === trackedOrderId) || busOrders[0];
    }
    return busOrders[0];
  }, [trackedOrderId, state.orders, busOrders]);

  const passengerAlerts = useMemo(
    () => state.notifications.filter((n) => n.targetRole === 'PASSENGER').slice(0, 8),
    [state.notifications]
  );

  // Bus Ticket Computed Data
  const bookableTrips = useMemo(() => {
    return state.trips
      .map((t) => {
        const veh = state.vehicles.find((v) => v.id === t.vehicleId);
        const comp = state.companies.find((c) => c.id === veh?.companyId);
        const rt = state.routes.find((r) => r.id === t.routeId);
        const part = state.partnerships.find(
          (p) => p.vehicleId === veh?.id && p.routeId === rt?.id && p.status === 'APPROVED'
        );
        if (!veh || !comp || !rt || comp.status !== 'APPROVED' || veh.status !== 'ACTIVE') return null;
        if (routeFilter !== 'ALL' && rt.id !== routeFilter) return null;
        const decks = getSeatDecks(veh.type);
        const totalDeckSeats = decks.lower.length + decks.upper.length;
        const availableCount = Math.max(0, totalDeckSeats - t.bookedSeats.length);
        return { trip: t, vehicle: veh, company: comp, route: rt, partnership: part, availableCount };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [state.trips, state.vehicles, state.companies, state.routes, state.partnerships, routeFilter]);

  const selectedBookingTrip = useMemo(
    () => bookableTrips.find((b) => b.trip.id === bookingTripId) || null,
    [bookableTrips, bookingTripId]
  );

  useEffect(() => {
    if (selectedBookingTrip) {
      const stops = selectedBookingTrip.route.stops;
      setBoardingPoint(stops[0]?.name || selectedBookingTrip.route.origin);
      setDroppingPoint(stops[stops.length - 1]?.name || selectedBookingTrip.route.destination);
    }
  }, [selectedBookingTrip]);

  const activeTicketsCount = useMemo(
    () => state.tickets.filter((t) => t.status !== 'CANCELLED').length,
    [state.tickets]
  );

  const handleScanSwitch = async (token: string) => {
    onSelectQrToken(token);
    setCart({});
    setSelectedRestaurantId('');
    navigateStep('landing');
    try {
      await post('/api/qr/scan', { token });
    } catch {
      // Non-blocking scan telemetry
    }
  };

  const handleSelectRestaurant = (restId: string, openMenu = false) => {
    if (selectedRestaurantId !== restId) {
      setCart({});
      setSelectedCategory('All');
    }
    setSelectedRestaurantId(restId);
    if (openMenu) {
      navigateStep('menu');
    }
  };

  const updateCart = (
    menuItemId: string,
    delta: number,
    itemName?: string,
    itemRestaurantId?: string
  ) => {
    if (itemRestaurantId && selectedRestaurantId !== itemRestaurantId) {
      setSelectedRestaurantId(itemRestaurantId);
      setCart({ [menuItemId]: Math.max(1, delta) });
    } else {
      setCart((prev) => {
        const nextQty = Math.max(0, (prev[menuItemId] || 0) + delta);
        const copy = { ...prev };
        if (nextQty === 0) delete copy[menuItemId];
        else copy[menuItemId] = nextQty;
        return copy;
      });
    }
    if (delta > 0 && itemName) {
      setAddedToast(`Added ${itemName}`);
      window.setTimeout(() => setAddedToast(null), 2000);
    }
  };

  const handlePlaceOrder = async (simulateOutcome: 'SUCCESS' | 'FAIL') => {
    if (!activeQr || !selectedRestaurantId || cartItems.length === 0) return;
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          qrId: activeQr.id,
          restaurantId: selectedRestaurantId,
          items: cartItems.map(({ item, qty }) => ({ menuItemId: item.id, qty })),
          orderType,
          dineInGuests: orderType === 'DINE_IN' ? dineInGuests : undefined,
          passengerName,
          passengerPhone,
          seatNumber,
          specialInstructions,
          dietaryNotes,
          simulateOutcome,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; order?: Order; error?: string };
      if (json.order) {
        setTrackedOrderId(json.order.id);
        setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        if (json.ok) {
          setCart({});
        }
        navigateStep('tracking');
      } else {
        setCheckoutError(json.error || 'Could not process order');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Network error during checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPayment = async (orderId: string) => {
    setSubmitting(true);
    try {
      await post(`/api/orders/${orderId}/retry-payment`);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSeatSelection = (seat: string) => {
    setTicketError(null);
    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : prev.length >= 6
          ? prev
          : [...prev, seat]
    );
  };

  const handleBookBusTicket = async () => {
    if (!selectedBookingTrip || selectedSeats.length === 0) return;
    setTicketBusy(true);
    setTicketError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedBookingTrip.trip.id,
          seatNumbers: selectedSeats,
          boardingPoint,
          droppingPoint,
          passengerName,
          passengerPhone,
          passengerAge: Number(passengerAge) || 27,
          passengerGender,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; ticket?: BusTicketBooking; error?: string };
      if (!res.ok || !json.ticket) {
        setTicketError(json.error || 'Could not book bus ticket');
        return;
      }
      setLatestTicketId(json.ticket.id);
      setSeatNumber(json.ticket.seatNumbers.join(', '));
      setSelectedSeats([]);
      setBookingTripId(null);
      setTicketSubTab('my-tickets');
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Network error booking ticket');
    } finally {
      setTicketBusy(false);
    }
  };

  const handleOrderFoodFromTicket = (ticket: BusTicketBooking) => {
    const qr =
      state.qrCodes.find((q) => q.token === ticket.qrToken) ||
      state.qrCodes.find((q) => q.vehicleId === ticket.vehicleId && q.active);
    if (qr) {
      onSelectQrToken(qr.token);
    }
    setPassengerName(ticket.passengerName);
    setPassengerPhone(ticket.passengerPhone);
    setSeatNumber(ticket.seatNumbers[0] || '');
    setSelectedRestaurantId('');
    navigateStep('landing');
  };

  if (!activeQr || !route || !vehicle) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-sm text-slate-600">
        No active bus QR configuration found. Create a partnership in Super Admin first.
      </div>
    );
  }

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[24px] p-3.5 max-h-[75%] overflow-y-auto space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">Ticket, Bus & Food Alerts</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {passengerAlerts.length === 0 ? (
          <p className="py-5 text-center text-[11px] text-slate-500">
            No alerts yet. Book a ticket or order food to get live updates.
          </p>
        ) : (
          passengerAlerts.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px]">
              <div className="font-semibold text-slate-900">{n.title}</div>
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
        onClick={() => setDisplayMode('app')}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
          displayMode === 'app'
            ? 'bg-emerald-900 text-white'
            : 'text-slate-600 hover:text-emerald-900'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        Mobile App (320px)
      </button>
      <button
        type="button"
        onClick={() => setDisplayMode('browser')}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
          displayMode === 'browser'
            ? 'bg-emerald-900 text-white'
            : 'text-slate-600 hover:text-emerald-900'
        }`}
      >
        <Globe className="w-3.5 h-3.5" />
        Mobile Browser (Web)
      </button>
    </div>
  );

  return (
    <MobilePhoneFrame
      appName="BusBite"
      subtitle={`${vehicle.regNumber} · ${route.origin.split(' ')[0]} → ${route.destination.split(' ')[0]}`}
      brandIcon={
        <img
          src={`${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`}
          alt="BusBite"
          className="w-full h-full object-contain"
        />
      }
      unreadNotifications={passengerAlerts.length}
      onBellClick={() => setShowNotifications(true)}
      activeTab={step}
      onTabChange={navigateStep}
      topBarSlot={modeSwitcher}
      browserConfig={
        displayMode === 'browser'
          ? {
              url: `busbite.app/qr/${activeQr.token}${step === 'landing' ? '' : `/${step}`}`,
              onSwitchToApp: () => setDisplayMode('app'),
              onRefresh: () => post('/api/qr/scan', { token: activeQr.token }).catch(() => {}),
              canGoBack: historyIndex > 0,
              canGoForward: historyIndex < historyStack.length - 1,
              onBack: handleBrowserBack,
              onForward: handleBrowserForward,
            }
          : undefined
      }
      overlay={notificationsSheet}
      tabs={[
        {
          id: 'tickets',
          label: 'Tickets',
          icon: <Ticket className="w-3.5 h-3.5" />,
          badgeCount: activeTicketsCount || undefined,
        },
        { id: 'landing', label: 'Route', icon: <Route className="w-3.5 h-3.5" /> },
        { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
        {
          id: 'checkout',
          label: 'Cart',
          icon: <ShoppingBag className="w-3.5 h-3.5" />,
          badgeCount: totalItemCount || undefined,
        },
        {
          id: 'tracking',
          label: 'Orders',
          icon: <Clock className="w-3.5 h-3.5" />,
          badgeCount: busOrders.filter((o) => o.status !== 'COMPLETED').length || undefined,
        },
      ]}
    >
      {/* Add-to-cart toast inside 320px frame */}
      {addedToast && (
        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-900 text-white text-[11px] font-medium flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1 truncate min-w-0">
            <Check className="w-3 h-3 text-emerald-300 shrink-0" />
            <span className="truncate">{addedToast}</span>
          </span>
          <button
            type="button"
            onClick={() => navigateStep('checkout')}
            className="text-emerald-200 font-semibold shrink-0"
          >
            Cart ({totalItemCount}) →
          </button>
        </div>
      )}

      {/* TAB 1: BUS TICKET BOOKING & MY BOARDING PASSES */}
      {step === 'tickets' && (
        <div className="space-y-2.5">
          {/* Sub-tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setTicketSubTab('search')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                ticketSubTab === 'search' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              Book Bus Ticket
            </button>
            <button
              type="button"
              onClick={() => setTicketSubTab('my-tickets')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                ticketSubTab === 'my-tickets' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              My Tickets ({activeTicketsCount})
            </button>
          </div>

          {ticketSubTab === 'search' && !selectedBookingTrip && (
            <div className="space-y-2.5">
              {/* Route Filter Strip */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setRouteFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 border ${
                    routeFilter === 'ALL'
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  All Corridors
                </button>
                {state.routes.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setRouteFilter(rt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 border ${
                      routeFilter === rt.id
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {rt.origin.split(' ')[0]} → {rt.destination.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Scheduled Buses List */}
              {bookableTrips.map(({ trip: bt, vehicle: bv, company: bc, route: br, partnership: bp, availableCount }) => (
                <div
                  key={bt.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-emerald-700 truncate">{bc.name}</div>
                      <div className="text-xs font-extrabold text-slate-900 truncate">{br.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {bv.regNumber} · {bv.type}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold font-mono text-emerald-800">₹{bt.seatFare}</div>
                      <div className="text-[9px] text-slate-400">per seat</div>
                    </div>
                  </div>

                  <div className="bg-[#F4F8F6] rounded-xl px-2.5 py-2 flex items-center justify-between text-[10px]">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{bt.departureTime}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-mono font-bold text-slate-900">{bt.arrivalTime}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{availableCount} seats left</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">
                      {bp ? `${bp.restaurantIds.length} Food Stops Included` : 'Direct Coach'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingTripId(bt.id);
                        setSelectedSeats([]);
                        setTicketError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-[11px] font-semibold hover:bg-emerald-900 shrink-0"
                    >
                      Select Seats →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEAT MAP PICKER & TICKET CHECKOUT */}
          {ticketSubTab === 'search' && selectedBookingTrip && (() => {
            const { trip: bt, vehicle: bv, company: bc, route: br } = selectedBookingTrip;
            const decks = getSeatDecks(bv.type);
            const activeDeckSeats = activeDeck === 'lower' ? decks.lower : decks.upper;
            const seatSubtotal = bt.seatFare * selectedSeats.length;
            const seatGst = Number((seatSubtotal * 0.05).toFixed(2));
            const convFee = selectedSeats.length > 0 ? 25 : 0;
            const grandTotal = Number((seatSubtotal + seatGst + convFee).toFixed(2));

            return (
              <div className="space-y-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingTripId(null);
                        setSelectedSeats([]);
                      }}
                      className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{bc.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {bv.regNumber} · {bt.departureTime} → {bt.arrivalTime}
                      </div>
                    </div>
                  </div>

                  {/* Deck Switcher */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveDeck('lower')}
                      className={`py-1 rounded-md text-[10px] font-bold ${
                        activeDeck === 'lower' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {decks.isSleeper ? 'Lower Deck' : 'Rows 1–3'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDeck('upper')}
                      className={`py-1 rounded-md text-[10px] font-bold ${
                        activeDeck === 'upper' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {decks.isSleeper ? 'Upper Deck' : 'Rows 4–6'}
                    </button>
                  </div>

                  {/* Seat Legend */}
                  <div className="flex items-center justify-between text-[9px] text-slate-500 px-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded border border-emerald-600 bg-white" /> Free
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-700" /> Selected
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-300" /> Booked
                    </span>
                  </div>

                  {/* 4-column compact Seat Grid for 320px */}
                  <div className="bg-[#F4F8F6] rounded-xl p-2 grid grid-cols-4 gap-1.5">
                    {activeDeckSeats.map((seat) => {
                      const isBooked = bt.bookedSeats.includes(seat);
                      const isSelected = selectedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={isBooked}
                          onClick={() => toggleSeatSelection(seat)}
                          className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-colors ${
                            isBooked
                              ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                              : isSelected
                                ? 'bg-emerald-700 border-emerald-800 text-white'
                                : 'bg-white border-emerald-400 text-slate-800 hover:bg-emerald-50'
                          }`}
                        >
                          <Armchair className="w-3 h-3 mb-0.5" />
                          <span>{seat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Boarding & Passenger Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-900">Boarding & Passenger Details</div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Boarding Point</label>
                      <select
                        value={boardingPoint}
                        onChange={(e) => setBoardingPoint(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        {br.stops.slice(0, -1).map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Dropping Point</label>
                      <select
                        value={droppingPoint}
                        onChange={(e) => setDroppingPoint(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        {br.stops.slice(1).map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={passengerName}
                        onChange={(e) => setPassengerName(e.target.value)}
                        placeholder="Full Name"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <input
                        type="tel"
                        value={passengerPhone}
                        onChange={(e) => setPassengerPhone(e.target.value)}
                        placeholder="Mobile"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <input
                        type="number"
                        min={5}
                        max={99}
                        value={passengerAge}
                        onChange={(e) => setPassengerAge(e.target.value)}
                        placeholder="Age"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <select
                        value={passengerGender}
                        onChange={(e) =>
                          setPassengerGender(e.target.value as 'Male' | 'Female' | 'Other')
                        }
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ticket Fare Summary & Pay */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      Seats ({selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'})
                    </span>
                    <span className="font-mono">₹{seatSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5%) + Fee</span>
                    <span className="font-mono">₹{(seatGst + convFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100 text-xs">
                    <span>Total Ticket Fare</span>
                    <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
                  </div>

                  {ticketError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700">
                      {ticketError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={ticketBusy || selectedSeats.length === 0}
                    onClick={handleBookBusTicket}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {ticketBusy
                      ? 'Confirming Seat...'
                      : selectedSeats.length === 0
                        ? 'Select Seat(s) Above'
                        : `Pay ₹${grandTotal.toFixed(2)} & Book Ticket`}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* MY BOOKED TICKETS & BOARDING PASSES */}
          {ticketSubTab === 'my-tickets' && (
            <div className="space-y-2.5">
              {state.tickets.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No bus tickets booked yet.
                </div>
              ) : (
                state.tickets.map((tkt) => {
                  const veh = state.vehicles.find((v) => v.id === tkt.vehicleId);
                  const rt = state.routes.find((r) => r.id === tkt.routeId);
                  const comp = state.companies.find((c) => c.id === tkt.companyId);
                  const isHighlighted = latestTicketId === tkt.id;

                  return (
                    <div
                      key={tkt.id}
                      className={`bg-white border rounded-2xl p-3 space-y-2 ${
                        isHighlighted ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold text-emerald-700">
                            {tkt.pnr} · {comp?.name}
                          </div>
                          <div className="text-xs font-extrabold text-slate-900 truncate">{rt?.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {veh?.regNumber} · Seats: <span className="font-bold text-slate-900">{tkt.seatNumbers.join(', ')}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                            tkt.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700'
                              : tkt.status === 'BOARDED'
                                ? 'bg-emerald-900 text-white'
                                : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {tkt.status}
                        </span>
                      </div>

                      <div className="rounded-xl bg-[#F4F8F6] px-2.5 py-1.5 text-[10px] text-slate-600 space-y-0.5">
                        <div className="truncate">
                          <span className="font-semibold text-slate-800">From:</span> {tkt.boardingPoint}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800">To:</span> {tkt.droppingPoint}
                        </div>
                        <div className="flex justify-between pt-0.5 font-mono font-bold text-slate-900">
                          <span>{tkt.passengerName}</span>
                          <span>₹{tkt.totalFare.toFixed(2)}</span>
                        </div>
                      </div>

                      {tkt.status !== 'CANCELLED' && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOrderFoodFromTicket(tkt)}
                            className="flex-1 py-2 rounded-xl bg-emerald-800 text-white text-[11px] font-semibold hover:bg-emerald-900"
                          >
                            Pre-Order Food (Seat {tkt.seatNumbers[0]})
                          </button>
                          <button
                            type="button"
                            onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'CANCELLED' })}
                            className="px-2.5 py-2 rounded-xl border border-red-200 text-red-700 text-[10px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QR LANDING & PARTNER RESTAURANTS */}
      {step === 'landing' && (
        <div className="space-y-2.5">
          {/* Bus QR Selector Strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {state.qrCodes.map((qr) => {
              const v = state.vehicles.find((veh) => veh.id === qr.vehicleId);
              const isCurrent = qr.token === activeQr.token;
              return (
                <button
                  key={qr.id}
                  type="button"
                  disabled={!qr.active}
                  onClick={() => handleScanSwitch(qr.token)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                    isCurrent
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-slate-700 border-slate-200 disabled:opacity-40'
                  }`}
                >
                  {v?.regNumber}
                </button>
              );
            })}
          </div>

          {/* Compact Mobile Hero Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="h-24 relative bg-slate-100">
              <img
                src={resolveImageUrl('/assets/images/highway_plaza_hero_1795667339325.jpg')}
                alt="Highway dining plaza"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex flex-col justify-end p-2.5 text-white">
                <div className="text-[9px] font-mono text-emerald-300 truncate">
                  {company?.name} · {activeQr.token}
                </div>
                <h1 className="text-sm font-bold leading-tight truncate">{route.name}</h1>
              </div>
            </div>

            <div className="p-2.5 space-y-2">
              <div className="grid grid-cols-3 gap-1.5 text-center bg-[#F4F8F6] rounded-xl p-2">
                <div>
                  <div className="text-[9px] text-slate-500">Status</div>
                  <div className="text-[11px] font-bold text-emerald-800">
                    {trip?.status === 'IN_PROGRESS' ? 'Live' : trip?.status || 'Ready'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Speed</div>
                  <div className="text-[11px] font-bold font-mono tabular-nums text-slate-900">
                    {trip?.speedKmh ?? 0} km/h
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Kitchens</div>
                  <div className="text-[11px] font-bold font-mono tabular-nums text-slate-900">
                    {partnerRestaurants.length} Stops
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {nextAvailableStop && (
                  <button
                    type="button"
                    onClick={() => handleSelectRestaurant(nextAvailableStop.restaurant.id, true)}
                    className="col-span-2 min-h-[38px] px-3 rounded-xl bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate">
                      Pre-Order: {nextAvailableStop.restaurant.name}
                      {nextAvailableStop.eta ? ` (${nextAvailableStop.eta.etaMinutes}m)` : ''}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateStep('tickets')}
                  className="col-span-2 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 text-[11px] font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Bus className="w-3.5 h-3.5" /> Book Bus Ticket / View Boarding Pass
                </button>
              </div>
            </div>
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={(restId) => handleSelectRestaurant(restId, false)}
            mobileLayout
          />

          <div className="space-y-2">
            <div className="px-0.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900">Partner Restaurants</h2>
              <span className="text-[10px] text-slate-500">Tap to order</span>
            </div>

            {!activeQr.active || partnership?.status !== 'APPROVED' ? (
              <div className="bg-white border border-red-200 rounded-xl p-3 text-[11px] text-red-700 text-center">
                This bus QR partnership is currently paused.
              </div>
            ) : (
              partnerRestaurants.map((rest, idx) => {
                const stopEta = trip?.stopEtas.find((s) => s.restaurantId === rest.id);
                const isPassed = stopEta?.passed;
                const canOrder = rest.acceptingOrders && !isPassed;
                const isFocused = selectedRestaurantId === rest.id;

                return (
                  <div
                    key={rest.id}
                    onClick={() => handleSelectRestaurant(rest.id, false)}
                    className={`bg-white rounded-2xl border p-2.5 flex gap-2.5 transition-colors cursor-pointer ${
                      isFocused ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={resolveImageUrl(rest.heroImage)}
                      alt={rest.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500">
                          <span>Stop {idx + 1} · {rest.city}</span>
                          <span className="font-mono font-semibold text-slate-700">★ {rest.rating.toFixed(1)}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 truncate">{rest.name}</h3>
                        <div className="text-[10px] font-mono tabular-nums text-emerald-700 font-semibold">
                          {isPassed
                            ? 'Bus Passed'
                            : `${stopEta?.distanceRemainingKm ?? '—'} km · ${stopEta?.etaMinutes ?? '—'}m ETA`}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRestaurant(rest.id, true);
                        }}
                        className={`mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-semibold ${
                          canOrder
                            ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isPassed ? 'Stop Passed' : !rest.acceptingOrders ? 'Paused' : 'Open Menu →'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANT MENU */}
      {step === 'menu' && selectedRestaurant && (
        <div className="space-y-2.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => navigateStep('landing')}
                  className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"
                  aria-label="Back to route"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-slate-900 truncate">{selectedRestaurant.name}</h2>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedRestaurant.city} · {selectedRestaurant.avgPrepMinutes}m prep
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVegOnly((v) => !v)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-semibold shrink-0 ${
                  vegOnly
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {vegOnly ? 'Veg ✓' : 'Veg'}
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-900 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredMenu.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-2.5 flex gap-2.5 justify-between"
                >
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-500">
                        <span
                          className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-[2px] border ${
                            item.isVeg ? 'border-emerald-700' : 'border-red-700'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              item.isVeg ? 'bg-emerald-700' : 'bg-red-700'
                            }`}
                          />
                        </span>
                        <span>{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
                        <span>· {item.prepMinutes}m</span>
                      </div>
                      <h3 className="text-[11px] font-bold text-slate-900 mt-0.5 leading-tight">{item.name}</h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-900">
                        ₹{item.price}
                      </span>
                      {!item.available ? (
                        <span className="text-[10px] font-semibold text-red-600">Sold Out</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, 1, item.name, item.restaurantId)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-800 text-emerald-900 text-[10px] font-semibold hover:bg-emerald-800 hover:text-white transition-colors"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="inline-flex items-center border border-emerald-900 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateCart(item.id, -1)}
                            className="h-6 w-6 flex items-center justify-center text-emerald-900"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1.5 text-[11px] font-mono font-bold tabular-nums">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCart(item.id, 1, item.name, item.restaurantId)}
                            className="h-6 w-6 flex items-center justify-center text-emerald-900"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <img
                    src={resolveImageUrl(item.image)}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0 self-center"
                    referrerPolicy="no-referrer"
                  />
                </div>
              );
            })}
          </div>

          {totalItemCount > 0 && (
            <button
              type="button"
              onClick={() => navigateStep('checkout')}
              className="w-full min-h-[40px] rounded-xl bg-emerald-800 text-white px-3 py-2 text-[11px] font-bold flex items-center justify-between shadow-md"
            >
              <span>
                {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} · ₹{totalPayable.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1">
                Checkout <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}
        </div>
      )}

      {/* TAB 4: CART, DINING PREFERENCES & PAYMENT CHECKOUT */}
      {step === 'checkout' && (
        <div className="space-y-2.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-900">Your Pre-Order Cart</h2>
              <button
                type="button"
                onClick={() => navigateStep('menu')}
                className="text-[11px] font-semibold text-emerald-700"
              >
                + Add Items
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-5 text-center text-[11px] text-slate-500 space-y-2">
                <p>Your food cart is empty.</p>
                <button
                  type="button"
                  onClick={() => navigateStep('landing')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold"
                >
                  Browse Kitchens
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map(({ item, qty }) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">₹{item.price} × {qty}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="inline-flex items-center border border-slate-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, -1)}
                          className="h-6 w-6 flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1 text-[11px] font-mono font-bold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, 1)}
                          className="h-6 w-6 flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="w-10 text-right text-[11px] font-mono font-bold">
                        ₹{(item.price * qty).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dining Mode & Passenger Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900">Dining Mode & Seat Info</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 ${
                  orderType === 'TAKEAWAY'
                    ? 'border-emerald-900 bg-emerald-900 text-white'
                    : 'border-slate-200 text-slate-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">Takeaway</div>
                  <div className={`text-[9px] truncate ${orderType === 'TAKEAWAY' ? 'text-emerald-200' : 'text-slate-500'}`}>
                    Bus / Counter
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 ${
                  orderType === 'DINE_IN'
                    ? 'border-emerald-900 bg-emerald-900 text-white'
                    : 'border-slate-200 text-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">Dine-In</div>
                  <div className={`text-[9px] truncate ${orderType === 'DINE_IN' ? 'text-emerald-200' : 'text-slate-500'}`}>
                    Table Ready
                  </div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Name</label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Mobile</label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Seat No</label>
                <input
                  type="text"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              {orderType === 'DINE_IN' ? (
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={dineInGuests}
                    onChange={(e) => setDineInGuests(Number(e.target.value) || 1)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Dietary</label>
                  <input
                    type="text"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="No onion/garlic"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                </div>
              )}
            </div>

            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Special note (e.g., Less spicy, extra chutney)"
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
            />
          </div>

          {/* Payment Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5%) + Fee</span>
                <span className="font-mono tabular-nums">₹{(gstAmount + serviceFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Total Payable</span>
                <span className="font-mono tabular-nums">₹{totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || cartItems.length === 0}
              onClick={() => handlePlaceOrder('SUCCESS')}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {submitting ? 'Verifying...' : `Pay ₹${totalPayable.toFixed(2)} & Confirm`}
            </button>
            <button
              type="button"
              disabled={submitting || cartItems.length === 0}
              onClick={() => handlePlaceOrder('FAIL')}
              className="w-full py-1.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Test Payment Failure & Retry Flow
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE ORDER TRACKING & COLLECTION */}
      {step === 'tracking' && (
        <div className="space-y-2.5">
          {busOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2.5">
              <p className="text-xs text-slate-500">No food orders on {vehicle.regNumber} yet.</p>
              <button
                type="button"
                onClick={() => navigateStep('landing')}
                className="px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
              >
                Explore Partner Kitchens
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {busOrders.map((ord) => {
                  const isSel = activeTrackedOrder?.id === ord.id;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setTrackedOrderId(ord.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 border ${
                        isSel
                          ? 'bg-emerald-950 text-white border-emerald-950'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {ord.id} · {ord.paymentStatus === 'FAILED' ? 'FAILED' : ord.status}
                    </button>
                  );
                })}
              </div>

              {activeTrackedOrder &&
                (() => {
                  const rest = state.restaurants.find((r) => r.id === activeTrackedOrder.restaurantId);
                  const stopEta = trip?.stopEtas.find(
                    (s) => s.restaurantId === activeTrackedOrder.restaurantId
                  );
                  const activeIdx = ORDER_STEPS.findIndex((s) => s.key === activeTrackedOrder.status);

                  return (
                    <div className="space-y-2.5">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="min-w-0">
                            <div className="text-[9px] font-mono text-slate-500">
                              {activeTrackedOrder.id} · {activeTrackedOrder.orderType}
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 truncate">{rest?.name}</h2>
                            <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {rest?.city}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" /> {rest?.mobile}
                              </span>
                            </div>
                          </div>

                          {activeTrackedOrder.paymentStatus === 'VERIFIED' &&
                            activeTrackedOrder.status !== 'REJECTED' && (
                              <div className="bg-emerald-950 text-white rounded-xl px-2.5 py-1 text-center shrink-0">
                                <div className="text-[8px] text-emerald-300">Code</div>
                                <div className="text-sm font-mono font-bold tracking-wider tabular-nums">
                                  {activeTrackedOrder.pickupCode}
                                </div>
                              </div>
                            )}
                        </div>

                        {activeTrackedOrder.paymentStatus === 'FAILED' && (
                          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-[11px] text-red-800">
                            <div className="font-bold">Payment Verification Failed</div>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleRetryPayment(activeTrackedOrder.id)}
                              className="w-full py-1.5 rounded-lg bg-red-700 text-white font-semibold inline-flex items-center justify-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retry (₹{activeTrackedOrder.totalAmount.toFixed(2)})
                            </button>
                          </div>
                        )}

                        {activeTrackedOrder.status === 'REJECTED' && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                            <div className="font-bold">Rejected & Refunded</div>
                            <p className="mt-0.5">
                              {activeTrackedOrder.rejectionReason}. ₹{activeTrackedOrder.totalAmount.toFixed(2)}{' '}
                              refunded.
                            </p>
                          </div>
                        )}

                        {activeTrackedOrder.paymentStatus !== 'FAILED' &&
                          activeTrackedOrder.status !== 'REJECTED' && (
                            <div className="grid grid-cols-5 gap-1">
                              {ORDER_STEPS.map((st, idx) => {
                                const done = activeIdx >= idx;
                                return (
                                  <div key={st.key} className="text-center">
                                    <div
                                      className={`h-1 rounded-full mb-1 ${
                                        done ? 'bg-emerald-600' : 'bg-slate-200'
                                      }`}
                                    />
                                    <div
                                      className={`text-[9px] font-medium truncate ${
                                        done ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                                      }`}
                                    >
                                      {st.label}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {activeTrackedOrder.status === 'READY' && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-950">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <div>
                              <span className="font-bold">Ready!</span> Code{' '}
                              <span className="font-mono font-bold">{activeTrackedOrder.pickupCode}</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                          <div>
                            <div className="text-slate-400">Bus</div>
                            <div className="font-mono font-bold text-slate-900 truncate">
                              {vehicle.regNumber}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Dist</div>
                            <div className="font-mono font-bold tabular-nums text-slate-900">
                              {stopEta?.passed ? 'Here' : `${stopEta?.distanceRemainingKm ?? '—'}km`}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">ETA</div>
                            <div className="font-mono font-bold tabular-nums text-emerald-700">
                              {stopEta?.passed ? '0m' : `${stopEta?.etaMinutes ?? '—'}m`}
                            </div>
                          </div>
                        </div>
                      </div>

                      <RouteMapVisualizer
                        route={route}
                        trip={trip}
                        restaurants={state.restaurants}
                        highlightedRestaurantId={activeTrackedOrder.restaurantId}
                        mobileLayout
                      />

                      <div className="bg-white border border-slate-200 rounded-2xl p-3 text-[11px] space-y-1.5">
                        <div className="font-bold text-slate-900">Order Receipt</div>
                        {activeTrackedOrder.items.map((it) => (
                          <div key={it.menuItemId} className="flex justify-between text-slate-700 gap-2">
                            <span className="truncate">{it.qty}× {it.name}</span>
                            <span className="font-mono tabular-nums shrink-0">
                              ₹{(it.qty * it.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                          <span>Total Paid</span>
                          <span className="font-mono tabular-nums">
                            ₹{activeTrackedOrder.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </div>
      )}
    </MobilePhoneFrame>
  );
}
