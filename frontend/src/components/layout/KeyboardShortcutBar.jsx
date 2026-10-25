import { useLocation } from 'react-router-dom';
import { 
    Keyboard, ChevronDown, ChevronUp, X, Sparkles, HelpCircle 
} from 'lucide-react';
import { useKeyboardStore } from '../../store/keyboardStore';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';

export default function KeyboardShortcutBar() {
    const location = useLocation();
    const { 
        isShortcutsBarVisible, 
        isShortcutsBarMinimized, 
        toggleShortcutsBarMinimized, 
        openShortcutsModal, 
        toggleShortcutsBar 
    } = useKeyboardStore();
    const { themeMode } = useThemeStore();
    const isDark = themeMode === THEME_MODES.DARK;

    if (!isShortcutsBarVisible) return null;

    const isHub = location.pathname === '/' || location.pathname === '/hub';

    // Minimized Floating Pill in bottom-right corner
    if (isShortcutsBarMinimized) {
        return (
            <div className="no-print fixed bottom-3 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                    onClick={toggleShortcutsBarMinimized}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-bold transition-all hover:scale-105 cursor-pointer ${
                        isDark 
                            ? 'bg-slate-900/90 border-slate-700 text-sky-300 hover:bg-slate-800' 
                            : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100 shadow-slate-300/50'
                    }`}
                    title="Expand Keyboard Shortcuts Bar (or press ?)"
                >
                    <Keyboard size={14} className="text-blue-500" />
                    <span>Shortcuts Bar</span>
                    <kbd className="px-1 py-0.2 text-[10px] rounded border font-mono bg-black/5 dark:bg-white/10">?</kbd>
                    <ChevronUp size={13} className="text-slate-400" />
                </button>
            </div>
        );
    }

    return (
        <aside 
            aria-label="Keyboard Shortcuts Bar" 
            className="no-print fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] sm:max-w-max animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-xl backdrop-blur-md transition-all select-none ${
                isDark 
                    ? 'bg-[#0E1A2B]/95 border-slate-700/80 text-slate-200 shadow-slate-950/60' 
                    : 'bg-white/95 border-slate-300/90 text-slate-800 shadow-slate-400/30'
            }`}>
                {/* Brand / Mode badge */}
                <div 
                    onClick={openShortcutsModal}
                    className="flex items-center gap-1.5 pr-2 border-r border-slate-300 dark:border-slate-700/80 cursor-pointer group"
                    title="Open Full Shortcuts Guide (?)"
                >
                    <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-2xs group-hover:scale-110 transition-transform">
                        <Keyboard size={12} />
                    </div>
                    <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                        Keys
                    </span>
                </div>

                {/* Dynamic Shortcuts Pills based on view */}
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-medium">
                    {/* Navigation Arrow Keys */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">↑↓←→</kbd>
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                            {isHub ? 'Navigate Cards' : 'Rows / Scroll'}
                        </span>
                    </div>

                    {/* Enter / Open */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Enter ↵</kbd>
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">Open</span>
                    </div>

                    {/* Switch Tabs */}
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Alt+← / →</kbd>
                        <span className="text-slate-700 dark:text-slate-200">Tabs</span>
                    </div>

                    {/* Close Tab */}
                    <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Alt+W</kbd>
                        <span className="text-slate-700 dark:text-slate-200">Close</span>
                    </div>

                    {/* Search */}
                    <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">/</kbd>
                        <span className="text-slate-700 dark:text-slate-200">Search</span>
                    </div>

                    {/* Hub */}
                    <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Alt+H</kbd>
                        <span className="text-slate-700 dark:text-slate-200">Hub</span>
                    </div>

                    {/* Full guide trigger button */}
                    <button
                        onClick={openShortcutsModal}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-sky-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-sky-800 hover:bg-blue-100 dark:hover:bg-sky-900/60 transition cursor-pointer flex-shrink-0 font-bold"
                        title="Click to view all shortcuts"
                    >
                        <HelpCircle size={12} />
                        <span>All</span>
                        <kbd className="font-mono font-bold text-[10px] px-1 bg-white dark:bg-slate-700 border border-blue-300 dark:border-sky-700 rounded">?</kbd>
                    </button>
                </div>

                {/* Bar Controls: Minimize & Close */}
                <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-300 dark:border-slate-700/80">
                    <button
                        onClick={toggleShortcutsBarMinimized}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Minimize shortcuts bar"
                        aria-label="Minimize bar"
                    >
                        <ChevronDown size={14} />
                    </button>
                    <button
                        onClick={toggleShortcutsBar}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Hide shortcuts bar"
                        aria-label="Hide bar"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
