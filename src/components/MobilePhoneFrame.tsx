import type { ReactNode } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Share,
  Smartphone,
} from 'lucide-react';

export interface MobileNavTab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
}

export interface MobileBrowserConfig {
  url: string;
  onSwitchToApp?: () => void;
  onRefresh?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
}

interface MobilePhoneFrameProps<T extends string> {
  appName: string;
  subtitle: string;
  brandIcon: ReactNode;
  unreadNotifications?: number;
  onBellClick?: () => void;
  tabs: MobileNavTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  topBarSlot?: ReactNode;
  browserConfig?: MobileBrowserConfig;
  children: ReactNode;
  overlay?: ReactNode;
}

export function MobilePhoneFrame<T extends string>({
  appName,
  subtitle,
  brandIcon,
  unreadNotifications = 0,
  onBellClick,
  tabs,
  activeTab,
  onTabChange,
  topBarSlot,
  browserConfig,
  children,
  overlay,
}: MobilePhoneFrameProps<T>) {
  const isBrowser = Boolean(browserConfig);

  return (
    <div className="min-h-[calc(100dvh-108px)] lg:min-h-[calc(100dvh-64px)] w-full bg-[#EAF0EC] flex flex-col items-center justify-start sm:justify-center gap-2.5 px-2 py-2.5 sm:px-4 sm:py-4 overflow-x-hidden">
      {topBarSlot && <div className="w-full max-w-[340px] flex justify-center">{topBarSlot}</div>}

      {/* Standard compact phone width: 320px */}
      <div
        className={`relative mx-auto flex min-h-0 w-full max-w-[320px] min-w-0 flex-col overflow-hidden bg-[#0F241C] text-slate-900 shadow-[0_22px_54px_rgba(6,78,59,0.25)] rounded-[34px] border-[6px] sm:border-[7px] border-[#0F241C] ${
          topBarSlot
            ? 'h-[calc(100dvh-170px)] min-h-[430px] sm:h-[min(680px,calc(100dvh-145px))] sm:min-h-[520px]'
            : 'h-[calc(100dvh-125px)] min-h-[450px] sm:h-[min(700px,calc(100dvh-110px))] sm:min-h-[540px]'
        }`}
      >
        <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F4F8F6] rounded-[29px]">
          {/* Phone notch */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 z-[70] h-[19px] w-[88px] -translate-x-1/2 rounded-b-[13px] bg-[#0F241C]"
          />

          {/* Phone status bar */}
          <div
            className={`sticky top-0 z-[60] flex h-7 shrink-0 items-center justify-between px-4 text-[10px] font-semibold tracking-wide ${
              isBrowser ? 'bg-white text-slate-800' : 'bg-[#F4F8F6] text-[#064E3B]'
            }`}
          >
            <span className="font-mono tabular-nums">9:41</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px]">5G</span>
              <span aria-label="Full battery" className="inline-flex items-center gap-0.5">
                <span className="h-[8px] w-[15px] rounded-[2px] border border-current p-[1px]">
                  <span className="block h-full w-full rounded-[1px] bg-current" />
                </span>
                <span className="h-[3.5px] w-[1.5px] rounded-r-sm bg-current" />
              </span>
            </div>
          </div>

          {/* Mobile Browser Address Bar & Smart Banner (Website Mode) */}
          {browserConfig && (
            <div className="shrink-0 bg-white border-b border-slate-200 px-2.5 pb-2 pt-1 space-y-1.5 z-50">
              {browserConfig.onSwitchToApp && (
                <div className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2 py-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={`${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`}
                      alt="BusBite"
                      className="h-8 w-8 rounded-lg object-contain bg-white border border-emerald-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-emerald-950 truncate">BusBite App</div>
                      <div className="text-[8px] text-emerald-700 truncate">Works in mobile browser</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={browserConfig.onSwitchToApp}
                    className="px-2 py-0.5 rounded bg-emerald-800 text-white text-[9px] font-semibold shrink-0 hover:bg-emerald-900"
                  >
                    Open App
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0 flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                  <span className="text-[10px] font-mono text-slate-800 truncate flex-1">
                    {browserConfig.url}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={browserConfig.onRefresh}
                  aria-label="Reload page"
                  className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Scrollable App or Mobile Website Content */}
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y px-2.5 pt-1.5 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] ${
              isBrowser ? 'pb-14 bg-[#F8FBF9]' : 'pb-24'
            }`}
          >
            {isBrowser ? (
              /* Mobile Website Responsive Sticky Header & Web Nav */
              <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={`${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`}
                      alt="BusBite"
                      className="h-10 w-10 rounded-lg object-contain bg-white border border-emerald-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold text-emerald-950 truncate flex items-center gap-1">
                        {appName}
                        <span className="text-[8px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                          WEB
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">{subtitle}</div>
                    </div>
                  </div>
                  {onBellClick && (
                    <button
                      type="button"
                      onClick={onBellClick}
                      aria-label="Open web notifications"
                      className="relative h-7 w-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-700 text-white text-[8px] font-mono font-bold flex items-center justify-center">
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div
                  className="grid gap-1 border-t border-slate-100 pt-1.5"
                  style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`relative py-1 px-0.5 rounded-md text-[9px] font-semibold flex items-center justify-center gap-0.5 transition-colors min-w-0 ${
                          isActive
                            ? 'bg-emerald-800 text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                        }`}
                      >
                        <span className="truncate">{tab.label}</span>
                        {tab.badgeCount ? (
                          <span
                            className={`text-[8px] font-mono font-bold px-1 rounded-full shrink-0 ${
                              isActive ? 'bg-white text-emerald-900' : 'bg-emerald-700 text-white'
                            }`}
                          >
                            {tab.badgeCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Native Mobile App Header */
              <div className="flex items-center justify-between rounded-[16px] border border-white bg-white/95 px-2.5 py-2 shadow-[0_4px_14px_rgba(6,78,59,0.06)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-white border border-emerald-100 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {brandIcon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold tracking-tight text-emerald-950 truncate font-display">
                      {appName}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 truncate">{subtitle}</div>
                  </div>
                </div>

                {onBellClick && (
                  <button
                    type="button"
                    onClick={onBellClick}
                    aria-label="Open notifications"
                    className="relative h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-emerald-300 transition-colors shrink-0"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-700 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {children}

            {isBrowser && (
              <footer className="mt-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-center space-y-0.5">
                <div className="text-[10px] font-bold text-emerald-900">BusBite Mobile Web</div>
                <p className="text-[9px] text-slate-500">
                  Bus Tickets & Highway Food Pre-Order · Mobile Browser
                </p>
              </footer>
            )}
          </div>

          {overlay}

          {browserConfig ? (
            /* Mobile Browser Bottom Toolbar */
            <div className="absolute bottom-0 left-0 right-0 z-50 h-11 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 flex items-center justify-between text-slate-600">
              <button
                type="button"
                disabled={!browserConfig.canGoBack}
                onClick={browserConfig.onBack}
                aria-label="Browser back"
                className="p-1 rounded-lg disabled:opacity-30 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!browserConfig.canGoForward}
                onClick={browserConfig.onForward}
                aria-label="Browser forward"
                className="p-1 rounded-lg disabled:opacity-30 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={browserConfig.onSwitchToApp}
                aria-label="Switch to native app"
                className="p-1 rounded-lg hover:bg-slate-100 text-emerald-800"
              >
                <Share className="w-3.5 h-3.5" />
              </button>
              <div className="w-4 h-4 rounded border-[1.5px] border-slate-600 text-[9px] font-mono font-bold flex items-center justify-center">
                1
              </div>
              <button
                type="button"
                onClick={onBellClick}
                aria-label="Browser menu"
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Pinned Native Bottom Tab Bar optimized for 320px */
            <nav
              aria-label={`${appName} navigation`}
              className="absolute bottom-0 left-0 right-0 z-50 px-2 pb-2 pt-1.5 bg-gradient-to-t from-[#F4F8F6] via-[#F4F8F6]/95 to-transparent pointer-events-none"
            >
              <div
                className="grid gap-0.5 rounded-[18px] border border-white bg-white/95 px-1 py-1.5 shadow-[0_8px_24px_rgba(6,78,59,0.16)] backdrop-blur-xl pointer-events-auto"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange(tab.id)}
                      className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-0.5 text-[9px] font-bold transition-colors ${
                        isActive ? 'text-emerald-800' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span
                        className={`relative flex h-6 w-8 items-center justify-center rounded-lg transition-colors ${
                          isActive ? 'bg-emerald-50 ring-1 ring-emerald-200/70' : ''
                        }`}
                      >
                        {tab.icon}
                        {tab.badgeCount ? (
                          <span className="absolute -right-1 -top-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-700 text-white text-[8px] font-mono font-bold flex items-center justify-center">
                            {tab.badgeCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate max-w-full px-0.5">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
