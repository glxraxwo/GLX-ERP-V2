import { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Package, FileText } from 'lucide-react';

const SearchableSelect = forwardRef(({
    label,
    error,
    required = false,
    options = [],
    value = '',
    onChange,
    onSelect,
    onKeyDown,
    triggerRef,
    autoFocus = false,
    placeholder = 'Select product...',
    className = '',
    triggerClassName = '',
    helperText,
    disabled = false,
    name,
    onBlur,
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Bind ref & triggerRef to input element
    const setCombinedRef = (node) => {
        inputRef.current = node;
        if (triggerRef) {
            if (typeof triggerRef === 'function') {
                triggerRef(node);
            } else {
                triggerRef.current = node;
            }
        }
        if (ref) {
            if (typeof ref === 'function') {
                ref(node);
            } else {
                ref.current = node;
            }
        }
    };

    // Find current selected option object
    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value)) || null;
    }, [options, value]);

    // Reset typing state when selected value changes from outside
    useEffect(() => {
        setIsTyping(false);
        setSearchTerm('');
    }, [value]);

    // Filter options based on multi-word search query (searches label, sinhala name, code, sku, subtext, description, value anywhere in name)
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter(Boolean);

        const nameMatches = [];
        const otherMatches = [];

        for (const opt of options) {
            const labelStr = String(opt.label || '').toLowerCase();
            const sinhalaStr = String(opt.sinhalaName || '').toLowerCase();
            const subtextStr = String(opt.subtext || '').toLowerCase();
            const codeStr = String(opt.productCode || opt.code || '').toLowerCase();
            const skuStr = String(opt.sku || '').toLowerCase();

            const nameCombined = `${labelStr} ${sinhalaStr} ${subtextStr}`;
            const isNameMatch = tokens.every((token) => nameCombined.includes(token));

            if (isNameMatch) {
                nameMatches.push(opt);
            } else {
                const idCombined = `${nameCombined} ${codeStr} ${skuStr}`;
                if (tokens.every((token) => idCombined.includes(token))) {
                    otherMatches.push(opt);
                }
            }
        }

        return [...nameMatches, ...otherMatches];
    }, [options, searchTerm]);

    const highlightedOption = filteredOptions[highlightedIndex] || null;
    const hasAnyDescription = useMemo(() => {
        return filteredOptions.some((opt) => Boolean(opt.description));
    }, [filteredOptions]);

    // Ensure highlightedIndex stays in bounds
    useEffect(() => {
        if (highlightedIndex >= filteredOptions.length) {
            setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
        }
    }, [filteredOptions.length, highlightedIndex]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsTyping(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input on autoFocus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const el = listRef.current.children[highlightedIndex];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (opt) => {
        const selectedVal = opt ? opt.value : '';
        if (onChange) {
            const fakeEvent = {
                target: {
                    name: name || props.id,
                    value: selectedVal,
                },
            };
            onChange(fakeEvent);
        }
        setIsOpen(false);
        setIsTyping(false);
        setSearchTerm('');
        if (onSelect) {
            onSelect(opt);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        handleSelect(null);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 30);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsTyping(true);
        setIsOpen(true);
        setHighlightedIndex(0);
    };

    const handleInputFocus = (e) => {
        if (selectedOption) {
            e.target.select();
        }
    };

    const handleInputClick = () => {
        if (disabled) return;
        if (!isOpen) {
            setIsOpen(true);
            setIsTyping(false);
            setSearchTerm('');
            const idx = options.findIndex((opt) => String(opt.value) === String(value));
            setHighlightedIndex(idx >= 0 ? idx : 0);
        }
    };

    const handleKeyDown = (e) => {
        if (isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                setIsTyping(false);
                setSearchTerm('');
                return;
            } else if (e.key === 'Tab') {
                setIsOpen(false);
                setIsTyping(false);
                setSearchTerm('');
                return;
            }
        } else {
            // Dropdown is closed
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setIsTyping(false);
                setSearchTerm('');
                const idx = options.findIndex((opt) => String(opt.value) === String(value));
                setHighlightedIndex(idx >= 0 ? idx : 0);
                return;
            }
        }

        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    const handleChevronClick = (e) => {
        e.stopPropagation();
        if (disabled) return;
        if (!isOpen) {
            setIsOpen(true);
            setIsTyping(false);
            setSearchTerm('');
            const idx = options.findIndex((opt) => String(opt.value) === String(value));
            setHighlightedIndex(idx >= 0 ? idx : 0);
            inputRef.current?.focus();
        } else {
            setIsOpen(false);
            setIsTyping(false);
            setSearchTerm('');
        }
    };

    const displayValue = isTyping
        ? searchTerm
        : selectedOption
            ? selectedOption.label
            : '';

    return (
        <div className={`w-full relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            {/* Combobox Input Trigger */}
            <div
                className={`w-full border rounded-lg flex items-center text-sm transition-all min-h-[40px]
                    ${triggerClassName ? triggerClassName : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700'}
                    ${disabled ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-200 dark:border-slate-700' : 'hover:border-gray-400 dark:hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30'}
                    ${error
                        ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-200 focus-within:border-red-500 bg-red-50/20 dark:bg-red-950/20'
                        : isOpen
                            ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-xs'
                            : ''
                    }`}
            >
                <div className="pl-3 pr-1 text-gray-400 dark:text-slate-500 pointer-events-none shrink-0">
                    <Search size={15} />
                </div>

                <input
                    ref={setCombinedRef}
                    type="text"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    className="w-full h-9 px-2 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none font-medium truncate"
                    autoComplete="off"
                    spellCheck="false"
                />

                <div className="flex items-center gap-1 pr-2.5 shrink-0">
                    {(value || searchTerm) && !disabled && (
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled}
                        onClick={handleChevronClick}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title={isOpen ? "Close dropdown" : "Show options"}
                    >
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
                        />
                    </button>
                </div>
            </div>

            {/* Hidden native input for form compatibility */}
            <input
                type="hidden"
                name={name}
                value={value || ''}
                {...props}
            />

            {/* Dropdown Popover */}
            {isOpen && !disabled && (
                <div className={`absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-[280px]`}>
                    <div className={hasAnyDescription ? "grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-800" : ""}>
                        {/* Options List Column */}
                        <div className={hasAnyDescription ? "md:col-span-7 flex flex-col min-w-0" : "w-full"}>
                            <div
                                ref={listRef}
                                className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800 p-1"
                            >
                                {filteredOptions.length === 0 ? (
                                    <div className="py-6 px-4 text-center text-xs text-gray-400 dark:text-slate-500 space-y-1">
                                        <Package size={20} className="mx-auto text-gray-300 dark:text-slate-600 mb-1" />
                                        <p className="font-semibold text-gray-600 dark:text-slate-300">No matching items found</p>
                                        <p className="text-[11px] text-gray-400 dark:text-slate-500">Try typing a different name, code or keyword</p>
                                    </div>
                                ) : (
                                    filteredOptions.map((opt, idx) => {
                                        const isSelected = String(opt.value) === String(value);
                                        const isHighlighted = idx === highlightedIndex;

                                        return (
                                            <div
                                                key={opt.value || idx}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                onClick={() => handleSelect(opt)}
                                                className={`px-3 py-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-all select-none
                                                    ${isHighlighted
                                                        ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-700'
                                                        : isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-semibold border-l-4 border-blue-600'
                                                            : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80'
                                                    }
                                                `}
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span className="truncate">{opt.label}</span>
                                                    </div>
                                                    {opt.subtext && (
                                                        <div className={`text-[11px] font-mono mt-0.5 truncate ${
                                                            isHighlighted
                                                                ? 'text-blue-100'
                                                                : isSelected
                                                                    ? 'text-blue-600/80 dark:text-blue-400/80'
                                                                    : 'text-gray-400 dark:text-slate-400'
                                                        }`}>
                                                            {opt.subtext}
                                                        </div>
                                                    )}
                                                </div>

                                                {isSelected && (
                                                    <Check
                                                        size={15}
                                                        className={`shrink-0 ml-2 ${isHighlighted ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer count indicator */}
                            <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-700 text-[10px] text-gray-400 dark:text-slate-500 flex items-center justify-between">
                                <span>{filteredOptions.length} of {options.length} options</span>
                                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">Use ↑↓ &amp; Enter to select</span>
                            </div>
                        </div>

                        {/* Side Description & Specifications Panel */}
                        {hasAnyDescription && (
                            <div className="md:col-span-5 bg-gradient-to-b from-blue-50/70 via-slate-50/50 to-white dark:from-slate-900/90 dark:via-[#111F33] dark:to-[#0D1828] p-3 flex flex-col justify-between max-h-64 overflow-y-auto">
                                <div>
                                    <div className="flex items-center gap-1.5 pb-1.5 mb-2 border-b border-blue-200/70 dark:border-slate-700">
                                        <FileText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                                            Description Preview
                                        </span>
                                    </div>

                                    {highlightedOption?.description ? (
                                        <div className="space-y-1.5 animate-in fade-in duration-100">
                                            <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                                                {highlightedOption.label}
                                            </div>
                                            {highlightedOption.productCode && (
                                                <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                                                    Code: {highlightedOption.productCode}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-slate-800/90 p-2.5 rounded-lg border border-blue-100 dark:border-slate-700 shadow-2xs max-h-40 overflow-y-auto">
                                                {highlightedOption.description}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500 italic">
                                            Hover over an item on the left to preview its description &amp; specifications.
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-slate-500 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                    <span>Scope / Specs</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">Auto-fills</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
        </div>
    );
});

SearchableSelect.displayName = 'SearchableSelect';
export default SearchableSelect;