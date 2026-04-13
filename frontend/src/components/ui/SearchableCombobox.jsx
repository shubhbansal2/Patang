import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableCombobox = ({ options, value, onChange, placeholder, disabled, label, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div 
        className={`relative w-full flex items-center justify-between border rounded-xl px-4 py-2.5 transition-all cursor-pointer ${
          disabled ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-gray-800 text-sm truncate' : 'text-gray-400 text-sm truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-50 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-brand-50 transition-colors ${
                    value === opt.value ? 'bg-brand-50/50 text-brand-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {value === opt.value && <Check size={14} className="flex-shrink-0 text-brand-600" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCombobox;
