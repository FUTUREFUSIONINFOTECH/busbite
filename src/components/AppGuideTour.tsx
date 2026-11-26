import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Film,
  Play,
  QrCode,
  RotateCcw,
  X,
} from 'lucide-react';
import type { PortalView } from '../types/platform';

export interface TourSignal {
  nonce: number;
  passengerTab?: 'tickets' | 'landing' | 'menu' | 'checkout' | 'tracking';
  passengerDisplay?: 'app' | 'browser' | 'toggle';
  restaurantMode?: 'mobile' | 'desktop' | 'toggle';
  driverTab?: 'home' | 'trips' | 'gps' | 'orders' | 'profile';
  travelsSection?: 'overview' | 'tickets' | 'schedules' | 'food';
  adminSection?: 'dashboard' | 'restaurants' | 'transport' | 'routes' | 'partnerships' | 'orders' | 'payments' | 'reports';
}

interface TourStep {
  id: string;
  portal: PortalView;
  portalLabel: string;
  title: string;
  summary: string;
  checklist: string[];
  actionLabel: string;
  signal: Omit<TourSignal, 'nonce'>;
  opensShareModal?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    portal: 'passenger',
    portalLabel: 'Passenger QR',
    title: 'Welcome to BusBite Platform',
    summary:
      'One connected highway travel platform for bus seat booking, in-bus QR meal pre-ordering, and live corridor GPS tracking.',
    checklist: [
      'Switch between Mobile App (320px) and Mobile Browser (Web) above the phone frame.',
      'Explore all 5 live portals from the top bar — data syncs in real time across every role.',
    ],
    actionLabel: 'Toggle App / Mobile Browser',
    signal: { passengerTab: 'landing', passengerDisplay: 'toggle' },
  },
  {
    id: 'tickets',
    portal: 'passenger',
    portalLabel: 'Passenger QR · Tickets',
    title: 'Book Bus Seats & Get Instant PNR',
    summary:
      'Passengers filter highway corridors, pick Lower/Upper deck seats with real-time double-booking lock, and receive a digital PNR.',
    checklist: [
      'Select an active bus schedule and tap available green seats to see live fare & GST.',
      'After booking, tap "Pre-Order Food" on your PNR card to link your seat number automatically.',
    ],
    actionLabel: 'Show Seat Booking Flow',
    signal: { passengerTab: 'tickets', passengerDisplay: 'app' },
  },
  {
    id: 'food-preorder',
    portal: 'passenger',
    portalLabel: 'Passenger QR · Highway Dining',
    title: 'Pre-Order Fresh Meals Before Stop Arrival',
    summary:
      'Passengers browse menus of approved highway restaurants ahead on their route and pay before the bus reaches the stop.',
    checklist: [
      'Add items in Menu, pick Takeaway Pickup or Bus Seat Delivery, and pay in Cart.',
      'Track food preparation status and live bus ETA together in the Track tab.',
    ],
    actionLabel: 'Jump to Restaurant Menu',
    signal: { passengerTab: 'menu', passengerDisplay: 'app' },
  },
  {
    id: 'restaurant',
    portal: 'restaurant',
    portalLabel: 'Restaurant Partner',
    title: 'Kitchen Dispatch (Mobile & Desktop POS)',
    summary:
      'Highway restaurants view incoming buses with live ETAs, manage orders from Paid to Ready, and verify 4-digit pickup codes.',
    checklist: [
      'Accept new paid orders, mark Cooking / Ready, and test pickup handover verification.',
      'Switch to Desktop View above to preview the 1024px Kitchen Dispatch Kanban board.',
    ],
    actionLabel: 'Switch Mobile / Desktop POS',
    signal: { restaurantMode: 'toggle' },
  },
  {
    id: 'driver',
    portal: 'driver',
    portalLabel: 'Driver & Crew App',
    title: 'Live Bus GPS & Crew Order Alerts',
    summary:
      'Bus drivers stream route progress and speed from a compact 320px app while conductors check seat meal handovers.',
    checklist: [
      'Open Live GPS and simulate highway movement — passenger and kitchen ETAs update immediately.',
      'Switch to Orders to inspect confirmed passenger meal pickups along upcoming stops.',
    ],
    actionLabel: 'Open Driver Live GPS',
    signal: { driverTab: 'gps' },
  },
  {
    id: 'travels',
    portal: 'travels',
    portalLabel: 'Bus Travels Admin',
    title: 'Fleet Occupancy & Ticket Manifest Console',
    summary:
      'Bus operators manage fleet status, inspect live seat maps with passenger names, edit fares/schedules, and onboard new buses.',
    checklist: [
      'Switch between Ticket & Seat Map, Fleet Overview, and Schedules & Fares in the left menu.',
      'Check in confirmed passengers to BOARDED status or update fares per trip.',
    ],
    actionLabel: 'Inspect Live Seat Map',
    signal: { travelsSection: 'tickets' },
  },
  {
    id: 'admin',
    portal: 'admin',
    portalLabel: 'Super Admin & Share',
    title: 'Platform Governance, Settlements & QR Links',
    summary:
      'Central admins approve restaurants and operators, settle partner payouts, export CSV reports, and share scannable bus QR codes.',
    checklist: [
      'Review live KPIs, commissions, payouts, or reset demo data anytime from the left console.',
      'Open QR & Demo Link to copy shareable URLs or scan seat QR codes on a phone.',
    ],
    actionLabel: 'Open QR & Demo Link',
    signal: { adminSection: 'dashboard' },
    opensShareModal: true,
  },
];

interface AppGuideTourProps {
  open: boolean;
  hiddenDock?: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePortal: (view: PortalView) => void;
  onEmitSignal: (signal: Omit<TourSignal, 'nonce'>) => void;
  onOpenShareModal: () => void;
  onOpenDemoVideo: () => void;
}

export function AppGuideTour({
  open,
  hiddenDock = false,
  onOpenChange,
  onNavigatePortal,
  onEmitSignal,
  onOpenShareModal,
  onOpenDemoVideo,
}: AppGuideTourProps) {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [minimized, setMinimized] = useState<boolean>(false);

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const goToStep = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(TOUR_STEPS.length - 1, nextIndex));
    const target = TOUR_STEPS[bounded];
    setStepIndex(bounded);
    setMinimized(false);
    onNavigatePortal(target.portal);
    // Avoid auto-toggling modes on navigation if signal asks to toggle
    const cleanSignal = { ...target.signal };
    if (cleanSignal.passengerDisplay === 'toggle') cleanSignal.passengerDisplay = 'app';
    if (cleanSignal.restaurantMode === 'toggle') delete cleanSignal.restaurantMode;
    onEmitSignal(cleanSignal);
  };

  const handleOpenTour = () => {
    setStepIndex(0);
    setMinimized(false);
    onOpenChange(true);
    onNavigatePortal(TOUR_STEPS[0].portal);
    onEmitSignal({ passengerTab: 'landing', passengerDisplay: 'app' });
  };

  const handleStepAction = () => {
    onNavigatePortal(currentStep.portal);
    onEmitSignal(currentStep.signal);
    if (currentStep.opensShareModal) {
      onOpenShareModal();
    }
  };

  if (!open) {
    if (hiddenDock) return null;
    return (
      <div className="w-full bg-[#E3ECE7] border-b border-emerald-200/70 px-3 py-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpenDemoVideo}
          aria-label="Watch or Download BusBite Demo Video"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-950 px-3 py-1.5 text-xs font-semibold shadow-xs border border-emerald-200 hover:bg-emerald-50 transition-colors"
        >
          <Film className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Demo Video</span>
        </button>
        <button
          type="button"
          onClick={handleOpenTour}
          aria-label="Open BusBite App Guide Tour"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 text-white px-3 py-1.5 text-xs font-semibold shadow-xs border border-emerald-700/70 hover:bg-emerald-950 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>App Guide Tour</span>
        </button>
      </div>
    );
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <aside
      aria-label="BusBite App Walkthrough"
      className="fixed bottom-2.5 left-2.5 right-2.5 sm:left-auto sm:bottom-5 sm:right-5 sm:w-[372px] z-50 rounded-2xl bg-white border border-emerald-200 shadow-[0_22px_54px_rgba(6,78,59,0.25)] overflow-hidden"
    >
      {/* Top Guide Header */}
      <div className="bg-[#0B2B20] text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
            alt="BusBite"
            className="w-8 h-8 rounded-lg object-contain bg-white shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-tight truncate">BusBite App Guide</div>
            <div className="text-[10px] text-emerald-200 font-mono tabular-nums truncate">
              Step {stepIndex + 1} of {TOUR_STEPS.length} · {currentStep.portalLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expand guide tour' : 'Minimize guide tour'}
            className="h-8 w-8 rounded-lg text-emerald-100 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close guide tour"
            className="h-8 w-8 rounded-lg text-emerald-100 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clickable 7-Step Progress Bar */}
      <div className="px-3.5 pt-2.5 pb-1 bg-white">
        <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Walkthrough steps">
          {TOUR_STEPS.map((st, idx) => {
            const active = idx === stepIndex;
            const visited = idx < stepIndex;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Jump to step ${idx + 1}: ${st.title}`}
                onClick={() => goToStep(idx)}
                className="py-1 group focus-visible:outline-none"
              >
                <span
                  className={`block h-1.5 w-full rounded-full transition-colors ${
                    active
                      ? 'bg-emerald-700'
                      : visited
                        ? 'bg-emerald-400 group-hover:bg-emerald-500'
                        : 'bg-slate-200 group-hover:bg-emerald-200'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Step Body */}
          <div className="px-3.5 pb-3 pt-1.5 space-y-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{currentStep.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{currentStep.summary}</p>
            </div>

            <div className="rounded-xl bg-[#F4F8F6] border border-emerald-100 p-2.5 space-y-1.5">
              <div className="text-[11px] font-semibold text-emerald-950">Try on this screen</div>
              <ol className="space-y-1 text-[11px] text-slate-700 leading-snug">
                {currentStep.checklist.map((item, i) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="font-mono font-bold text-emerald-700 shrink-0">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={handleStepAction}
              className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {currentStep.opensShareModal ? (
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>{currentStep.actionLabel}</span>
            </button>
          </div>

          {/* Step Footer Controls */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => goToStep(stepIndex - 1)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(0)}
                  aria-label="Restart guide tour"
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restart
                </button>
              )}
            </div>

            {isLast ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Finish Tour
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
