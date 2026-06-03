import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { MaterialCard } from '../components/MaterialCard.js';
import { FilterSidebar } from '../components/FilterSidebar.js';
import { motion, AnimatePresence } from 'framer-motion';
import ElephantLoader from '../components/ElephantLoader.js';
import { Search, BookOpen, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter inputs
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [showFilters, setShowFilters] = useState(false);

  // Read filters from URL
  const filters = {
    regulation: searchParams.get('regulation') || '',
    branch: searchParams.get('branch')?.split(',').filter(Boolean) || [],
    sem: searchParams.get('sem')?.split(',').filter(Boolean) || [],
    type: searchParams.get('type')?.split(',').filter(Boolean) || [],
    rating: searchParams.get('rating') || '',
    sort: searchParams.get('sort') || 'newest'
  };

  // Debounce search term (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      const current = new URLSearchParams(searchParams);
      if (searchTerm.trim()) {
        current.set('search', searchTerm.trim());
      } else {
        current.delete('search');
      }
      setSearchParams(current);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Infinite query pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteQuery({
    queryKey: ['materials', debouncedSearch, filters],
    queryFn: async ({ pageParam = '' }) => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.regulation) params.set('regulation', filters.regulation.trim().toUpperCase());
      if (filters.branch.length) params.set('branch', filters.branch.join(','));
      if (filters.sem.length) params.set('sem', filters.sem.join(','));
      if (filters.type.length) params.set('type', filters.type.join(','));
      if (filters.rating) params.set('rating', filters.rating);
      if (filters.sort) params.set('sort', filters.sort);
      if (pageParam) params.set('cursor', pageParam as string);
      
      params.set('limit', '10');

      const res = await api.get(`/materials?${params.toString()}`);
      return res.data;
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  const handleFilterChange = (newFilters: any) => {
    const current = new URLSearchParams(searchParams);
    
    if (newFilters.regulation) {
      current.set('regulation', newFilters.regulation.trim());
    } else {
      current.delete('regulation');
    }

    ['branch', 'sem', 'type'].forEach(field => {
      if (newFilters[field] && newFilters[field].length > 0) {
        current.set(field, newFilters[field].join(','));
      } else {
        current.delete(field);
      }
    });

    if (newFilters.rating) {
      current.set('rating', newFilters.rating);
    } else {
      current.delete('rating');
    }

    if (newFilters.sort) {
      current.set('sort', newFilters.sort);
    } else {
      current.delete('sort');
    }

    setSearchParams(current);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchTerm('');
  };

  const materialsList = data?.pages.flatMap(page => page.materials) || [];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col gap-5 font-body pb-16 text-[#2C2518] dark:text-[#EFECE6]">
      
      {/* Page Title & Search Bar Area */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl tracking-tight text-[#2C2518] dark:text-[#EFECE6]">
            Explore Library
          </h1>
          <p className="text-[11px] text-[#8C8270] dark:text-[#A09685] font-semibold uppercase tracking-wider mt-0.5">
            Search MVGR academic guides, blueprints, and files
          </p>
        </div>

        {/* 1. Search Bar Input Strip */}
        <div className="relative flex items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search notes, subjects, branch codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 bg-[#EAE5DB]/65 border border-[#E6DFD3] dark:border-[#3A342B]/50 rounded-full text-[#2C2518] placeholder-[#8C8270] focus:outline-none focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843] font-semibold transition"
            />
            <Search size={15} className="absolute left-3.5 top-3.5 text-[#8C8270]" />
          </div>
          
          {/* Toggle Filters button (Gold sparkle design) */}
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-full border transition-all duration-200 ${
              showFilters 
                ? 'bg-[#D4A843] text-white border-[#D4A843] shadow-md shadow-[#D4A843]/15' 
                : 'border-[#D4A843] text-[#D4A843] bg-white dark:bg-[#2A251D] hover:bg-[#EAE5DB]/25'
            }`}
          >
            <Sparkles size={11} className={showFilters ? 'text-white' : 'text-[#D4A843]'} />
            Filters
          </button>
        </div>
      </div>

      {/* 2. Filter Sidebar (collapsible drawer-style) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main library browse lists */}
      <div className="flex flex-col gap-4 mt-1">
        {isLoading ? (
          <ElephantLoader size="md" text="Loading library catalog..." />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-8 text-red-500 gap-2 border border-red-500/10 bg-red-500/5 rounded-2xl">
            <AlertCircle size={28} />
            <h3 className="font-heading font-bold text-sm">Error loading database</h3>
            <button onClick={() => refetch()} className="text-xs underline font-bold text-[#D4A843]">Try Again</button>
          </div>
        ) : materialsList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/40 shadow-premium rounded-[20px] flex flex-col items-center justify-center gap-3">
            <BookOpen size={36} className="text-[#8C8270]" />
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-sm text-[#2C2518] dark:text-[#EFECE6]">No Resources Found</h3>
              <p className="text-[10px] text-[#8C8270] dark:text-[#A09685] max-w-[240px] mx-auto leading-relaxed">
                There are no notes matching the selected filters. Let's adjust them or clear.
              </p>
            </div>
            <button 
              onClick={handleClearFilters}
              className="text-[11px] font-extrabold bg-[#D4A843] hover:bg-[#B58B2F] text-white px-4 py-2 rounded-xl transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Responsive grid catalog */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
            >
              {materialsList.map((material: any) => (
                <motion.div key={material.id} variants={itemVariants}>
                  <MaterialCard material={material} />
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Pagination */}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-5 py-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3A342B] bg-white dark:bg-[#2A251D] hover:border-[#D4A843]/50 text-xs font-bold text-[#D4A843] transition shadow-premium flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center">
                        <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                      </div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    'Load More Materials'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
