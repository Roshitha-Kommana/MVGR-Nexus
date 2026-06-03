import { RefreshCw, Star, Search } from 'lucide-react';

interface FilterSidebarProps {
  filters: {
    regulation: string; // Plain text string search filter
    branch: string[];
    sem: string[];
    type: string[];
    rating: string;
    sort: string;
  };
  onChange: (filters: any) => void;
  onClear: () => void;
}

const BRANCHES = [
  { id: 'CSE', name: 'CSE' },
  { id: 'CSE (AI & ML)', name: 'CSE (AI & ML)' },
  { id: 'CSE (DS)', name: 'CSE (DS)' },
  { id: 'CSE (IoT & CS)', name: 'CSE (IoT & CS)' },
  { id: 'CS & IT', name: 'CS & IT' },
  { id: 'ECE', name: 'ECE' },
  { id: 'EEE', name: 'EEE' },
  { id: 'MECH', name: 'MECH' },
  { id: 'CHE', name: 'CHE' },
  { id: 'CIVIL', name: 'CIVIL' }
];

const MATERIAL_TYPES = [
  'Notes',
  'Lab Manual',
  'Previous Year Question Paper',
  'Assignment Solution',
  'Placement Resource',
  'Interview Experience',
  'Coding Resource'
];

export const FilterSidebar = ({ filters, onChange, onClear }: FilterSidebarProps) => {
  const toggleSelect = (field: 'branch' | 'sem' | 'type', value: string) => {
    const list = [...filters[field]];
    const idx = list.indexOf(value);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    onChange({ ...filters, [field]: list });
  };

  const handleRatingChange = (val: string) => {
    onChange({ ...filters, rating: filters.rating === val ? '' : val });
  };

  const handleSortChange = (sortVal: string) => {
    onChange({ ...filters, sort: sortVal });
  };

  const handleRegulationChange = (val: string) => {
    onChange({ ...filters, regulation: val });
  };

  return (
    <div className="w-full flex flex-col gap-5 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/50 shadow-premium rounded-2xl p-5 font-body text-[#2C2518] dark:text-[#EFECE6]">
      <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#3A342B]/40 pb-3">
        <h3 className="font-heading font-extrabold text-sm text-[#2C2518] dark:text-[#EFECE6] tracking-tight">Filters</h3>
        <button 
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] font-bold text-[#D4A843] hover:underline"
        >
          <RefreshCw size={10} />
          Reset All
        </button>
      </div>

      {/* Regulation (Plain Text Input, Stored upper-cased) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Regulation</span>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. R21, A3, R20"
            value={filters.regulation}
            onChange={(e) => handleRegulationChange(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] placeholder-[#8C8270] focus:outline-none focus:border-[#D4A843] uppercase font-semibold"
          />
          <Search size={14} className="absolute left-3 top-3.5 text-[#8C8270]" />
        </div>
      </div>

      {/* Branch */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Branch</span>
        <div className="grid grid-cols-2 gap-2">
          {BRANCHES.map((b) => {
            const isSelected = filters.branch.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleSelect('branch', b.id)}
                className={`py-2 text-[11px] font-bold rounded-xl border transition-all duration-150 ${
                  isSelected 
                    ? 'bg-[#D4A843] text-white border-[#D4A843] shadow-sm' 
                    : 'border-[#E6DFD3] dark:border-[#3A342B] bg-white dark:bg-[#2A251D] text-[#8C8270] dark:text-[#A09685] hover:bg-[#EAE5DB]/25'
                }`}
              >
                {b.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Semester */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Semester</span>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => {
            const semNum = String(i + 1);
            const isSelected = filters.sem.includes(semNum);
            return (
              <button
                key={semNum}
                type="button"
                onClick={() => toggleSelect('sem', semNum)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
                  isSelected 
                    ? 'bg-[#D4A843] text-white border-[#D4A843]' 
                    : 'border-[#E6DFD3] dark:border-[#3A342B] bg-white dark:bg-[#2A251D] text-[#8C8270] dark:text-[#A09685] hover:bg-[#EAE5DB]/25'
                }`}
              >
                {semNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Material Type */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Resource Type</span>
        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
          {MATERIAL_TYPES.map((t) => {
            const isSelected = filters.type.includes(t);
            return (
              <label key={t} className="flex items-center gap-2 text-xs font-medium text-[#2C2518] dark:text-[#EFECE6] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect('type', t)}
                  className="w-3.5 h-3.5 rounded accent-[#D4A843] border-[#E6DFD3]"
                />
                {t}
              </label>
            );
          })}
        </div>
      </div>

      {/* Rating */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Rating</span>
        <button
          type="button"
          onClick={() => handleRatingChange('4')}
          className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            filters.rating === '4'
              ? 'bg-[#D4A843]/10 border-[#D4A843]/20 text-[#D4A843]'
              : 'border-[#E6DFD3] dark:border-[#3A342B] text-[#8C8270] dark:text-[#A09685] hover:bg-[#D4A843]/5'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            4★ and above
          </span>
          <span className="text-[9px] uppercase font-extrabold tracking-wider">
            {filters.rating === '4' ? 'Active' : 'Off'}
          </span>
        </button>
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-2 border-t border-[#E6DFD3] dark:border-[#3A342B]/40 pt-4">
        <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Sort By</span>
        <select
          value={filters.sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] text-xs font-bold text-[#2C2518] dark:text-[#EFECE6] rounded-xl focus:outline-none focus:border-[#D4A843]"
        >
          <option value="newest">Newest Uploads</option>
          <option value="most_downloaded">Most Downloaded</option>
          <option value="highest_rated">Highest Rated</option>
        </select>
      </div>
    </div>
  );
};

export default FilterSidebar;
