import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Material, InterviewExperience } from '../types/index.js';
import { MaterialCard } from '../components/MaterialCard.js';
import { 
  Award, 
  Briefcase, 
  Code, 
  FileText, 
  HelpCircle, 
  Send, 
  Loader2, 
  Plus, 
  MessageSquare,
  Building,
  User,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import ElephantLoader from '../components/ElephantLoader.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const TABS = [
  { id: 'aptitude', name: 'Aptitude & Reasoning', icon: FileText },
  { id: 'dsa', name: 'DSA Resources', icon: Code },
  { id: 'interview_qa', name: 'Interview Q&A', icon: HelpCircle },
  { id: 'resumes', name: 'Resume Templates', icon: FileText },
  { id: 'coding_platforms', name: 'Coding Platforms', icon: Code },
  { id: 'experiences', name: 'Interview Experiences', icon: MessageSquare }
];

export const Placement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('aptitude');
  const [showFormModal, setShowFormModal] = useState(false);

  // Form states for submitting experiences
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [experience, setExperience] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Placement materials
  const { data: materialsData, isLoading: isMaterialsLoading } = useQuery<{ materials: Material[] }>({
    queryKey: ['placementMaterials', activeTab],
    queryFn: async () => {
      // Map tabs to search parameters or tags
      let tagFilter = '';
      if (activeTab === 'aptitude') tagFilter = 'aptitude';
      if (activeTab === 'dsa') tagFilter = 'dsa';
      if (activeTab === 'interview_qa') tagFilter = 'qa';
      if (activeTab === 'resumes') tagFilter = 'resume';
      if (activeTab === 'coding_platforms') tagFilter = 'platform';

      const res = await api.get(`/materials?regulation=PLACEMENT&search=${tagFilter}&limit=20`);
      return res.data;
    },
    enabled: activeTab !== 'experiences'
  });

  // 2. Fetch Interview Experiences
  const { data: experiencesData, isLoading: isExperiencesLoading } = useQuery<{ experiences: InterviewExperience[] }>({
    queryKey: ['interviewExperiences'],
    queryFn: async () => {
      const res = await api.get('/placement/interview-experiences');
      return res.data;
    },
    enabled: activeTab === 'experiences'
  });

  // 3. Experience submit mutation
  const submitExperienceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/placement/interview-experiences', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviewExperiences'] });
      setCompany('');
      setRole('');
      setYear(new Date().getFullYear().toString());
      setExperience('');
      setShowFormModal(false);
      alert('Interview experience submitted successfully! Thank you for contributing.');
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.error || 'Failed to submit experience.');
    }
  });

  const handleSubmitExperience = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!company.trim() || !role.trim() || !experience.trim()) {
      setSubmitError('Please fill out all required fields.');
      return;
    }

    submitExperienceMutation.mutate({
      company: company.trim(),
      role: role.trim(),
      year: parseInt(year),
      experience: experience.trim()
    });
  };

  const materialsList = materialsData?.materials || [];
  const experiencesList = experiencesData?.experiences || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent border border-background-borderLight dark:border-background-borderDark p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden">
        <div className="space-y-2 max-w-xl">
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-light dark:text-text-dark tracking-tight leading-none flex items-center gap-2">
            <Award className="text-primary animate-pulse" /> Placement Corner
          </h1>
          <p className="text-xs sm:text-sm text-text-lightMuted dark:text-text-darkMuted leading-relaxed">
            Exclusive resource repository for coding exams, aptitude logic training, and senior engineering interview insights.
          </p>
        </div>

        {activeTab === 'experiences' ? (
          <button
            onClick={() => setShowFormModal(true)}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-primary/20 hover:scale-103 shrink-0"
          >
            <Plus size={14} /> Share Your Interview
          </button>
        ) : (
          <Link
            to={`/upload?type=${
              activeTab === 'dsa' || activeTab === 'coding_platforms' 
                ? 'Coding Resource' 
                : 'Placement Resource'
            }&section=${activeTab}`}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-primary/20 hover:scale-103 shrink-0"
          >
            <Plus size={14} /> Add Resource
          </Link>
        )}
      </div>

      {/* Grid Tabs Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-background-borderLight dark:border-background-borderDark scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-xl border transition shrink-0 ${
                isActive
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                  : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted hover:bg-primary/10 bg-background-cardLight/40 dark:bg-background-cardDark/40'
              }`}
            >
              <Icon size={14} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Main Tab Panels */}
      {activeTab !== 'experiences' ? (
        isMaterialsLoading ? (
          <ElephantLoader size="md" text="Loading placement resources..." />
        ) : materialsList.length === 0 ? (
          <div className="text-center py-20 bg-background-cardLight/50 dark:bg-background-cardDark/50 border border-background-borderLight dark:border-background-borderDark rounded-2xl">
            <Briefcase size={40} className="text-text-lightMuted dark:text-text-darkMuted mx-auto mb-2" />
            <h3 className="font-heading font-bold text-base text-text-light dark:text-text-dark">No Placement Files</h3>
            <p className="text-xs text-text-lightMuted dark:text-text-darkMuted mt-1">
              Be the first to upload resources. Set regulation as "Placement Resource" when uploading.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {materialsList.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )
      ) : (
        isExperiencesLoading ? (
          <ElephantLoader size="md" text="Loading interview experiences..." />
        ) : experiencesList.length === 0 ? (
          <div className="text-center py-20 bg-background-cardLight/50 dark:bg-background-cardDark/50 border border-background-borderLight dark:border-background-borderDark rounded-2xl">
            <MessageSquare size={40} className="text-text-lightMuted dark:text-text-darkMuted mx-auto mb-2" />
            <h3 className="font-heading font-bold text-base text-text-light dark:text-text-dark">No Interview Experiences Shared Yet</h3>
            <p className="text-xs text-text-lightMuted dark:text-text-darkMuted mt-1">
              Have you recently attended a placement drive? Help your juniors by sharing your experience!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {experiencesList.map((exp) => (
              <div 
                key={exp.id}
                className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark p-6 rounded-2xl shadow-xl flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Accent top gradient line */}
                <div className="absolute top-0 left-0 w-[4px] h-full bg-primary" />
                
                {/* Author profile row */}
                <div className="flex items-center justify-between border-b border-background-borderLight/40 dark:border-background-borderDark/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary uppercase overflow-hidden">
                      {exp.author?.photoUrl ? (
                        <img src={exp.author.photoUrl} alt={exp.author.name} className="w-full h-full object-cover" />
                      ) : (
                        exp.author?.name.substring(0, 2)
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-light dark:text-text-dark">{exp.author?.name}</span>
                      <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted font-bold uppercase flex items-center gap-1">
                        <GraduationCap size={12} /> {exp.author?.branch} Department
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted">
                    {new Date(exp.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Company & Role */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-black text-text-light dark:text-text-dark">
                    <Building size={16} className="text-primary" />
                    <span>{exp.company}</span>
                    <span className="font-semibold text-xs text-text-lightMuted dark:text-text-darkMuted">— {exp.role}</span>
                  </div>
                  {exp.year && (
                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                      Batch of {exp.year}
                    </span>
                  )}
                </div>

                {/* Experience text */}
                <p className="text-xs text-text-light/90 dark:text-text-dark/90 leading-relaxed whitespace-pre-wrap pl-1 italic">
                  "{exp.experience}"
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Share Experience modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleSubmitExperience}
            className="w-full max-w-lg bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-6 sm:p-8 rounded-2xl shadow-2xl space-y-5"
          >
            <div>
              <h3 className="font-heading font-black text-lg text-text-light dark:text-text-dark flex items-center gap-1.5">
                <MessageSquare className="text-primary" /> Share Your Interview Experience
              </h3>
              <p className="text-[10px] text-text-lightMuted dark:text-text-darkMuted mt-0.5">
                Describe the rounds, coding questions asked, coding platform links, or tips for cracking the interviews.
              </p>
            </div>

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] flex items-center gap-1.5">
                <AlertCircle size={14} /> {submitError}
              </div>
            )}

            <div className="space-y-4 text-xs font-semibold text-text-light dark:text-text-dark">
              <div className="grid grid-cols-2 gap-4">
                {/* Company */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none"
                    placeholder="E.g., TCS Digital, Wipro"
                  />
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold">Job Role *</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none"
                    placeholder="E.g., System Engineer"
                  />
                </div>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold">Year of Interview *</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none"
                  placeholder="2025"
                />
              </div>

              {/* Experience detailed text */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold">Write Your Interview Walkthrough *</label>
                <textarea
                  required
                  rows={6}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full p-3 border border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark rounded-xl text-xs focus:outline-none"
                  placeholder="Round 1 (Aptitude & Coding): Describe questions... &#10;Round 2 (Technical Interview): DBMS questions, coding output... &#10;Round 3 (HR Interview): Questions asked..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  setSubmitError(null);
                }}
                className="px-4 py-2 border border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted rounded-xl hover:bg-primary/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitExperienceMutation.isPending}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitExperienceMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center">
                      <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    Publish Walkthrough <Send size={12} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Placement;
