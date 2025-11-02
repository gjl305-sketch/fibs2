import React, { useState, useEffect, useRef } from 'react';
import { searchSymbols } from './services/alpacaService';
import { MagnifyingGlassIcon } from './components/icons/InterfaceIcons';

interface SymbolSearchProps {
    onSelect: (symbol: string) => void;
    placeholder?: string;
    className?: string;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({ onSelect, placeholder = "Search symbol...", className }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ symbol: string; name: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.length > 0) {
            setResults(searchSymbols(query));
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (symbol: string) => {
        onSelect(symbol);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={searchRef} className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gray-700/80 border border-gray-600 rounded-full px-10 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
            />
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {results.map(stock => (
                        <div
                            key={stock.symbol}
                            onClick={() => handleSelect(stock.symbol)}
                            className="px-4 py-2 text-sm text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer"
                        >
                            <span className="font-bold">{stock.symbol}</span>
                            <span className="text-gray-400 ml-2">{stock.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};