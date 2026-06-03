import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { api } from '../services/api.js';
import { motion, AnimatePresence } from 'framer-motion';
import ElephantLoader from '../components/ElephantLoader.js';
import { Check, CheckCircle2, AlertCircle, ArrowRight, GraduationCap, School } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { clerkUser, dbUser, isLoading, refetch } = useCurrentUser();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<'student' | 'educator' | null>(null);

  // Core Form states
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('CSE'); // Acts as Department for Educator
  
  // Student-specific fields
  const [studentType, setStudentType] = useState<'current' | 'alumni'>('current');
  const [semester, setSemester] = useState('1');
  const [graduationYear, setGraduationYear] = useState('');
  const [regulation, setRegulation] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Educator-specific fields
  const [designation, setDesignation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync Clerk name initially if available
  useEffect(() => {
    if (clerkUser) {
      setName(clerkUser.fullName || '');
    }
  }, [clerkUser]);

  // If already onboarded, redirect to home
  useEffect(() => {
    if (!isLoading && dbUser) {
      navigate('/');
    }
  }, [dbUser, isLoading, navigate]);

  if (isLoading) {
    return <ElephantLoader size="lg" text="Verifying credentials..." />;
  }

  if (!clerkUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-2" />
        <h2 className="font-heading font-bold text-lg text-[#2C2518] dark:text-[#EFECE6]">Authentication Required</h2>
        <p className="text-xs text-[#8C8270] mt-1">Please sign in to complete your onboarding.</p>
      </div>
    );
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress || '';
  const isMvgrEmail = email.endsWith('@mvgrce.edu.in');

  const handleNextStep = () => {
    if (step === 1 && selectedRole) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Hard validate MVGR email domain
    if (!isMvgrEmail) {
      setErrorMsg('Onboarding is restricted. You must log in using your college email domain: @mvgrce.edu.in');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      email,
      photoUrl: clerkUser.imageUrl || null,
      role: selectedRole,
      branch
    };

    if (selectedRole === 'student') {
      if (!regulation.trim()) {
        setErrorMsg('Academic Regulation is required (e.g. R21, A3).');
        return;
      }
      payload.studentType = studentType;
      payload.regulation = regulation.trim().toUpperCase();
      payload.rollNumber = rollNumber.trim().toUpperCase() || null;

      if (studentType === 'current') {
        payload.semester = parseInt(semester);
      } else {
        if (!graduationYear) {
          setErrorMsg('Graduation Year is required for alumni.');
          return;
        }
        payload.graduationYear = parseInt(graduationYear);
      }
    } else {
      if (!designation.trim()) {
        setErrorMsg('Professional designation is required.');
        return;
      }
      payload.designation = designation.trim();
    }

    setIsSubmitting(true);

    try {
      await api.post('/users/onboard', payload);
      setStep(3);
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to complete onboarding. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleExplore = async () => {
    await refetch();
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-6 font-body text-[#2C2518] dark:text-[#EFECE6] max-w-md mx-auto">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: Role Selection Screen */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-heading font-black text-2xl text-[#2C2518] dark:text-[#EFECE6]">
                Tell us who you are
              </h2>
              <p className="text-xs text-[#8C8270] max-w-xs mx-auto leading-relaxed">
                Choose your role on the platform. This is selected once and cannot be changed by you.
              </p>
            </div>

            {/* Email Check Box Alert if not college email */}
            {!isMvgrEmail && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[11px] flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Onboarding requires a college email address (@mvgrce.edu.in). You are signed in as {email}.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Student Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`p-5 rounded-[20px] bg-white dark:bg-[#2A251D] text-left flex flex-col justify-between h-[160px] relative transition-all duration-300 ${
                  selectedRole === 'student'
                    ? 'shadow-premium border-2 border-[#D4A843] bg-[#EAE5DB]/20 dark:bg-[#D4A843]/10'
                    : 'shadow-premium border-2 border-transparent hover:border-[#D4A843]/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedRole === 'student' ? 'bg-[#D4A843] text-white' : 'bg-[#EAE5DB] dark:bg-[#3A342B] text-[#D4A843]'}`}>
                  <GraduationCap size={22} />
                </div>
                <div className="space-y-1">
                  <span className="font-heading font-bold text-sm text-[#2C2518] dark:text-[#EFECE6] block">Student</span>
                  <span className="text-[10px] text-[#8C8270] dark:text-[#A09685] block leading-snug">1st year to 4th year or Alumni</span>
                </div>
                {selectedRole === 'student' && (
                  <div className="absolute top-4 right-4 w-5 h-5 bg-[#D4A843] text-white rounded-full flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Educator Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('educator')}
                className={`p-5 rounded-[20px] bg-white dark:bg-[#2A251D] text-left flex flex-col justify-between h-[160px] relative transition-all duration-300 ${
                  selectedRole === 'educator'
                    ? 'shadow-premium border-2 border-[#D4A843] bg-[#EAE5DB]/20 dark:bg-[#D4A843]/10'
                    : 'shadow-premium border-2 border-transparent hover:border-[#D4A843]/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedRole === 'educator' ? 'bg-[#D4A843] text-white' : 'bg-[#EAE5DB] dark:bg-[#3A342B] text-[#D4A843]'}`}>
                  <School size={20} />
                </div>
                <div className="space-y-1">
                  <span className="font-heading font-bold text-sm text-[#2C2518] dark:text-[#EFECE6] block">Educator</span>
                  <span className="text-[10px] text-[#8C8270] dark:text-[#A09685] block leading-snug">Lecturer or Faculty at MVGR</span>
                </div>
                {selectedRole === 'educator' && (
                  <div className="absolute top-4 right-4 w-5 h-5 bg-[#D4A843] text-white rounded-full flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            </div>

            <button
              onClick={handleNextStep}
              disabled={!selectedRole || !isMvgrEmail}
              className="w-full mt-4 font-heading font-semibold text-xs py-3.5 px-4 bg-[#D4A843] hover:bg-[#B58B2F] text-white rounded-2xl transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-[#D4A843]/15"
            >
              Continue <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {/* STEP 2: Profile Form */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-heading font-black text-2xl text-[#2C2518] dark:text-[#EFECE6]">
                Academic Profile
              </h2>
              <p className="text-xs text-[#8C8270] max-w-xs mx-auto leading-relaxed">
                Provide your details to customize recommendation lists and note feeds.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-[#2C2518] dark:text-[#EFECE6]">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[11px] flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium"
                  placeholder="E.g., John Doe"
                />
              </div>

              {/* Student Form fields */}
              {selectedRole === 'student' && (
                <>
                  {/* Student Type: Current / Alumni */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Student Status *</label>
                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      <label className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition select-none ${studentType === 'current' ? 'border-[#D4A843] bg-[#EAE5DB]/20 dark:bg-[#D4A843]/10 font-bold' : 'border-[#E6DFD3] dark:border-[#3A342B] bg-white dark:bg-[#2A251D] font-medium text-[#8C8270] dark:text-[#A09685]'}`}>
                        <input
                          type="radio"
                          name="studentType"
                          checked={studentType === 'current'}
                          onChange={() => setStudentType('current')}
                          className="sr-only"
                        />
                        Current Student
                      </label>
                      <label className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition select-none ${studentType === 'alumni' ? 'border-[#D4A843] bg-[#EAE5DB]/20 dark:bg-[#D4A843]/10 font-bold' : 'border-[#E6DFD3] dark:border-[#3A342B] bg-white dark:bg-[#2A251D] font-medium text-[#8C8270] dark:text-[#A09685]'}`}>
                        <input
                          type="radio"
                          name="studentType"
                          checked={studentType === 'alumni'}
                          onChange={() => setStudentType('alumni')}
                          className="sr-only"
                        />
                        Alumni
                      </label>
                    </div>
                  </div>

                  {/* Branch & dynamic Semester/GradYear row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Branch *</label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
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

                    {studentType === 'current' ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Semester *</label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
                        >
                          {Array.from({ length: 8 }).map((_, i) => (
                            <option key={i} value={i + 1}>Semester {i + 1}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Graduation Year *</label>
                        <input
                          type="number"
                          required
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium"
                          placeholder="E.g., 2026"
                        />
                      </div>
                    )}
                  </div>

                  {/* Regulation (Plain Text Field) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Academic Regulation *</label>
                    <input
                      type="text"
                      required
                      value={regulation}
                      onChange={(e) => setRegulation(e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium uppercase"
                      placeholder="e.g. R21, A3, R20"
                    />
                  </div>

                  {/* Roll Number (Optional) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Roll Number (Optional)</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium uppercase"
                      placeholder="E.g., 21331A05XX"
                    />
                  </div>
                </>
              )}

              {/* Educator Form fields */}
              {selectedRole === 'educator' && (
                <>
                  {/* Department (Maps to branch in database) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Department *</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
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

                  {/* Designation */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#2C2518] dark:text-[#EFECE6] font-bold">Designation *</label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843] font-medium"
                      placeholder="E.g., Assistant Professor"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 font-heading font-semibold text-xs py-3 px-4 border border-[#E6DFD3] hover:bg-[#EAE5DB]/35 text-[#8C8270] dark:text-[#A09685] rounded-2xl transition duration-150 flex items-center justify-center gap-1.5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] font-heading font-semibold text-xs py-3 px-4 bg-[#D4A843] hover:bg-[#B58B2F] text-white rounded-2xl transition duration-150 flex items-center justify-center gap-1.5 shadow-md shadow-[#D4A843]/15 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4">
                        <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                      </div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Onboard Profile'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 3: Welcome Screen */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-8"
          >
            {/* Animated Checkmark Circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
              className="w-16 h-16 rounded-full bg-[#00B894]/10 flex items-center justify-center text-[#00B894]"
            >
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </motion.div>

            <div className="space-y-2">
              <h2 className="font-heading font-black text-2xl text-[#2C2518] dark:text-[#EFECE6]">
                Profile Activated!
              </h2>
              <p className="text-xs text-[#8C8270] max-w-xs mx-auto leading-relaxed">
                Welcome to MVGR Material Hub, <span className="text-[#2C2518] dark:text-[#EFECE6] font-bold">{name}</span>! 🎉
              </p>
            </div>

            <p className="text-xs text-[#8C8270] max-w-xs leading-relaxed italic">
              Your account is successfully synced. You can now browse notes, download syllabus guides, and upload study documents.
            </p>

            <button
              onClick={handleExplore}
              className="w-full font-heading font-semibold text-xs py-3.5 px-4 bg-[#D4A843] hover:bg-[#B58B2F] text-white rounded-2xl transition duration-150 flex items-center justify-center gap-1.5 shadow-md shadow-[#D4A843]/15"
            >
              Explore Materials
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
