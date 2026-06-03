import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { MaterialCard } from '../components/MaterialCard.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowRight, 
  Sparkles,
  BookOpen,
  Award
} from 'lucide-react';

interface HomePageStats {
  totalMaterials: number;
  totalContributors: number;
  totalDownloads: number;
  topContributors: Array<{
    name: string;
    photoUrl: string | null;
    totalUploads: number;
    branch: string;
  }>;
}

export const Home = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useCurrentUser();

  // Search input state
  const [globalSearch, setGlobalSearch] = useState('');
  const [showScopeFilters, setShowScopeFilters] = useState(false);

  // Scope search states
  const [regulation, setRegulation] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [semester, setSemester] = useState('1');
  const [subject, setSubject] = useState('');
  const [materialType, setMaterialType] = useState('Notes');

  // Active department filter tab
  const [selectedDept, setSelectedDept] = useState('All');

  // Autocomplete Suggestions
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // Fetch Public Stats
  const { data: statsData } = useQuery<HomePageStats>({
    queryKey: ['publicStats'],
    queryFn: async () => {
      const res = await api.get('/stats');
      return res.data;
    }
  });

  // Fetch distinct subjects dynamically
  useEffect(() => {
    const fetchSubjects = async () => {
      if (regulation.trim() && branch && isSignedIn) {
        try {
          const res = await api.get(`/subjects?regulation=${regulation.trim()}&branch=${branch}`);
          setSubjectSuggestions(res.data.subjects || []);
        } catch (err) {
          console.error('Error fetching subjects:', err);
        }
      } else {
        setSubjectSuggestions([]);
      }
    };
    fetchSubjects();
  }, [regulation, branch, isSignedIn]);

  // Fetch Featured Materials (Top Rated)
  const { data: featuredData } = useQuery({
    queryKey: ['featuredMaterials', selectedDept],
    queryFn: async () => {
      if (!isSignedIn) return [];
      let url = '/materials?sort=highest_rated&limit=5';
      if (selectedDept !== 'All') {
        url += `&branch=${selectedDept}`;
      }
      const res = await api.get(url);
      return res.data.materials;
    },
    enabled: isSignedIn
  });

  // Fetch Recent Materials (Continue Reading/Recent Uploads)
  const { data: recentData } = useQuery({
    queryKey: ['recentMaterials'],
    queryFn: async () => {
      if (!isSignedIn) return [];
      const res = await api.get('/materials?sort=newest&limit=4');
      return res.data.materials;
    },
    enabled: isSignedIn
  });

  const featuredMaterials = featuredData || [];
  const recentMaterials = recentData || [];

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/browse?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (regulation.trim()) params.set('regulation', regulation.trim().toUpperCase());
    if (branch) params.set('branch', branch);
    if (semester) params.set('sem', semester);
    if (subject.trim()) params.set('subject', subject.trim());
    if (materialType) params.set('type', materialType);

    navigate(`/browse?${params.toString()}`);
  };

  const departments = [
    'All',
    'CSE',
    'CSE (AI & ML)',
    'CSE (DS)',
    'CSE (IoT & CS)',
    'CS & IT',
    'ECE',
    'EEE',
    'MECH',
    'CHE',
    'CIVIL'
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 font-body pb-16 text-[#2C2518] dark:text-[#EFECE6]"
    >
      {/* 1. Global Search & Scope Filters Wrapper */}
      <div className="flex flex-col gap-3">
        <motion.div 
          variants={itemVariants} 
          className="relative flex items-center gap-2.5 w-full"
        >
          <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1">
            <input
              type="text"
              placeholder="Search study materials, lecture notes, authors..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 bg-[#EAE5DB]/65 border border-[#E6DFD3] dark:border-[#3A342B]/50 rounded-full text-[#2C2518] placeholder-[#8C8270] focus:outline-none focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843] font-semibold transition"
            />
            <Search size={15} className="absolute left-3.5 top-3.5 text-[#8C8270]" />
          </form>
          
          {/* Scope Filter toggle button */}
          <button
            type="button"
            onClick={() => setShowScopeFilters(prev => !prev)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-full border transition-all duration-200 shrink-0 ${
              showScopeFilters 
                ? 'bg-[#D4A843] text-white border-[#D4A843] shadow-md shadow-[#D4A843]/15' 
                : 'border-[#D4A843] text-[#D4A843] bg-white dark:bg-[#2A251D] hover:bg-[#EAE5DB]/25'
            }`}
          >
            <Sparkles size={11} className={showScopeFilters ? 'text-white' : 'text-[#D4A843]'} />
            Scope Filter
          </button>
        </motion.div>

        {/* Collapsible Scope Search Form */}
        <AnimatePresence>
          {showScopeFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden w-full"
            >
              <div className="bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/50 shadow-premium rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-[#E6DFD3] dark:border-[#3A342B]/40 pb-2">
                  <Sparkles size={13} className="text-[#D4A843]" />
                  <h3 className="font-heading font-black text-[11px] text-[#2C2518] dark:text-[#EFECE6] uppercase tracking-wider">
                    Filter by Academic Scope
                  </h3>
                </div>

                <form onSubmit={handleQuickSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs font-semibold text-[#2C2518] dark:text-[#EFECE6]">
                  {/* Regulation */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase">Academic Regulation</label>
                    <input
                      type="text"
                      required
                      value={regulation}
                      onChange={(e) => setRegulation(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] placeholder-[#8C8270] focus:outline-none focus:border-[#D4A843] uppercase font-semibold"
                      placeholder="e.g. R21, A3, R20"
                    />
                  </div>

                  {/* Branch */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase">Branch</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full text-[11px] p-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
                    >
                      <option value="CSE">CSE</option>
                      <option value="CSE (AI & ML)">CSE (AI & ML)</option>
                      <option value="CSE (DS)">CSE (DS)</option>
                      <option value="CSE (IoT & CS)">CSE (IoT & CS)</option>
                      <option value="CS & IT">CS & IT</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CHE">CHE</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                  </div>

                  {/* Semester */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full text-[11px] p-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
                    >
                      {Array.from({ length: 8 }).map((_, i) => (
                        <option key={i} value={i + 1}>Sem {i + 1}</option>
                      ))}
                    </select>
                  </div>

                  {/* Material Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase">Type</label>
                    <select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      className="w-full text-[11px] p-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
                    >
                      <option value="Notes">Notes</option>
                      <option value="Lab Manual">Lab Manual</option>
                      <option value="Previous Year Question Paper">Exam Paper</option>
                      <option value="Assignment Solution">Assignment Solution</option>
                      <option value="Placement Resource">Placement Guide</option>
                    </select>
                  </div>

                  {/* Subject Name Autocomplete */}
                  <div className="flex flex-col gap-1.5 relative md:col-span-2 lg:col-span-3">
                    <label className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase">Subject Name</label>
                    <input
                      type="text"
                      placeholder="Subject (e.g. SQL, DBMS)"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setShowSubjectDropdown(true);
                      }}
                      onFocus={() => setShowSubjectDropdown(true)}
                      className="w-full text-xs p-2.5 bg-[#EAE5DB]/20 dark:bg-[#1E1B15]/20 border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium"
                    />
                    {showSubjectDropdown && subjectSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl shadow-xl z-20 max-h-36 overflow-y-auto">
                        {subjectSuggestions
                          .filter(s => s.toLowerCase().includes(subject.toLowerCase()))
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setSubject(s);
                                setShowSubjectDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[10.5px] text-[#2C2518] dark:text-[#EFECE6] hover:bg-[#D4A843]/10 hover:text-[#D4A843] transition border-b border-[#E6DFD3]/30 dark:border-[#3A342B]/30 last:border-b-0"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#D4A843] hover:bg-[#B58B2F] text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-[#D4A843]/10 rounded-xl"
                    >
                      Apply Filter
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Featured Popular Banner (Spans full width) */}
      <motion.section 
        variants={itemVariants}
        className="w-full p-6 rounded-2xl bg-gradient-to-br from-[#D4A843] via-[#B58B2F] to-[#2C2518] text-white relative overflow-hidden flex flex-col justify-between min-h-[170px] shadow-lg shadow-[#D4A843]/10"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-y-6 translate-x-6" />
        
        <div className="space-y-2.5 z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[#FBF8F3] text-[9px] font-extrabold uppercase tracking-wider">
            <Award size={10} className="text-[#FBF8F3] fill-white/15" /> Academic Spotlight
          </div>
          <h2 className="font-heading font-black text-xl md:text-2xl leading-tight tracking-tight mt-1">
            Everything You Need to Ace Your Semester <br />
            <span className="text-[#FBF8F3]/90 font-medium text-xs.5 md:text-sm">Trusted materials uploaded by MVGR faculty, seniors, and students just like you.</span>
          </h2>
          <p className="text-[10.5px] text-[#EAE5DB]/80 leading-relaxed max-w-md">
            Access lecture notes, lab manuals, and previous year question papers organized by department and semester. No more searching — just open, read, and learn.
          </p>
        </div>
        
        <div className="pt-4 z-10">
          <Link
            to="/browse?sort=highest_rated"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-white text-[#2C2518] hover:bg-[#FBF8F3] rounded-xl font-heading font-bold text-[11px] transition shadow-md active:scale-98"
          >
            Explore Catalog <ArrowRight size={12} className="text-[#D4A843]" />
          </Link>
        </div>
      </motion.section>

      {/* 3. Department Filters Tab Row */}
      <motion.section variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3A342B]/40 pb-1">
          <h3 className="font-heading font-black text-xs text-[#2C2518] dark:text-[#EFECE6] uppercase tracking-wider">
            Departments Catalog
          </h3>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto py-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 shrink-0 select-none ${
                selectedDept === dept
                  ? 'bg-[#D4A843] text-white shadow-md shadow-[#D4A843]/10'
                  : 'bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/50 text-[#8C8270] dark:text-[#A09685] hover:bg-[#EAE5DB]/40 dark:hover:bg-[#3A342B]/40'
              }`}
            >
              {dept === 'All' ? 'All Genres' : dept}
            </button>
          ))}
        </div>
      </motion.section>

      {/* 4. Trending/Featured Grid (Dynamic Covers Grid) */}
      {isSignedIn && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#3A342B]/40 pb-1.5">
            <h2 className="font-heading font-black text-xs.5 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#D4A843] fill-[#D4A843] animate-pulse" /> Popular Releases
            </h2>
            <Link to="/browse?sort=highest_rated" className="text-[10px] font-bold text-[#D4A843] hover:underline flex items-center">
              View Catalog <ArrowRight size={10} className="ml-0.5" />
            </Link>
          </div>

          {featuredMaterials.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/40 rounded-2xl text-[11px] italic text-[#8C8270]">
              No documents available in this department category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {featuredMaterials.map((mat: any) => (
                <MaterialCard key={mat.id} material={mat} />
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* 5. Stats Summary Row */}
      <motion.section 
        variants={itemVariants} 
        className="grid grid-cols-3 gap-3.5 bg-[#EAE5DB]/40 dark:bg-[#2A251D]/20 border border-[#E6DFD3] dark:border-[#3A342B]/40 p-4.5 rounded-2xl"
      >
        <div className="text-center flex flex-col items-center">
          <span className="text-lg font-heading font-black text-[#2C2518] dark:text-[#EFECE6]">
            {statsData?.totalMaterials || 0}
          </span>
          <span className="text-[8px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase tracking-wider mt-0.5">
            Catalog Items
          </span>
        </div>

        <div className="text-center border-x border-[#E6DFD3] dark:border-[#3A342B]/40 flex flex-col items-center">
          <span className="text-lg font-heading font-black text-[#2C2518] dark:text-[#EFECE6]">
            {statsData?.totalContributors || 0}
          </span>
          <span className="text-[8px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase tracking-wider mt-0.5">
            Members
          </span>
        </div>

        <div className="text-center flex flex-col items-center">
          <span className="text-lg font-heading font-black text-[#2C2518] dark:text-[#EFECE6]">
            {statsData?.totalDownloads || 0}
          </span>
          <span className="text-[8px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase tracking-wider mt-0.5">
            Downloads
          </span>
        </div>
      </motion.section>

      {/* 6. Continue Reading Shelf */}
      {isSignedIn && recentMaterials.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#E6DFD3] dark:border-[#3A342B]/40 pb-1">
            <h2 className="font-heading font-black text-xs.5 uppercase tracking-wider text-[#2C2518] dark:text-[#EFECE6]">
              Continue Reading
            </h2>
            <Link to="/browse?sort=newest" className="text-[10px] font-bold text-[#D4A843] hover:underline">
              View All
            </Link>
          </div>

          <div className="flex flex-col gap-3.5">
            {recentMaterials.map((mat: any) => (
              <Link
                key={mat.id}
                to={`/material/${mat.id}`}
                className="flex items-center justify-between bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/40 p-3.5 rounded-2xl hover:border-[#D4A843] transition-colors duration-150 shadow-sm"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="w-10 h-12 bg-gradient-to-tr from-[#D4A843] to-amber-700 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-white select-none">
                    <BookOpen size={15} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-[#2C2518] dark:text-[#EFECE6] truncate">
                      {mat.title}
                    </span>
                    <span className="text-[9.5px] text-[#8C8270] dark:text-[#A09685] font-semibold mt-0.5">
                      by {mat.uploaderName} • <span className="text-[#D4A843] uppercase">{mat.materialType}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#EAE5DB]/40 dark:bg-[#3A342B]/40 text-[#2C2518] dark:text-[#EFECE6]">
                    {mat.regulation}
                  </span>
                  <div className="w-6.5 h-6.5 bg-[#F5F0E8] dark:bg-[#1E1B15] border border-[#E6DFD3] dark:border-[#3A342B]/50 rounded-full flex items-center justify-center text-[#8C8270] dark:text-[#A09685] hover:text-[#D4A843] hover:border-[#D4A843] transition-colors duration-150">
                    <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};

export default Home;
