import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  IndianRupee,
  LayoutDashboard,
  Plus,
  QrCode,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { DesktopBrowserFrame } from '../components/DesktopBrowserFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import type { BusTicketBooking, PlatformState, Trip } from '../types/platform';

interface BusTravelsPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  onOpenPassengerQr: (qrToken: string) => void;
  tourSignal?: TourSignal | null;
}

type TravelsSection = 'overview' | 'tickets' | 'schedules' | 'food';

function getSeatsForVehicle(type: string): { lower: string[]; upper: string[] } {
  if (type === 'AC Sleeper') {
    return {
      lower: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'],
      upper: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12'],
    };
  }
  return {
    lower: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    upper: ['S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24'],
  };
}

export function BusTravelsPortal({
  state,
  post,
  patch,
  onOpenPassengerQr,
  tourSignal,
}: BusTravelsPortalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    state.companies[0]?.id || 'comp-kpn'
  );
  const [section, setSection] = useState<TravelsSection>('overview');

  useEffect(() => {
    if (!tourSignal?.travelsSection) return;
    setSection(tourSignal.travelsSection);
  }, [tourSignal?.nonce]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'CONFIRMED' | 'BOARDED' | 'CANCELLED'>('ALL');

  // Add vehicle modal/form state
  const [showAddBus, setShowAddBus] = useState(false);
  const [newBus, setNewBus] = useState({
    regNumber: '',
    type: 'AC Sleeper' as const,
    seatingCapacity: '36',
    routeId: state.routes[0]?.id || 'route-chm',
  });

  // Inline trip config edits
  const [fareEdits, setFareEdits] = useState<Record<string, string>>({});
  const [depEdits, setDepEdits] = useState<Record<string, string>>({});
  const [arrEdits, setArrEdits] = useState<Record<string, string>>({});
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

  const company = useMemo(
    () => state.companies.find((c) => c.id === selectedCompanyId) || state.companies[0],
    [state.companies, selectedCompanyId]
  );

  const companyVehicles = useMemo(
    () => state.vehicles.filter((v) => v.companyId === company?.id),
    [state.vehicles, company]
  );

  const companyTrips = useMemo(() => {
    const vehicleIds = new Set(companyVehicles.map((v) => v.id));
    return state.trips.filter((t) => vehicleIds.has(t.vehicleId));
  }, [state.trips, companyVehicles]);

  const activeSeatTrip: Trip | undefined = useMemo(() => {
    if (selectedTripId) {
      const found = companyTrips.find((t) => t.id === selectedTripId);
      if (found) return found;
    }
    return companyTrips[0];
  }, [companyTrips, selectedTripId]);

  const companyTickets = useMemo(
    () => state.tickets.filter((t) => t.companyId === company?.id),
    [state.tickets, company]
  );

  const filteredTickets = useMemo(() => {
    return companyTickets.filter((t) => ticketFilter === 'ALL' || t.status === ticketFilter);
  }, [companyTickets, ticketFilter]);

  const companyOrders = useMemo(
    () => state.orders.filter((o) => o.companyId === company?.id && o.paymentStatus === 'VERIFIED'),
    [state.orders, company]
  );

  const companyQrs = useMemo(() => {
    const vehicleIds = new Set(companyVehicles.map((v) => v.id));
    return state.qrCodes.filter((q) => vehicleIds.has(q.vehicleId));
  }, [state.qrCodes, companyVehicles]);

  const companyStaff = useMemo(
    () => state.staff.filter((s) => s.companyId === company?.id),
    [state.staff, company]
  );

  const travelsAlerts = useMemo(
    () =>
      state.notifications
        .filter((n) => n.targetRole === 'TRAVELS_ADMIN' && (!n.targetId || n.targetId === company?.id))
        .slice(0, 6),
    [state.notifications, company]
  );

  const kpis = useMemo(() => {
    const activeTickets = companyTickets.filter((t) => t.status !== 'CANCELLED');
    const seatsBooked = activeTickets.reduce((s, t) => s + t.seatNumbers.length, 0);
    const ticketRevenue = activeTickets.reduce((s, t) => s + t.totalFare, 0);
    const activeVehicles = companyVehicles.filter((v) => v.status === 'ACTIVE').length;
    return {
      activeVehicles,
      totalVehicles: companyVehicles.length,
      tripsCount: companyTrips.length,
      ticketsCount: activeTickets.length,
      seatsBooked,
      ticketRevenue,
      foodOrders: companyOrders.length,
    };
  }, [companyTickets, companyVehicles, companyTrips, companyOrders]);

  if (!company) return null;

  const navItems: { id: TravelsSection; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: 'Fleet & Overview', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets & Seat Map', icon: Ticket, badge: kpis.ticketsCount || undefined },
    { id: 'schedules', label: 'Schedules & Fares', icon: Clock },
    { id: 'food', label: 'Bus Food QR & Revenue', icon: QrCode },
  ];

  const handleSaveTripConfig = async (trip: Trip) => {
    const fareVal = Number(fareEdits[trip.id] ?? trip.seatFare);
    const depVal = depEdits[trip.id] ?? trip.departureTime;
    const arrVal = arrEdits[trip.id] ?? trip.arrivalTime;
    await patch(`/api/trips/${trip.id}/config`, {
      seatFare: fareVal,
      departureTime: depVal,
      arrivalTime: arrVal,
    });
    setSavedTripId(trip.id);
    window.setTimeout(() => setSavedTripId(null), 2500);
  };

  const seatMapOwnerLookup = (tripId: string, seat: string): BusTicketBooking | undefined => {
    return state.tickets.find(
      (t) => t.tripId === tripId && t.status !== 'CANCELLED' && t.seatNumbers.includes(seat)
    );
  };

  const desktopBadge = (
    <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-200/80 px-3.5 py-1.5 shadow-xs text-xs font-semibold text-emerald-950">
      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
      Bus Travels Operator Console — Desktop View
    </div>
  );

  return (
    <DesktopBrowserFrame
      url={`travels.busbite.app/${company.id}/${section}`}
      title={`${company.name} — Travels Admin`}
      subtitle={`Reg ${company.registrationNo}`}
      topBarSlot={desktopBadge}
    >
      <div className="p-3.5 sm:p-5 flex flex-col lg:flex-row gap-4 sm:gap-5">
        {/* Left Operator Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{company.name}</div>
                <div className="text-[11px] text-emerald-700 font-semibold">{company.status}</div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                Switch Bus Travels Account
              </label>
              <select
                value={company.id}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedTripId('');
                }}
                aria-label="Switch Bus Travels Company"
                className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2"
              >
                {state.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <nav className="bg-white border border-slate-200 rounded-xl p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
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
                  {item.badge ? (
                    <span className={`font-mono text-[11px] font-bold ${active ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Operator Notifications */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-900">Booking & Fleet Alerts</div>
            {travelsAlerts.length === 0 ? (
              <p className="text-[11px] text-slate-500">No recent booking alerts.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {travelsAlerts.map((al) => (
                  <div key={al.id} className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2.5 text-[11px]">
                    <div className="font-semibold text-emerald-950">{al.title}</div>
                    <div className="text-slate-600 mt-0.5">{al.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Operator Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* SECTION 1: FLEET & OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{company.name} — Operator Overview</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage your fleet occupancy, passenger bus ticket sales, crew rosters & highway food partnerships
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSection('schedules');
                    setShowAddBus(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Bus to Fleet
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Active Fleet</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {kpis.activeVehicles} / {kpis.totalVehicles}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{kpis.tripsCount} scheduled trips</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Tickets Sold</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                    {kpis.ticketsCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{kpis.seatsBooked} seats booked</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Ticket Revenue</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    ₹{kpis.ticketRevenue.toFixed(0)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Direct operator fare + GST</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Food Pre-Orders</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {kpis.foodOrders}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Via in-bus seat QR</div>
                </div>
              </div>

              {/* Fleet Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Your Fleet & Live Occupancy</h2>
                  <span className="text-xs text-slate-500">{companyVehicles.length} vehicles</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-medium">Bus Reg No</th>
                        <th className="py-3 px-4 font-medium">Coach Type</th>
                        <th className="py-3 px-4 font-medium">Route & Departure</th>
                        <th className="py-3 px-4 font-medium">Seats Booked</th>
                        <th className="py-3 px-4 font-medium">Fare / Seat</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyVehicles.map((veh) => {
                        const trip = state.trips.find((t) => t.vehicleId === veh.id);
                        const route = state.routes.find((r) => r.id === veh.routeId);
                        const bookedCount = trip?.bookedSeats.length || 0;
                        return (
                          <tr key={veh.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{veh.regNumber}</td>
                            <td className="py-3 px-4">
                              {veh.type} · {veh.seatingCapacity}s
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{route?.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {trip?.departureTime} → {trip?.arrivalTime}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              <span className="font-bold text-emerald-800">{bookedCount}</span> / {veh.seatingCapacity}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              ₹{trip?.seatFare ?? 750}
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              <span className={veh.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'}>
                                {veh.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              {trip && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTripId(trip.id);
                                    setSection('tickets');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-medium"
                                >
                                  Seat Map
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  patch(`/api/vehicles/${veh.id}/status`, {
                                    status: veh.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE',
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                {veh.status === 'ACTIVE' ? 'Maintenance' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active GPS Trip Preview */}
              {companyTrips
                .filter((t) => t.status === 'IN_PROGRESS')
                .map((trip) => {
                  const route = state.routes.find((r) => r.id === trip.routeId);
                  if (!route) return null;
                  return (
                    <RouteMapVisualizer
                      key={trip.id}
                      route={route}
                      trip={trip}
                      restaurants={state.restaurants}
                      compact
                    />
                  );
                })}
            </div>
          )}

          {/* SECTION 2: TICKETS & LIVE SEAT MAP */}
          {section === 'tickets' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Ticket Bookings & Live Seat Map</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time passenger seat occupancy, boarding check-in, and ticket cancellation
                  </p>
                </div>

                {companyTrips.length > 0 && (
                  <select
                    value={activeSeatTrip?.id || ''}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    {companyTrips.map((t) => {
                      const v = state.vehicles.find((veh) => veh.id === t.vehicleId);
                      const r = state.routes.find((rt) => rt.id === t.routeId);
                      return (
                        <option key={t.id} value={t.id}>
                          {v?.regNumber} · {r?.name} ({t.bookedSeats.length} booked)
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Live Seat Occupancy Grid */}
              {activeSeatTrip &&
                (() => {
                  const veh = state.vehicles.find((v) => v.id === activeSeatTrip.vehicleId);
                  const layout = getSeatsForVehicle(veh?.type || 'AC Sleeper');
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Armchair className="w-4 h-4 text-emerald-700" />
                          Seat Map · {veh?.regNumber} ({veh?.type})
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded border border-emerald-600 bg-white" /> Available
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-800" /> Booked / Occupied
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { title: veh?.type === 'AC Sleeper' ? 'Lower Deck' : 'Rows 1–3', seats: layout.lower },
                          { title: veh?.type === 'AC Sleeper' ? 'Upper Deck' : 'Rows 4–6', seats: layout.upper },
                        ].map((deck) => (
                          <div key={deck.title} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                            <div className="text-xs font-bold text-slate-700">{deck.title}</div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {deck.seats.map((seat) => {
                                const isBooked = activeSeatTrip.bookedSeats.includes(seat);
                                const booking = isBooked
                                  ? seatMapOwnerLookup(activeSeatTrip.id, seat)
                                  : undefined;
                                return (
                                  <div
                                    key={seat}
                                    title={booking ? `${booking.passengerName} (${booking.pnr})` : 'Available'}
                                    className={`rounded-lg px-2 py-2 text-center border text-xs ${
                                      isBooked
                                        ? 'bg-emerald-800 border-emerald-900 text-white'
                                        : 'bg-white border-emerald-300 text-slate-800'
                                    }`}
                                  >
                                    <div className="font-mono font-bold">{seat}</div>
                                    <div className={`text-[10px] truncate ${isBooked ? 'text-emerald-200' : 'text-slate-400'}`}>
                                      {booking ? booking.passengerName.split(' ')[0] : isBooked ? 'Booked' : `₹${activeSeatTrip.seatFare}`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              {/* Ticket Bookings Manifest */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    Passenger Ticket Manifest ({filteredTickets.length})
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(['ALL', 'CONFIRMED', 'BOARDED', 'CANCELLED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTicketFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          ticketFilter === st
                            ? 'bg-emerald-900 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-medium">PNR & Bus</th>
                        <th className="py-3 px-4 font-medium">Passenger</th>
                        <th className="py-3 px-4 font-medium">Seats</th>
                        <th className="py-3 px-4 font-medium">Boarding → Dropping</th>
                        <th className="py-3 px-4 font-medium text-right">Fare Paid</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No ticket bookings match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((tkt) => {
                          const veh = state.vehicles.find((v) => v.id === tkt.vehicleId);
                          return (
                            <tr key={tkt.id} className="hover:bg-slate-50/60">
                              <td className="py-3 px-4">
                                <div className="font-mono font-bold text-slate-900">{tkt.pnr}</div>
                                <div className="font-mono text-[11px] text-slate-500">{veh?.regNumber}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{tkt.passengerName}</div>
                                <div className="font-mono text-[11px] text-slate-500">{tkt.passengerPhone}</div>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                                {tkt.seatNumbers.join(', ')}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div className="truncate max-w-[200px]">{tkt.boardingPoint}</div>
                                <div className="truncate max-w-[200px] text-slate-400">→ {tkt.droppingPoint}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                ₹{tkt.totalFare.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                <span
                                  className={
                                    tkt.status === 'BOARDED'
                                      ? 'text-emerald-700'
                                      : tkt.status === 'CONFIRMED'
                                        ? 'text-blue-700'
                                        : 'text-red-600'
                                  }
                                >
                                  {tkt.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                {tkt.status === 'CONFIRMED' && (
                                  <button
                                    type="button"
                                    onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'BOARDED' })}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-medium inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Boarded
                                  </button>
                                )}
                                {tkt.status !== 'CANCELLED' && (
                                  <button
                                    type="button"
                                    onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'CANCELLED' })}
                                    className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" /> Cancel
                                  </button>
                                )}
                              </td>
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

          {/* SECTION 3: SCHEDULES, FARES & CREW */}
          {section === 'schedules' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Bus Schedules, Seat Fares & Crew</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update live ticket fares, departure/arrival timings, and register additional buses
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBus((v) => !v)}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Register New Bus
                </button>
              </div>

              {showAddBus && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await post('/api/vehicles', {
                      ...newBus,
                      companyId: company.id,
                      seatingCapacity: Number(newBus.seatingCapacity) || 36,
                    });
                    setNewBus({ ...newBus, regNumber: '' });
                    setShowAddBus(false);
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bus Reg Number</label>
                    <input
                      required
                      value={newBus.regNumber}
                      onChange={(e) => setNewBus({ ...newBus, regNumber: e.target.value })}
                      placeholder="TN 45 KL 7788"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Coach Type</label>
                    <select
                      value={newBus.type}
                      onChange={(e) =>
                        setNewBus({ ...newBus, type: e.target.value as typeof newBus.type })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      <option value="AC Sleeper">AC Sleeper</option>
                      <option value="Volvo Multi-Axle">Volvo Multi-Axle</option>
                      <option value="Luxury Seater">Luxury Seater</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Route</label>
                    <select
                      value={newBus.routeId}
                      onChange={(e) => setNewBus({ ...newBus, routeId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      {state.routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                  >
                    Add Bus & Schedule
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {companyTrips.map((trip) => {
                  const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
                  const route = state.routes.find((r) => r.id === trip.routeId);
                  const driver = state.staff.find((s) => s.id === trip.driverId);
                  const conductor = state.staff.find((s) => s.id === trip.conductorId);
                  return (
                    <div
                      key={trip.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-end justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-[200px]">
                        <div className="text-sm font-mono font-bold text-slate-900">
                          {veh?.regNumber} · <span className="text-emerald-700">{veh?.type}</span>
                        </div>
                        <div className="text-xs text-slate-600">{route?.name}</div>
                        <div className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Driver: {driver?.name || 'Assigned'} · Conductor: {conductor?.name || 'Assigned'}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Seat Fare (₹)</label>
                          <input
                            type="number"
                            min={100}
                            value={fareEdits[trip.id] ?? String(trip.seatFare)}
                            onChange={(e) => setFareEdits({ ...fareEdits, [trip.id]: e.target.value })}
                            className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Departure</label>
                          <input
                            type="text"
                            value={depEdits[trip.id] ?? trip.departureTime}
                            onChange={(e) => setDepEdits({ ...depEdits, [trip.id]: e.target.value })}
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Arrival</label>
                          <input
                            type="text"
                            value={arrEdits[trip.id] ?? trip.arrivalTime}
                            onChange={(e) => setArrEdits({ ...arrEdits, [trip.id]: e.target.value })}
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveTripConfig(trip)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900"
                        >
                          {savedTripId === trip.id ? 'Saved ✓' : 'Update Schedule'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Staff Roster */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Operator Driver & Conductor Roster ({companyStaff.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {companyStaff.map((st) => {
                    const veh = state.vehicles.find((v) => v.id === st.assignedVehicleId);
                    return (
                      <div key={st.id} className="border border-slate-200 rounded-lg p-3 space-y-0.5">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-emerald-700 font-semibold">{st.role}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {veh?.regNumber} · {st.mobile}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FOOD QR & REVENUE */}
          {section === 'food' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900">In-Bus Food QR & Operator Revenue</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket booking revenue combined with approved highway restaurant QR partnerships on your fleet
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Bus Ticket Sales
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                    ₹{kpis.ticketRevenue.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">In-Bus Food Pre-Orders</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {companyOrders.length} orders
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Active Fleet QR Stickers</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {companyQrs.filter((q) => q.active).length} active
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyQrs.map((qr) => {
                  const veh = state.vehicles.find((v) => v.id === qr.vehicleId);
                  const part = state.partnerships.find((p) => p.id === qr.partnershipId);
                  const rests = (part?.restaurantIds || [])
                    .map((id) => state.restaurants.find((r) => r.id === id)?.name)
                    .filter(Boolean);
                  return (
                    <div key={qr.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="font-mono font-bold text-sm text-slate-900">{veh?.regNumber}</div>
                        <div className="text-xs font-mono text-emerald-700">{qr.token}</div>
                        <div className="text-xs text-slate-500 truncate">Stops: {rests.join(' → ')}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {qr.scanCount} scans · {qr.orderCount} food orders
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPassengerQr(qr.token)}
                        className="px-3 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold shrink-0 hover:bg-emerald-900"
                      >
                        Test QR Flow
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </DesktopBrowserFrame>
  );
}
