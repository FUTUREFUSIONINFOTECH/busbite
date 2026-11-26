import type { ReactNode } from 'react';
import { Lock, RefreshCw } from 'lucide-react';

interface DesktopBrowserFrameProps {
  url: string;
  title: string;
  subtitle?: string;
  topBarSlot?: ReactNode;
  onRefresh?: () => void;
  children: ReactNode;
}

export function DesktopBrowserFrame({
  url,
  title,
  subtitle,
  topBarSlot,
  onRefresh,
  children,
}: DesktopBrowserFrameProps) {
  return (
    <div className="min-h-[calc(100dvh-108px)] lg:min-h-[calc(100dvh-64px)] w-full bg-[#EAF0EC] px-2 sm:px-5 py-3 sm:py-5 flex flex-col items-center overflow-x-hidden">
      {topBarSlot && (
        <div className="w-full max-w-[1024px] flex justify-center mb-3">{topBarSlot}</div>
      )}

      {/* Normal-Width Desktop Monitor Hardware Frame */}
      <div className="w-full max-w-[1024px] flex flex-col items-center">
        {/* Monitor Outer Bezel */}
        <div className="w-full rounded-2xl sm:rounded-[22px] bg-[#0B1B15] p-1.5 sm:p-2.5 shadow-[0_24px_60px_rgba(6,78,59,0.24)] border border-emerald-950/60">
          {/* Top Webcam Bezel Strip */}
          <div className="hidden sm:flex items-center justify-center pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </span>
            </div>
          </div>

          {/* Monitor Screen Panel */}
          <div className="w-full rounded-xl bg-[#F7FAF8] overflow-hidden border border-slate-900/20">
            {/* Desktop Browser Window Chrome */}
            <div className="bg-[#132C22] text-white px-2.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/70">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-400/90" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400/90" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400/90" />
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-100 truncate">
                  <img
  src={`${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`}
  alt="BusBite"
  className="w-7 h-7 rounded-md object-contain bg-white shrink-0"
  onError={(e) => {
    console.error('BusBite logo failed to load:', e.currentTarget.src);
  }}
/>
                  <span className="truncate">{title}</span>
                  {subtitle && (
                    <span className="text-emerald-300/80 font-normal truncate">· {subtitle}</span>
                  )}
                </div>
              </div>

              {/* Browser Address Bar */}
              <div className="flex-1 min-w-0 sm:max-w-md flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1 text-xs">
                <Lock className="w-3 h-3 text-emerald-300 shrink-0" />
                <span className="font-mono text-[10px] sm:text-[11px] text-emerald-50 truncate flex-1">
                  {url}
                </span>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    aria-label="Reload desktop view"
                    className="text-emerald-200 hover:text-white transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Desktop Display
              </div>
            </div>

            {/* Desktop Web Application Viewport */}
            <div className="bg-[#F7FAF8] min-h-[420px] sm:min-h-[520px] md:max-h-[calc(100dvh-210px)] md:overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent]">
              {children}
            </div>
          </div>

          {/* Monitor Bottom Chin */}
          <div className="hidden sm:flex items-center justify-center pt-2 pb-0.5">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-200/50">
              BUSBITE DESKTOP
            </span>
          </div>
        </div>

        {/* Desktop Monitor Stand Neck & Base */}
        <div className="hidden md:flex flex-col items-center" aria-hidden="true">
          <div className="w-20 h-6 bg-gradient-to-b from-[#0B1B15] to-[#1D3B2F] shadow-inner" />
          <div className="w-52 h-2 rounded-full bg-gradient-to-r from-[#1A352A] via-[#2A5241] to-[#1A352A] shadow-md" />
        </div>
      </div>
    </div>
  );
}
