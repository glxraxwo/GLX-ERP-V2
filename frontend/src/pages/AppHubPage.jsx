import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, X, ArrowUpRight, Sparkles, 
    Layers, ShieldAlert, ChevronLeft, ChevronRight,
    LayoutGrid, ListFilter, Pin, PinOff, RotateCcw, Zap
} from 'lucide-react';
import { NAVIGATION_CATEGORIES } from '../config/navigationConfig';
import { usePermission } from '../hooks/usePermission';
import { useAuthStore } from '../store/authStore';
import { useTabStore } from '../store/tabStore';
import { useThemeStore, THEME_MODES } from '../store/themeStore';

const getCategoryThemeStyles = (catId, isDark) => {
    if (!isDark) {
        switch (catId) {
            case 'overview':
                return {
                    icon: 'bg-blue-50 text-blue-700 border-blue-200',
                    badge: 'bg-blue-50 text-blue-700 border-blue-200',
                    cardBorder: 'hover:border-blue-500/50',
                };
            case 'reports':
                return {
                    icon: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    cardBorder: 'hover:border-indigo-500/50',
                };
            case 'inventory':
                return {
                    icon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    cardBorder: 'hover:border-emerald-500/50',
                };
            case 'procurement':
                return {
                    icon: 'bg-amber-50 text-amber-700 border-amber-200',
                    badge: 'bg-amber-50 text-amber-700 border-amber-200',
                    cardBorder: 'hover:border-amber-500/50',
                };
            case 'finance':
                return {
                    icon: 'bg-violet-50 text-violet-700 border-violet-200',
                    badge: 'bg-violet-50 text-violet-700 border-violet-200',
                    cardBorder: 'hover:border-violet-500/50',
                };
            case 'sales':
                return {
                    icon: 'bg-sky-50 text-sky-700 border-sky-200',
                    badge: 'bg-sky-50 text-sky-700 border-sky-200',
                    cardBorder: 'hover:border-sky-500/50',
                };
            case 'production':
                return {
                    icon: 'bg-rose-50 text-rose-700 border-rose-200',
                    badge: 'bg-rose-50 text-rose-700 border-rose-200',
                    cardBorder: 'hover:border-rose-500/50',
                };
            case 'hr':
                return {
                    icon: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    cardBorder: 'hover:border-indigo-500/50',
                };
            case 'admin':
            default:
                return {
                    icon: 'bg-slate-100 text-slate-800 border-slate-300',
                    badge: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBorder: 'hover:border-slate-500/50',
                };
        }
    }

    // High-visibility vibrant colors for Dark Mode
    switch (catId) {
        case 'overview':
            return {
                icon: 'bg-blue-500/25 text-sky-300 border-blue-400/40 shadow-xs shadow-blue-500/20',
                badge: 'bg-blue-500/20 text-sky-200 border-blue-400/30',
                cardBorder: 'hover:border-sky-400',
            };
        case 'reports':
            return {
                icon: 'bg-indigo-500/25 text-indigo-300 border-indigo-400/40 shadow-xs shadow-indigo-500/20',
                badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
                cardBorder: 'hover:border-indigo-400',
            };
        case 'inventory':
            return {
                icon: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40 shadow-xs shadow-emerald-500/20',
                badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
                cardBorder: 'hover:border-emerald-400',
            };
        case 'procurement':
            return {
                icon: 'bg-amber-500/25 text-amber-300 border-amber-400/40 shadow-xs shadow-amber-500/20',
                badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
                cardBorder: 'hover:border-amber-400',
            };
        case 'finance':
            return {
                icon: 'bg-violet-500/25 text-violet-300 border-violet-400/40 shadow-xs shadow-violet-500/20',
                badge: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
                cardBorder: 'hover:border-violet-400',
            };
        case 'sales':
            return {
                icon: 'bg-cyan-500/25 text-cyan-300 border-cyan-400/40 shadow-xs shadow-cyan-500/20',
                badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
                cardBorder: 'hover:border-cyan-400',
            };
        case 'production':
            return {
                icon: 'bg-rose-500/25 text-rose-300 border-rose-400/40 shadow-xs shadow-rose-500/20',
                badge: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
                cardBorder: 'hover:border-rose-400',
            };
        case 'hr':
            return {
                icon: 'bg-indigo-500/25 text-indigo-300 border-indigo-400/40 shadow-xs shadow-indigo-500/20',
                badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
                cardBorder: 'hover:border-indigo-400',
            };
        case 'admin':
        default:
            return {
                icon: 'bg-slate-700/60 text-slate-200 border-slate-500/50 shadow-xs',
                badge: 'bg-slate-700/50 text-slate-200 border-slate-600',
                cardBorder: 'hover:border-slate-400',
            };
    }
};

export default function AppHubPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasPermission, hasAnyPermission, isAdmin } = usePermission();
    const { 
        openTab, 
        hubCategory, 
        setHubCategory, 
        hubSearchQuery, 
        setHubSearchQuery, 
        hubScrollPosition, 
        setHubScrollPosition 
    } = useTabStore();
    const { themeMode } = useThemeStore();

    const isDark = themeMode === THEME_MODES.DARK;
    const isSoft = themeMode === THEME_MODES.SOFT;

    const categoryScrollRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftStartRef = useRef(0);
    const dragDistanceRef = useRef(0);

    // Multi-row wrap vs Single-row horizontal scroll toggle
    const [isWrapped, setIsWrapped] = useState(() => {
        return localStorage.getItem('hub_categories_wrapped') === 'true';
    });

    // Default pinned modules for fast 1-click access
    const DEFAULT_PINNED_PATHS = ['/invoices', '/customers', '/pos'];

    // Pinned shortcuts persisted in localStorage
    const [pinnedPaths, setPinnedPaths] = useState(() => {
        try {
            const saved = localStorage.getItem('glx_apphub_pinned_paths');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Failed to load pinned paths', e);
        }
        return DEFAULT_PINNED_PATHS;
    });

    const togglePin = (path, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setPinnedPaths(prev => {
            const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
            try {
                localStorage.setItem('glx_apphub_pinned_paths', JSON.stringify(next));
            } catch (err) {
                console.error('Failed to save pinned paths', err);
            }
            return next;
        });
    };

    const handleResetPinned = () => {
        setPinnedPaths(DEFAULT_PINNED_PATHS);
        try {
            localStorage.setItem('glx_apphub_pinned_paths', JSON.stringify(DEFAULT_PINNED_PATHS));
        } catch (err) {
            console.error('Failed to reset pinned paths', err);
        }
    };

    const toggleWrap = () => {
        setIsWrapped(prev => {
            const next = !prev;
            localStorage.setItem('hub_categories_wrapped', String(next));
            return next;
        });
    };

    const scrollCategories = (direction) => {
        if (!categoryScrollRef.current) return;
        const amount = direction === 'left' ? -220 : 220;
        categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    // Pointer / mouse / touch drag-to-scroll handlers
    const handlePointerDown = (e) => {
        if (!categoryScrollRef.current) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isDraggingRef.current = true;
        startXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
        scrollLeftStartRef.current = categoryScrollRef.current.scrollLeft;
        dragDistanceRef.current = 0;
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current || !categoryScrollRef.current || isWrapped) return;
        const x = e.pageX - categoryScrollRef.current.offsetLeft;
        const walk = x - startXRef.current;
        dragDistanceRef.current = Math.abs(walk);
        if (dragDistanceRef.current > 3) {
            categoryScrollRef.current.scrollLeft = scrollLeftStartRef.current - walk;
        }
    };

    const handlePointerUpOrLeave = () => {
        isDraggingRef.current = false;
        setTimeout(() => {
            dragDistanceRef.current = 0;
        }, 80);
    };

    // Enable horizontal mouse wheel scroll on category bar
    useEffect(() => {
        const el = categoryScrollRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            if (isWrapped) return;
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [isWrapped]);

    // Restore scroll position when returning to App Hub
    useEffect(() => {
        const mainEl = document.getElementById('main-content');
        if (mainEl && hubScrollPosition > 0) {
            const timer = setTimeout(() => {
                mainEl.scrollTop = hubScrollPosition;
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [hubScrollPosition]);

    const handleCategorySelect = (catId, e) => {
        // If user was dragging/swiping to scroll, ignore the click
        if (dragDistanceRef.current > 5) {
            return;
        }

        setHubCategory(catId);
        setHubScrollPosition(0);
        const mainEl = document.getElementById('main-content');
        if (mainEl) mainEl.scrollTop = 0;

        // Smooth scroll the clicked button into view if in scrollable mode
        if (e && e.currentTarget && categoryScrollRef.current) {
            e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    };

    // Filter categories and items based on role, permissions & search query
    const filteredCategories = useMemo(() => {
        return NAVIGATION_CATEGORIES.map((category) => {
            // Role restriction checks
            if (category.adminOnly && !isAdmin) return null;
            if (user?.role === 'employee' && category.id !== 'overview' && category.id !== 'hr') {
                return null;
            }

            const visibleItems = category.items.filter((item) => {
                // Role exclusions
                if (item.excludeRoles && item.excludeRoles.includes(user?.role)) {
                    return false;
                }

                // Permission checks
                const isPermitted = isAdmin ||
                    (!item.permission && !item.anyPermission) ||
                    (item.permission && hasPermission(item.permission)) ||
                    (item.anyPermission && hasAnyPermission(item.anyPermission));

                if (!isPermitted) return false;

                // Search query match
                if (!hubSearchQuery.trim()) return true;

                const q = hubSearchQuery.toLowerCase();
                return (
                    item.title.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q) ||
                    category.label.toLowerCase().includes(q)
                );
            });

            if (visibleItems.length === 0) return null;

            return {
                ...category,
                items: visibleItems
            };
        }).filter(Boolean);
    }, [isAdmin, user?.role, hasPermission, hasAnyPermission, hubSearchQuery]);

    // Categories to display based on selected category tab
    const displayedCategories = useMemo(() => {
        if (hubCategory === 'all') return filteredCategories;
        return filteredCategories.filter(c => c.id === hubCategory);
    }, [filteredCategories, hubCategory]);

    // Calculate total accessible cards
    const totalVisibleCards = useMemo(() => {
        return filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
    }, [filteredCategories]);

    // Catalog map to retrieve pinned items with proper category info
    const allItemsMap = useMemo(() => {
        const map = new Map();
        NAVIGATION_CATEGORIES.forEach(cat => {
            cat.items.forEach(item => {
                map.set(item.path, {
                    ...item,
                    categoryId: cat.id,
                    categoryLabel: cat.label
                });
            });
        });
        return map;
    }, []);

    // Filter pinned items by user permissions & role
    const pinnedItems = useMemo(() => {
        return pinnedPaths.map(path => {
            const item = allItemsMap.get(path);
            if (!item) return null;

            if (item.excludeRoles && item.excludeRoles.includes(user?.role)) return null;
            const isPermitted = isAdmin ||
                (!item.permission && !item.anyPermission) ||
                (item.permission && hasPermission(item.permission)) ||
                (item.anyPermission && hasAnyPermission(item.anyPermission));

            if (!isPermitted) return null;
            return item;
        }).filter(Boolean);
    }, [pinnedPaths, allItemsMap, user?.role, isAdmin, hasPermission, hasAnyPermission]);

    const handleCardClick = (item) => {
        // Save current scroll position before leaving App Hub
        const mainEl = document.getElementById('main-content');
        if (mainEl) {
            setHubScrollPosition(mainEl.scrollTop);
        }

        openTab({
            path: item.path,
            title: item.title,
            iconName: item.category,
            closable: true
        });
        navigate(item.path);
    };

    // Greeting according to time of day
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fadeIn">
            {/* ── Top Hero / Welcome Banner ── */}
            <div className={`p-6 sm:p-8 rounded-2xl border transition-all duration-200 relative overflow-hidden shadow-xs ${
                isDark 
                    ? 'bg-[#0F1E33] border-slate-700/80 text-white' 
                    : isSoft
                        ? 'bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border-slate-300/80 text-slate-900'
                        : 'bg-gradient-to-br from-white via-sky-50/30 to-blue-50/50 border-slate-200 text-slate-900'
            }`}>
                {/* Decorative background glow */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-1/3 -bottom-16 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            isDark 
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' 
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        }`}>
                            <Sparkles size={13} className="animate-pulse" />
                            <span>GLX Application Portal</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            {greeting}, <span className={isDark ? 'text-sky-400' : 'text-[#000865]'}>{user?.fullName || user?.firstName || 'User'}</span>
                        </h1>
                        <p className={`text-xs sm:text-sm font-normal max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            Select any module below to open it in a tab at the top. You can filter by category or search directly for quick access.
                        </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border flex-shrink-0 ${
                        isDark ? 'bg-[#16273F] border-slate-700' : 'bg-white/80 border-slate-200/80 shadow-2xs'
                    }`}>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Accessible Modules</p>
                            <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-sky-400' : 'text-[#000865]'}`}>{totalVisibleCards}</p>
                        </div>
                        <div className={`h-8 w-[1px] ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">User Role</p>
                            <p className="text-xs sm:text-sm font-semibold text-emerald-500 capitalize">{user?.role?.replace('_', ' ') || 'Staff'}</p>
                        </div>
                    </div>
                </div>

                {/* ── Search Bar inside Banner ── */}
                <div className="mt-6 relative max-w-2xl">
                    <Search className={`absolute left-4 top-3.5 h-4 w-4 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        value={hubSearchQuery}
                        onChange={(e) => setHubSearchQuery(e.target.value)}
                        placeholder="Search modules, actions or features (e.g. Products, Invoices, Employees, Payroll)..."
                        className={`w-full pl-11 pr-10 py-3 rounded-xl text-sm font-medium outline-none transition-all ${
                            isDark
                                ? 'bg-[#16273F] border border-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400'
                                : 'bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#000865]/20 focus:border-[#000865] shadow-xs'
                        }`}
                    />
                    {hubSearchQuery && (
                        <button
                            onClick={() => setHubSearchQuery('')}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Quick Access Bar (Top-up / Pinned Shortcuts) ── */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-xs ${
                isDark
                    ? 'bg-[#0E1A2B] border-slate-700/80'
                    : isSoft
                        ? 'bg-gradient-to-r from-white via-slate-50 to-amber-50/20 border-slate-200'
                        : 'bg-white border-slate-200'
            }`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                            <Pin size={15} className="rotate-45" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Quick Access Bar
                                </h2>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isDark 
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {pinnedItems.length} Pinned
                                </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Fast 1-click access to essential modules. Click 📌 on any module below to top-up here.
                            </p>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {pinnedPaths.length !== DEFAULT_PINNED_PATHS.length && (
                            <button
                                type="button"
                                onClick={handleResetPinned}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                    isDark 
                                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Restore recommended shortcuts (Invoices, Quotations & Estimates, Customers, POS)"
                            >
                                <RotateCcw size={12} />
                                <span>Reset Defaults</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Body: Pinned Cards */}
                {pinnedItems.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No shortcuts pinned yet. Click the <span className="font-bold text-amber-500">📌 Pin</span> icon on any module below to top-up here for quick access.
                        </p>
                        <button
                            type="button"
                            onClick={handleResetPinned}
                            className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                            <Pin size={13} className="rotate-45" />
                            <span>Add Recommended Shortcuts</span>
                        </button>
                    </div>
                ) : (
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {pinnedItems.map((item) => {
                            const IconComponent = item.icon;
                            const themeStyles = getCategoryThemeStyles(item.categoryId, isDark);
                            return (
                                <div
                                    key={item.path}
                                    onClick={() => handleCardClick(item)}
                                    className={`group relative p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between gap-3 ${
                                        isDark
                                            ? `bg-[#132238] border-slate-700/80 ${themeStyles.cardBorder} hover:bg-[#182C48]`
                                            : `bg-slate-50/80 border-slate-200/90 ${themeStyles.cardBorder} hover:bg-white hover:border-slate-300`
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform duration-200 group-hover:scale-105 ${themeStyles.icon}`}>
                                            <IconComponent size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={`text-xs sm:text-[13px] font-bold truncate leading-snug transition-colors ${
                                                isDark ? 'text-white group-hover:text-sky-300' : 'text-slate-900 group-hover:text-[#000865]'
                                            }`}>
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] font-medium text-slate-400 capitalize truncate block">
                                                {item.categoryLabel || item.categoryId}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Unpin button */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => togglePin(item.path, e)}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                isDark 
                                                    ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' 
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-slate-200/60'
                                            }`}
                                            title="Remove from Quick Access"
                                            aria-label="Remove pin"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className={`p-1 rounded-md opacity-60 group-hover:opacity-100 transition-opacity ${
                                            isDark ? 'text-sky-300' : 'text-[#000865]'
                                        }`}>
                                            <ArrowUpRight size={13} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Category Filter Pills with Mobile Arrows, Drag-to-Scroll & Wrap Toggle ── */}
            <div className="w-full max-w-full min-w-0 flex items-center gap-1 sm:gap-2">
                {/* Left scroll arrow button (visible on all screens including mobile) */}
                {!isWrapped && (
                    <button
                        type="button"
                        onClick={() => scrollCategories('left')}
                        className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                            isDark
                                ? 'bg-[#132238] border-slate-700 text-slate-300 hover:bg-[#1A2E4C] hover:text-white active:scale-95'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs active:scale-95'
                        }`}
                        title="Scroll categories left"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={15} />
                    </button>
                )}

                {/* Categories container with touch & pointer drag support */}
                <div 
                    ref={categoryScrollRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUpOrLeave}
                    onPointerCancel={handlePointerUpOrLeave}
                    style={{ 
                        WebkitOverflowScrolling: 'touch', 
                        touchAction: 'pan-x pan-y',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                    className={`pb-1 select-none ${
                        isWrapped 
                            ? 'flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1' 
                            : 'flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap flex-1 min-w-0 cursor-grab active:cursor-grabbing'
                    }`}
                >
                    <button
                        onClick={(e) => handleCategorySelect('all', e)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 cursor-pointer whitespace-nowrap ${
                            hubCategory === 'all'
                                ? (isDark ? 'bg-sky-600 text-white shadow-md' : 'bg-[#000865] text-white shadow-sm ring-1 ring-[#000865]/20')
                                : (isDark
                                    ? 'bg-[#132238] text-slate-200 hover:bg-[#1A2E4C] hover:text-white border border-slate-700'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200')
                        }`}
                    >
                        <Layers size={13} className="flex-shrink-0" />
                        <span className="hidden sm:inline">All Categories</span>
                        <span className="sm:hidden">All</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            hubCategory === 'all' 
                                ? 'bg-white/20 text-white font-bold' 
                                : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')
                        }`}>
                            {totalVisibleCards}
                        </span>
                    </button>

                    {filteredCategories.map((cat) => {
                        const isSelected = hubCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={(e) => handleCategorySelect(cat.id, e)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 cursor-pointer whitespace-nowrap ${
                                    isSelected
                                        ? (isDark ? 'bg-sky-600 text-white shadow-md' : 'bg-[#000865] text-white shadow-sm ring-1 ring-[#000865]/20')
                                        : (isDark
                                            ? 'bg-[#132238] text-slate-200 hover:bg-[#1A2E4C] hover:text-white border border-slate-700'
                                            : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200')
                                }`}
                            >
                                <span className="hidden sm:inline">{cat.label}</span>
                                <span className="sm:hidden">{cat.shortLabel || cat.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isSelected 
                                        ? 'bg-white/20 text-white font-bold' 
                                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')
                                }`}>
                                    {cat.items.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right scroll arrow button (visible on all screens including mobile) */}
                {!isWrapped && (
                    <button
                        type="button"
                        onClick={() => scrollCategories('right')}
                        className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                            isDark
                                ? 'bg-[#132238] border-slate-700 text-slate-300 hover:bg-[#1A2E4C] hover:text-white active:scale-95'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs active:scale-95'
                        }`}
                        title="Scroll categories right"
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={15} />
                    </button>
                )}

                {/* Wrap Toggle Button (visible on mobile too as an icon button) */}
                <button
                    type="button"
                    onClick={toggleWrap}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl border flex-shrink-0 text-xs font-bold transition-all cursor-pointer ${
                        isWrapped
                            ? (isDark ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-blue-50 text-blue-700 border-blue-300')
                            : (isDark ? 'bg-[#132238] text-slate-400 border-slate-700 hover:text-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 shadow-xs')
                    }`}
                    title={isWrapped ? "Switch to horizontal scroll" : "Wrap all categories into multiple rows"}
                >
                    {isWrapped ? <ListFilter size={14} /> : <LayoutGrid size={14} />}
                    <span className="hidden sm:inline">{isWrapped ? 'Collapse' : 'Show All'}</span>
                </button>
            </div>

            {/* ── Category Modules Sections & Cards ── */}
            {displayedCategories.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border ${
                    isDark ? 'bg-[#111F33] border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    <ShieldAlert size={36} className="mx-auto text-slate-400 mb-3" />
                    <h3 className={`text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>No matching modules found</h3>
                    <p className="text-xs text-slate-400 mt-1">Try searching with a different keyword or choose "All Categories".</p>
                    {hubSearchQuery && (
                        <button
                            onClick={() => setHubSearchQuery('')}
                            className={`mt-4 px-4 py-2 text-white rounded-xl text-xs font-bold transition ${
                                isDark ? 'bg-sky-600 hover:bg-sky-500' : 'bg-[#000865] hover:bg-[#000865]/90'
                            }`}
                        >
                            Clear Search
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {displayedCategories.map((category) => {
                        const themeStyles = getCategoryThemeStyles(category.id, isDark);

                        return (
                            <div key={category.id} className="space-y-3.5">
                                {/* Section Header */}
                                <div className={`flex items-center justify-between pb-1.5 border-b ${
                                    isDark ? 'border-slate-700/80' : 'border-slate-200/80'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                                            isDark ? 'text-slate-200' : 'text-slate-800'
                                        }`}>
                                            {category.label}
                                        </h2>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${themeStyles.badge}`}>
                                            {category.badge}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {category.items.length} {category.items.length === 1 ? 'module' : 'modules'}
                                    </span>
                                </div>

                                {/* Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {category.items.map((item) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <div
                                                key={item.path}
                                                onClick={() => handleCardClick(item)}
                                                className={`group relative p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                                                    isDark
                                                        ? `bg-[#152338] border-slate-700 ${themeStyles.cardBorder} hover:bg-[#1A2D48] shadow-sm`
                                                        : isSoft
                                                            ? `bg-white border-slate-200 ${themeStyles.cardBorder} hover:shadow-slate-300/40`
                                                            : `bg-white border-slate-200 ${themeStyles.cardBorder} hover:shadow-slate-200`
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Icon container */}
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 border ${themeStyles.icon}`}>
                                                        <IconComponent size={22} />
                                                    </div>

                                                    {/* Actions: Pin/Top-up button + Open in tab indicator */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => togglePin(item.path, e)}
                                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                                pinnedPaths.includes(item.path)
                                                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-2xs hover:bg-amber-500/25'
                                                                    : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-400 hover:text-amber-500'
                                                            }`}
                                                            title={pinnedPaths.includes(item.path) ? "Pinned in Quick Access Bar (Click to unpin)" : "Top-up to Quick Access Bar (Pin)"}
                                                            aria-label="Toggle pin"
                                                        >
                                                            <Pin size={14} className={pinnedPaths.includes(item.path) ? "fill-amber-500 rotate-45" : ""} />
                                                        </button>
                                                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${
                                                            isDark ? 'bg-slate-700/80 text-sky-300' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            <ArrowUpRight size={14} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Content - Clean, elegant bold typography */}
                                                <div className="mt-4 space-y-1.5">
                                                    <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors line-clamp-1 ${
                                                        isDark 
                                                            ? 'text-white group-hover:text-sky-300' 
                                                            : 'text-slate-900 group-hover:text-[#000865]'
                                                    }`}>
                                                        {item.title}
                                                    </h3>
                                                    <p className={`text-xs line-clamp-2 leading-relaxed font-normal ${
                                                        isDark ? 'text-slate-300' : 'text-slate-600'
                                                    }`}>
                                                        {item.description}
                                                    </p>
                                                </div>

                                                {/* Card Footer action bar */}
                                                <div className={`mt-3.5 pt-2.5 border-t flex items-center justify-between text-xs font-semibold transition-colors ${
                                                    isDark 
                                                        ? 'border-slate-700/80 text-sky-400 group-hover:text-sky-300' 
                                                        : 'border-slate-100 text-slate-500 group-hover:text-[#000865]'
                                                }`}>
                                                    <span>Open Tab</span>
                                                    <span className="font-mono text-[11px] opacity-70">↵</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
