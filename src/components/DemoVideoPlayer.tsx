import { useEffect, useState } from 'react';
import {
  Download,
  Film,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { PortalView } from '../types/platform';
import type { TourSignal } from './AppGuideTour';

interface DemoVideoScene {
  id: string;
  title: string;
  portal: PortalView;
  signal: Omit<TourSignal, 'nonce'>;
  captionEn: string;
  captionTa: string;
}

const LIVE_VIDEO_SCENES: DemoVideoScene[] = [
  {
    id: 'scene-1',
    title: '01. BusBite Intro',
    portal: 'passenger',
    signal: { passengerTab: 'landing', passengerDisplay: 'app' },
    captionEn:
      'Welcome to BusBite — Passenger QR App on a standard 320px screen with live route, stops, and upcoming highway kitchens.',
    captionTa:
      'BusBite-க்கு வரவேற்கிறோம் — 320px மொபைல் ஆப்பில் பஸ் ரூட், ஸ்டாப்புகள் மற்றும் நெடுஞ்சாலை உணவகங்களை நேரடியாகப் பார்க்கலாம்.',
  },
  {
    id: 'scene-2',
    title: '02. Book Bus Ticket',
    portal: 'passenger',
    signal: { passengerTab: 'tickets', passengerDisplay: 'app' },
    captionEn:
      'Passengers browse corridors, pick Lower/Upper deck sleeper seats with live double-booking lock, and get instant PNR.',
    captionTa:
      'பயணிகள் பஸ் நேரங்களைப் பார்த்து Lower/Upper சீட்டுகளை தேர்வு செய்து உடனடியாக PNR டிக்கெட் புக் செய்யலாம்.',
  },
  {
    id: 'scene-3',
    title: '03. QR Food Pre-Order',
    portal: 'passenger',
    signal: { passengerTab: 'menu', passengerDisplay: 'app' },
    captionEn:
      'One tap from ticket or seat QR opens highway menus — passengers pre-order meals and track prep live before arrival.',
    captionTa:
      'டிக்கெட் அல்லது சீட் QR வழியாக உணவக மெனுவைத் திறந்து, பஸ் வருவதற்கு முன்பே உணவு Pre-Order செய்யலாம்.',
  },
  {
    id: 'scene-4',
    title: '04. Mobile Browser Web',
    portal: 'passenger',
    signal: { passengerTab: 'tracking', passengerDisplay: 'browser' },
    captionEn:
      'No app install required: every seat QR also works smoothly inside any mobile web browser with live order tracking.',
    captionTa:
      'ஆப் டவுன்லோட் இல்லாமலேயே மொபைல் பிரவுசரிலும் லைவ் உணவு மற்றும் பஸ் ETA விவரங்களைப் பார்க்க முடியும்.',
  },
  {
    id: 'scene-5',
    title: '05. Restaurant Mobile POS',
    portal: 'restaurant',
    signal: { restaurantMode: 'mobile' },
    captionEn:
      'Highway restaurant partners receive paid orders on their 320px Kitchen App with live incoming bus ETA countdowns.',
    captionTa:
      'உணவக பார்ட்னர்கள் தங்களது 320px மொபைல் ஆப்பில் பஸ் வரும் நேரத்திற்கு (ETA) ஏற்ப ஆர்டர்களைத் தயார் செய்வார்கள்.',
  },
  {
    id: 'scene-6',
    title: '06. Restaurant Desktop Kanban',
    portal: 'restaurant',
    signal: { restaurantMode: 'desktop' },
    captionEn:
      'Kitchen staff can also switch to the 1024px Desktop Dispatch console to manage Cooking queues & 4-digit PIN handovers.',
    captionTa:
      'கிச்சன் டெஸ்க்டாப் வியூவில் ஒரே நேரத்தில் அனைத்து ஆர்டர்களையும் 4-இலக்க Pickup PIN மூலம் சரிபார்த்து வழங்கலாம்.',
  },
  {
    id: 'scene-7',
    title: '07. Driver & Crew Live GPS',
    portal: 'driver',
    signal: { driverTab: 'gps' },
    captionEn:
      'Drivers stream live highway speed and GPS progress from the Driver App, dynamically updating ETAs for passengers and kitchens.',
    captionTa:
      'டிரைவர் ஆப் மூலம் பஸ்ஸின் லைவ் GPS மற்றும் வேகம் அப்டேட் ஆகும்போது பயணி மற்றும் உணவக ETA தானாக மாறும்.',
  },
  {
    id: 'scene-8',
    title: '08. Bus Travels Admin',
    portal: 'travels',
    signal: { travelsSection: 'tickets' },
    captionEn:
      'Bus Travels Operators manage fleet health, view live deck seat occupancy with passenger names, and edit fares/schedules.',
    captionTa:
      'பஸ் டிராவல்ஸ் அட்மின் கன்சோலில் சீட் ஆக்குபன்சி, பயணிகள் பட்டியல், கட்டணம் மற்றும் பஸ் அட்டவணையை நிர்வகிக்கலாம்.',
  },
  {
    id: 'scene-9',
    title: '09. Super Admin & Payouts',
    portal: 'admin',
    signal: { adminSection: 'dashboard' },
    captionEn:
      'Super Admin oversees platform revenue, approves partners, settles restaurant payouts, exports CSVs, and shares demo QR codes.',
    captionTa:
      'சூப்பர் அட்மின் மூலம் பார்ட்னர் அப்ரூவல், கமிஷன் செட்டில்மென்ட், ரிப்போர்ட் மற்றும் QR டெமோ லிங்குகளை நிர்வகிக்கலாம்.',
  },
];

interface DemoVideoPlayerProps {
  active: boolean;
  onClose: () => void;
  onNavigatePortal: (view: PortalView) => void;
  onEmitSignal: (signal: Omit<TourSignal, 'nonce'>) => void;
  onOpenDownloadStudio: () => void;
}

export function DemoVideoPlayer({
  active,
  onClose,
  onNavigatePortal,
  onEmitSignal,
  onOpenDownloadStudio,
}: DemoVideoPlayerProps) {
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<1 | 1.5>(1);
  const [lang, setLang] = useState<'ta' | 'en'>('ta');
  const [progressInScene, setProgressInScene] = useState<number>(0);

  const sceneDurationMs = speed === 1 ? 5500 : 3700;

  const jumpToScene = (idx: number) => {
    const bounded = ((idx % LIVE_VIDEO_SCENES.length) + LIVE_VIDEO_SCENES.length) % LIVE_VIDEO_SCENES.length;
    const target = LIVE_VIDEO_SCENES[bounded];
    setSceneIndex(bounded);
    setProgressInScene(0);
    onNavigatePortal(target.portal);
    onEmitSignal(target.signal);
  };

  // Trigger initial scene when opened
  useEffect(() => {
    if (!active) return;
    setSceneIndex(0);
    setPlaying(true);
    setProgressInScene(0);
    const first = LIVE_VIDEO_SCENES[0];
    onNavigatePortal(first.portal);
    onEmitSignal(first.signal);
  }, [active]);

  // Smooth auto-play timer loop
  useEffect(() => {
    if (!active || !playing) return;
    const tickMs = 100;
    const timer = window.setInterval(() => {
      setProgressInScene((prev) => {
        const next = prev + tickMs / sceneDurationMs;
        if (next >= 1) {
          setSceneIndex((currIdx) => {
            const nextIdx = currIdx + 1;
            if (nextIdx >= LIVE_VIDEO_SCENES.length) {
              setPlaying(false);
              return currIdx;
            }
            const nextScene = LIVE_VIDEO_SCENES[nextIdx];
            onNavigatePortal(nextScene.portal);
            onEmitSignal(nextScene.signal);
            return nextIdx;
          });
          return 0;
        }
        return next;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [active, playing, sceneDurationMs]);

  if (!active) return null;

  const scene = LIVE_VIDEO_SCENES[sceneIndex];
  const totalSec = Math.round((LIVE_VIDEO_SCENES.length * sceneDurationMs) / 1000);
  const currentSec = Math.min(
    totalSec,
    Math.round(((sceneIndex + progressInScene) * sceneDurationMs) / 1000)
  );

  return (
    <section
      aria-label="BusBite Live Demo Video Player"
      className="fixed bottom-2.5 left-2.5 right-2.5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[680px] max-w-[calc(100vw-20px)] z-50 rounded-2xl bg-[#0B2B20]/95 backdrop-blur-md text-white border border-emerald-600/70 shadow-[0_24px_60px_rgba(6,78,59,0.4)] overflow-hidden"
    >
      {/* Subtitle Narration Strip */}
      <div className="px-3.5 sm:px-4 pt-3 pb-2 border-b border-white/10 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider shrink-0">
              <Film className="w-3 h-3" />
              Demo Reel
            </span>
            <span className="text-xs font-bold text-white truncate">{scene.title}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'ta' ? 'en' : 'ta'))}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-emerald-100 transition-colors"
              title="Switch caption language"
            >
              {lang === 'ta' ? 'தமிழ் / EN' : 'EN / தமிழ்'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Exit demo video mode"
              className="h-7 w-7 rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-emerald-50/95 leading-snug">
          {lang === 'ta' ? scene.captionTa : scene.captionEn}
        </p>
      </div>

      {/* Chapter Scrubber Strip */}
      <div className="px-3.5 sm:px-4 pt-2 pb-1">
        <div className="grid grid-cols-9 gap-1">
          {LIVE_VIDEO_SCENES.map((sc, idx) => {
            const fillPct =
              idx < sceneIndex ? 100 : idx === sceneIndex ? Math.round(progressInScene * 100) : 0;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => jumpToScene(idx)}
                aria-label={`Play ${sc.title}`}
                title={sc.title}
                className="py-1 group"
              >
                <span className="block h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                  <span
                    className="block h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${fillPct}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Transport Controls */}
      <div className="px-3.5 sm:px-4 pb-2.5 pt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => jumpToScene(sceneIndex - 1)}
            aria-label="Previous scene"
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!playing && sceneIndex === LIVE_VIDEO_SCENES.length - 1 && progressInScene === 0) {
                jumpToScene(0);
              }
              setPlaying((p) => !p);
            }}
            className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToScene(sceneIndex + 1)}
            aria-label="Next scene"
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono tabular-nums text-emerald-200 pl-1">
            00:{currentSec.toString().padStart(2, '0')} / 00:{totalSec.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 1.5 : 1))}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-semibold text-emerald-100 transition-colors"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              onClose();
              onOpenDownloadStudio();
            }}
            className="h-8 px-3 rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-800" />
            <span>Download Video (.webm)</span>
          </button>
        </div>
      </div>
    </section>
  );
}
