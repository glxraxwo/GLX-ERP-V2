import { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Plus, Loader2 } from 'lucide-react';

const CreatableCombobox = forwardRef(({
    label,
    error,
    required = false,
    options = [], // [{ value: id, label: name }]
    value = '',
    onChange, // receives (value, itemObj)
    onCreate, // async (name) => returns new item or new ID
    placeholder = 'Search or type to add...',
    createLabel = 'Create new',
    className = '',
    helperText,
    disabled = false,
    allowFreeText = false, // if true, typing directly changes value (string), and suggestions pop up
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(allowFreeText ? (value || '') : '');
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Keep searchTerm in sync with value if allowFreeText is active
    useEffect(() => {
        if (allowFreeText) {
            setSearchTerm(value || '');
        }
    }, [value, allowFreeText]);

    // Current selected option object
    const selectedOption = useMemo(() => {
        if (!options || !options.length) return null;
        return options.find((opt) => String(opt.value) === String(value) || opt.label?.toLowerCase() === String(value).toLowerCase()) || null;
    }, [options, value]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase().trim();
        return options.filter((opt) => {
            const labelStr = String(opt.label || '').toLowerCase();
            return labelStr.includes(q);
        });
    }, [options, searchTerm]);

    // Check if search query matches an existing option exactly
    const exactMatch = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return options.some((opt) => String(opt.label || '').trim().toLowerCase() === q);
    }, [options, searchTerm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                if (!allowFreeText && selectedOption) {
                    setSearchTerm('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [allowFreeText, selectedOption]);

    const handleSelect = (opt) => {
        if (allowFreeText) {
            setSearchTerm(opt.label || opt.value);
            if (onChange) onChange(opt.label || opt.value, opt);
        } else {
            if (onChange) onChange(opt.value, opt);
            setSearchTerm('');
        }
        setIsOpen(false);
    };

    const handleCreate = async () => {
        const textToCreate = searchTerm.trim();
        if (!textToCreate || !onCreate || isCreating) return;

        try {
            setIsCreating(true);
            const created = await onCreate(textToCreate);
            if (created) {
                if (allowFreeText) {
                    setSearchTerm(created.name || created.label || textToCreate);
                    if (onChange) onChange(created.name || created.label || textToCreate, created);
                } else {
                    const newId = created._id || created.id || created.value;
                    if (onChange) onChange(newId, created);
                    setSearchTerm('');
                }
            }
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to create item:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSearchTerm('');
        if (onChange) onChange('', null);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsOpen(true);
        if (allowFreeText && onChange) {
            onChange(val, null);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                {allowFreeText ? (
                    // Free text mode (like in Invoice Vehicle & Insurance fields)
                    <div className="relative flex items-center">
                        <input
                            ref={ref}
                            type="text"
                            value={searchTerm}
                            disabled={disabled}
                            placeholder={placeholder}
                            onFocus={() => setIsOpen(true)}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!exactMatch && searchTerm.trim() && onCreate) {
                                        handleCreate();
                                    } else if (filteredOptions.length > 0) {
                                        handleSelect(filteredOptions[0]);
                                    }
                                } else if (e.key === 'Escape') {
                                    setIsOpen(false);
                                }
                            }}
                            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                                error ? 'border-red-400' : 'border-gray-300'
                            } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            {...props}
                        />
                        <div className="absolute right-2.5 flex items-center gap-1 text-gray-400">
                            {searchTerm && !disabled && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-0.5 hover:text-gray-600 rounded transition"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <ChevronDown
                                size={15}
                                className={`cursor-pointer transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                onClick={() => !disabled && setIsOpen(!isOpen)}
                            />
                        </div>
                    </div>
                ) : (
                    // Dropdown select mode (like in Product Category & Brand)
                    <div
                        onClick={() => {
                            if (!disabled) {
                                setIsOpen(!isOpen);
                                if (!isOpen) {
                                    setTimeout(() => inputRef.current?.focus(), 50);
                                }
                            }
                        }}
                        className={`w-full min-h-[38px] px-3 py-1.5 flex items-center justify-between text-sm bg-white border rounded-lg cursor-pointer transition select-none ${
                            error ? 'border-red-400' : 'border-gray-300'
                        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${
                            disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-gray-400'
                        }`}
                    >
                        <div className="flex-1 truncate pr-2">
                            {selectedOption ? (
                                <span className="text-gray-900 font-medium">{selectedOption.label}</span>
                            ) : (
                                <span className="text-gray-400">{placeholder}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-gray-400">
                            {selectedOption && !disabled && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-0.5 hover:text-gray-600 rounded transition"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <ChevronDown
                                size={15}
                                className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                    </div>
                )}

                {/* Floating Suggestions Dropdown */}
                {isOpen && !disabled && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        {!allowFreeText && (
                            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                <div className="relative flex items-center">
                                    <Search size={14} className="absolute left-2.5 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={`Search or type to add...`}
                                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (!exactMatch && searchTerm.trim() && onCreate) {
                                                    handleCreate();
                                                } else if (filteredOptions.length > 0) {
                                                    handleSelect(filteredOptions[0]);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                            {/* Create option if not exact match */}
                            {!exactMatch && searchTerm.trim() && onCreate && (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 transition"
                                >
                                    {isCreating ? (
                                        <Loader2 size={14} className="animate-spin text-blue-600" />
                                    ) : (
                                        <Plus size={14} className="text-blue-600 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {createLabel} <span className="font-bold underline">"{searchTerm.trim()}"</span>
                                    </span>
                                </button>
                            )}

                            {filteredOptions.length === 0 && (!onCreate || exactMatch) ? (
                                <div className="p-3 text-center text-xs text-gray-400">
                                    No matching items found.
                                </div>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleSelect(opt)}
                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition hover:bg-blue-50/50 ${
                                                isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
                                            }`}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
        </div>
    );
});

export default CreatableCombobox;
