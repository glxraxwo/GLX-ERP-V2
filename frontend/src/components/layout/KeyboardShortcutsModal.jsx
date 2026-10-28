import { useEffect } from 'react';
import { 
    Keyboard, X, CornerDownLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Search, LayoutGrid, Palette, Bell, FileText, CheckCircle2, Command
} from 'lucide-react';
import { useKeyboardStore } from '../../store/keyboardStore';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';

export default function KeyboardShortcutsModal() {
    const { isShortcutsModalOpen, closeShortcutsModal } = useKeyboardStore();
    const { themeMode } = useThemeStore();
    const isDark = themeMode === THEME_MODES.DARK;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isShortcutsModalOpen) {
                closeShortcutsModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isShortcutsModalOpen, closeShortcutsModal]);

    if (!isShortcutsModalOpen) return null;

    const sections = [
        {
            title: 'Arrow Navigation (ඊතල මඟින් පාලනය)',
            badge: 'Core Feature',
            color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
            shortcuts: [
                {
                    keys: ['↑', '↓', '←', '→'],
                    action: 'Navigate Modules & Cards',
                    sinhala: 'App Hub හි කාඩ්පත් අතර 2D ජාලකය ඔස්සේ ගමන් කිරීම',
                },
                {
                    keys: ['Enter ↵'],
                    action: 'Open Focused Module / Tab',
                    sinhala: 'තේරූ මොඩියුලය හෝ කාඩ්පත නව ටැබ් එකකින් විවෘත කිරීම',
                },
                {
                    keys: ['↑', '↓'],
                    action: 'Table Row Navigation',
                    sinhala: 'වගු (Tables) වල පේළි අතර ඉහළට/පහළට ගමන් කිරීම',
                },
                {
                    keys: ['Enter ↵'],
                    action: 'Open Table Row Details',
                    sinhala: 'වගුවේ තේරූ පේළියේ විස්තර (View/Edit) විවෘත කිරීම',
                },
                {
                    keys: ['Shift', '← / →'],
                    altKeys: ['[', ']'],
                    action: 'Switch Category in App Hub',
                    sinhala: 'App Hub හි කාණ්ඩ (Categories) මාරු කිරීම',
                },
            ]
        },
        {
            title: 'Tab Bar Management (ටැබ් කළමනාකරණය)',
            badge: 'Multi-Tab',
            color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
            shortcuts: [
                {
                    keys: ['Alt', '→'],
                    altKeys: ['Alt', ']'],
                    action: 'Next Tab',
                    sinhala: 'ඊළඟ ටැබ් එකට මාරු වීම',
                },
                {
                    keys: ['Alt', '←'],
                    altKeys: ['Alt', '['],
                    action: 'Previous Tab',
                    sinhala: 'පෙර ටැබ් එකට මාරු වීම',
                },
                {
                    keys: ['Alt', 'W'],
                    action: 'Close Active Tab',
                    sinhala: 'දැනට විවෘතව ඇති ටැබ් එක වැසීම',
                },
                {
                    keys: ['Alt', 'H'],
                    action: 'Go to App Hub (Home)',
                    sinhala: 'ප්‍රධාන පාලක පුවරුව (App Hub) වෙත යෑම',
                },
                {
                    keys: ['Alt', 'Shift', 'W'],
                    action: 'Close Other Tabs',
                    sinhala: 'අනෙකුත් සියලු ටැබ් එකවර වැසීම',
                },
            ]
        },
        {
            title: 'Quick Access & Global Actions (ක්ෂණික ක්‍රියා)',
            badge: 'Global',
            color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
            shortcuts: [
                {
                    keys: ['/'],
                    altKeys: ['Ctrl', 'K'],
                    action: 'Quick Search / Focus Filter',
                    sinhala: 'ක්ෂණිකව සෙවුම් තීරුව (Search) වෙත යෑම',
                },
                {
                    keys: ['Esc'],
                    action: 'Cancel / Close Modal / Deselect',
                    sinhala: 'විවෘත සංවාද කවුළු වැසීම / තේරීමෙන් ඉවත් වීම',
                },
                {
                    keys: ['?'],
                    altKeys: ['F1'],
                    action: 'Show / Hide Shortcuts Guide',
                    sinhala: 'මෙම යතුරුපුවරු කෙටිමං උපකාරකය විවෘත කිරීම',
                },
                {
                    keys: ['Alt', 'T'],
                    action: 'Toggle Theme Tone',
                    sinhala: 'පසුබිම් වර්ණ තේමාව මාරු කිරීම (Soft / Crisp / Dark)',
                },
                {
                    keys: ['Alt', 'N'],
                    action: 'Open Notifications',
                    sinhala: 'දැනුම්දීම් පුවරුව (Notifications) පෙන්වීම',
                },
            ]
        }
    ];

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
        >
            <div 
                className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                    isDark 
                        ? 'bg-[#0E1A2B] border-slate-700 text-white' 
                        : 'bg-white border-slate-200 text-slate-800'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between flex-shrink-0 ${
                    isDark ? 'bg-[#132238] border-slate-700/80' : 'bg-slate-50 border-slate-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Keyboard size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold tracking-tight">System Keyboard Shortcuts</h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Full Keyboard Control
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                සම්පූර්ණ පද්ධතියම මවුසයකින් තොරව යතුරුපුවරුවෙන් (Arrow Keys) හැසිරවීමේ උපදෙස්
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeShortcutsModal}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                            isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                        }`}
                        title="Close (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <span>{section.title}</span>
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${section.color}`}>
                                    {section.badge}
                                </span>
                            </div>

                            <div className={`divide-y rounded-xl border overflow-hidden ${
                                isDark ? 'divide-slate-700/80 border-slate-700/80 bg-[#122136]' : 'divide-slate-200/80 border-slate-200 bg-slate-50/50'
                            }`}>
                                {section.shortcuts.map((sc, scIdx) => (
                                    <div 
                                        key={scIdx}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 transition hover:bg-black/5 dark:hover:bg-white/5`}
                                    >
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                                                {sc.action}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {sc.sinhala}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0 self-start sm:self-center">
                                            {sc.keys.map((k, kIdx) => (
                                                <kbd 
                                                    key={kIdx}
                                                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold shadow-xs border transition ${
                                                        isDark 
                                                            ? 'bg-slate-800 border-slate-600 text-sky-300' 
                                                            : 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                                                    }`}
                                                >
                                                    {k}
                                                </kbd>
                                            ))}

                                            {sc.altKeys && (
                                                <>
                                                    <span className="text-xs text-slate-400 font-medium px-0.5">or</span>
                                                    {sc.altKeys.map((ak, akIdx) => (
                                                        <kbd 
                                                            key={akIdx}
                                                            className={`px-2 py-1 rounded-md text-xs font-mono font-bold shadow-xs border transition ${
                                                                isDark 
                                                                    ? 'bg-slate-800 border-slate-600 text-sky-300' 
                                                                    : 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                                                            }`}
                                                        >
                                                            {ak}
                                                        </kbd>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className={`px-5 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0 ${
                    isDark ? 'bg-[#132238] border-slate-700/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        <span>යතුරුපුවරුවේ <kbd className="px-1.5 py-0.5 rounded border font-mono font-bold mx-0.5">Esc</kbd> ඔබා ඕනෑම මොහොතක මෙය වසා දැමිය හැක.</span>
                    </div>
                    <button
                        onClick={closeShortcutsModal}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition text-white ${
                            isDark ? 'bg-sky-600 hover:bg-sky-500' : 'bg-[#000865] hover:bg-[#000865]/90'
                        }`}
                    >
                        Got it (තේරුම් ගත්තා)
                    </button>
                </div>
            </div>
        </div>
    );
}
