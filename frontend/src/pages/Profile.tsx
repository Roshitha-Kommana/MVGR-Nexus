import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { MaterialCard } from '../components/MaterialCard.js';
import { Material, User } from '../types/index.js';
import { supabase } from '../lib/supabaseClient.js';
import ElephantLoader from '../components/ElephantLoader.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { 
  User as UserIcon, 
  Upload, 
  Download, 
  Star, 
  Edit, 
  Bookmark, 
  FileText,
  Loader2, 
  GraduationCap, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export const Profile = () => {
  const { supabaseUserId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dbUser } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<'uploads' | 'saved'>('uploads');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form states
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [semester, setSemester] = useState('1');
  const [regulation, setRegulation] = useState('');
  const [studentType, setStudentType] = useState<'current' | 'alumni'>('current');
  const [graduationYear, setGraduationYear] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [designation, setDesignation] = useState('');

  // 1. Fetch Target Profile Details
  const { data: profileUser, isLoading: isProfileLoading, isError } = useQuery<User>({
    queryKey: ['profile', supabaseUserId],
    queryFn: async () => {
      const res = await api.get(`/users/${supabaseUserId}`);
      return res.data;
    }
  });

  // 2. Fetch User's materials list
  const { data: uploadedMaterialsData, isLoading: isUploadsLoading } = useQuery<{ materials: Material[] }>({
    queryKey: ['userUploads', profileUser?.id],
    queryFn: async () => {
      const res = await api.get(`/materials?uploadedBy=${profileUser?.id}&limit=100`);
      return res.data;
    },
    enabled: !!profileUser?.id
  });

  // 3. Fetch User's bookmarks list (Only if view own profile)
  const isOwnProfile = dbUser && dbUser.supabaseUserId === supabaseUserId;
  
  const { data: savedMaterialsData, isLoading: isSavedLoading } = useQuery<{ saved: Material[] }>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get('/bookmarks');
      return res.data;
    },
    enabled: isOwnProfile
  });

  // 4. Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.patch(`/users/${supabaseUserId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', supabaseUserId] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setShowEditModal(false);
      alert('Profile updated successfully!');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.error || 'Failed to update profile.');
    }
  });

  const handleOpenEdit = () => {
    if (profileUser) {
      setName(profileUser.name);
      setBranch(profileUser.branch);
      setSemester(profileUser.semester ? String(profileUser.semester) : '1');
      setRegulation(profileUser.regulation || '');
      setStudentType((profileUser.studentType as 'current' | 'alumni') || 'current');
      setGraduationYear(profileUser.graduationYear ? String(profileUser.graduationYear) : '');
      setRollNumber(profileUser.rollNumber || '');
      setDesignation(profileUser.designation || '');
      setEditError(null);
      setShowEditModal(true);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!profileUser) return;
    if (!name.trim()) {
      setEditError('Full Name is required.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      branch
    };

    if (profileUser.role === 'student') {
      if (!regulation.trim()) {
        setEditError('Regulation is required (e.g. R21).');
        return;
      }
      payload.studentType = studentType;
      payload.regulation = regulation.trim().toUpperCase();
      payload.rollNumber = rollNumber.trim().toUpperCase() || null;
      if (studentType === 'current') {
        payload.semester = parseInt(semester);
        payload.graduationYear = null;
      } else {
        if (!graduationYear) {
          setEditError('Graduation year is required.');
          return;
        }
        payload.semester = null;
        payload.graduationYear = parseInt(graduationYear);
      }
    } else {
      if (!designation.trim()) {
        setEditError('Designation is required.');
        return;
      }
      payload.designation = designation.trim();
    }

    updateProfileMutation.mutate(payload);
  };

  if (isProfileLoading) {
    return <ElephantLoader fullscreen text="Loading profile details..." />;
  }

  if (isError || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background-light dark:bg-background-dark">
        <AlertCircle size={48} className="text-red-500 mb-2" />
        <h2 className="font-heading font-bold text-lg text-text-light dark:text-text-dark">User Not Found</h2>
        <p className="text-sm text-text-lightMuted dark:text-text-darkMuted mt-1">The user profile does not exist in MVGR Material Hub database.</p>
        <button onClick={() => navigate('/')} className="text-xs font-bold text-primary underline mt-4">Go Home</button>
      </div>
    );
  }

  const userMaterials = uploadedMaterialsData?.materials || [];
  const bookmarkedMaterials = savedMaterialsData?.saved || [];

  // Compute stats aggregates
  const totalDownloads = userMaterials.reduce((acc, m) => acc + m.downloadCount, 0);
  const ratedMaterials = userMaterials.filter(m => m.totalRatings > 0);
  const avgRating = ratedMaterials.length > 0 
    ? (ratedMaterials.reduce((acc, m) => acc + parseFloat(m.averageRating), 0) / ratedMaterials.length).toFixed(2)
    : '0.00';

  const regYear = new Date(profileUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Profile Bio Header */}
      <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Abstract Blur glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none translate-x-1/4 -translate-y-1/4" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-heading font-extrabold text-2xl text-primary uppercase overflow-hidden shadow-md">
            {profileUser.photoUrl ? (
              <img src={profileUser.photoUrl} alt={profileUser.name} className="w-full h-full object-cover" />
            ) : (
              profileUser.name.substring(0, 2)
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-text-light dark:text-text-dark leading-none">
                {profileUser.name}
              </h1>
              {profileUser.role === 'educator' ? (
                <span className="text-[9px] font-extrabold uppercase bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full tracking-wider">
                  Educator
                </span>
              ) : profileUser.role === 'admin' ? (
                <span className="text-[9px] font-extrabold uppercase bg-rose-100 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-full tracking-wider">
                  Admin
                </span>
              ) : (
                <span className="text-[9px] font-extrabold uppercase bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full tracking-wider">
                  Student
                </span>
              )}
            </div>
            
            {profileUser.role === 'educator' ? (
              <div className="flex items-center gap-1.5 text-xs text-text-lightMuted dark:text-text-darkMuted font-bold">
                <GraduationCap size={14} className="text-primary" />
                <span>{profileUser.branch} Department</span>
                <span>•</span>
                <span>{profileUser.designation}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-text-lightMuted dark:text-text-darkMuted font-bold flex-wrap">
                <GraduationCap size={14} className="text-primary" />
                <span>{profileUser.branch} Dept</span>
                <span>•</span>
                {profileUser.studentType === 'current' ? (
                  <>
                    <span>Semester {profileUser.semester}</span>
                    <span>•</span>
                    <span>Regulation {profileUser.regulation}</span>
                  </>
                ) : (
                  <>
                    <span>Alumni</span>
                    <span>•</span>
                    {profileUser.graduationYear && <span>Graduated {profileUser.graduationYear}</span>}
                    <span>•</span>
                    <span>Reg {profileUser.regulation}</span>
                  </>
                )}
              </div>
            )}


            {profileUser.role === 'student' && profileUser.rollNumber && (
              <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted font-bold tracking-widest block uppercase">
                Roll No: {profileUser.rollNumber}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 z-10 self-stretch md:self-auto justify-between border-t border-background-borderLight dark:border-background-borderDark pt-4 md:pt-0 md:border-t-0">
          <div className="text-left md:text-right pr-6 border-r border-background-borderLight dark:border-background-borderDark">
            <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Joined</span>
            <span className="text-xs font-black text-text-light dark:text-text-dark flex items-center gap-1 mt-0.5">
              <Calendar size={12} /> {regYear}
            </span>
          </div>

          {isOwnProfile && (
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleOpenEdit}
                className="py-2.5 px-4 rounded-xl border border-background-borderLight dark:border-background-borderDark hover:bg-primary/10 hover:border-primary/40 text-text-light dark:text-text-dark text-xs font-bold transition flex items-center gap-1.5"
              >
                <Edit size={14} /> Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-3 gap-4 border border-background-borderLight dark:border-background-borderDark bg-background-cardLight/60 dark:bg-background-cardDark/60 p-6 rounded-2xl shadow-md text-center">
        <div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mx-auto mb-1">
            <Upload size={18} />
          </div>
          <span className="text-xl sm:text-2xl font-heading font-black text-text-light dark:text-text-dark block">
            {profileUser.totalUploads}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase tracking-wider">
            Total Uploads
          </span>
        </div>

        <div className="border-x border-background-borderLight dark:border-background-borderDark">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mx-auto mb-1">
            <Download size={18} />
          </div>
          <span className="text-xl sm:text-2xl font-heading font-black text-text-light dark:text-text-dark block">
            {totalDownloads}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase tracking-wider">
            Downloads Received
          </span>
        </div>

        <div>
          <div className="p-2.5 rounded-xl bg-yellow-400/10 text-yellow-500 w-fit mx-auto mb-1">
            <Star size={18} className="fill-yellow-400" />
          </div>
          <span className="text-xl sm:text-2xl font-heading font-black text-text-light dark:text-text-dark block">
            {avgRating}★
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase tracking-wider">
            Average File Rating
          </span>
        </div>
      </div>

      {/* 3. List Tabs */}
      <div className="space-y-6">
        <div className="flex gap-4 border-b border-background-borderLight dark:border-background-borderDark">
          <button
            onClick={() => setActiveTab('uploads')}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'uploads'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-lightMuted dark:text-text-darkMuted hover:text-primary'
            }`}
          >
            <FileText size={14} /> My Uploaded Notes ({userMaterials.length})
          </button>

          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-150 flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-lightMuted dark:text-text-darkMuted hover:text-primary'
              }`}
            >
              <Bookmark size={14} /> Bookmarks ({bookmarkedMaterials.length})
            </button>
          )}
        </div>

        {/* Tab display grids */}
        {activeTab === 'uploads' ? (
          isUploadsLoading ? (
            <ElephantLoader size="sm" text="Loading uploads..." />
          ) : userMaterials.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-background-borderLight dark:border-background-borderDark rounded-2xl text-xs text-text-lightMuted dark:text-text-darkMuted italic bg-background-light/30 dark:bg-background-dark/30">
              No materials uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {userMaterials.map((mat) => (
                <MaterialCard key={mat.id} material={mat} />
              ))}
            </div>
          )
        ) : (
          isSavedLoading ? (
            <ElephantLoader size="sm" text="Loading bookmarks..." />
          ) : bookmarkedMaterials.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-background-borderLight dark:border-background-borderDark rounded-2xl text-xs text-text-lightMuted dark:text-text-darkMuted italic bg-background-light/30 dark:bg-background-dark/30">
              No bookmarked resources.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bookmarkedMaterials.map((mat) => (
                <MaterialCard key={mat.id} material={mat} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdate} className="w-full max-w-md bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-6 sm:p-8 rounded-2xl shadow-2xl space-y-4">
            <div>
              <h3 className="font-heading font-black text-lg text-text-light dark:text-text-dark flex items-center gap-1.5">
                <Edit className="text-primary" /> Edit Curriculum Profile
              </h3>
              <p className="text-[10px] text-text-lightMuted dark:text-text-darkMuted mt-0.5">Update details used to filter notes recommended to you.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle size={14} /> {editError}
              </div>
            )}

            <div className="space-y-4 text-xs font-semibold text-text-light dark:text-text-dark">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none focus:border-primary"
                  placeholder="John Doe"
                />
              </div>

              {/* Student edit form panel */}
              {profileUser.role === 'student' && (
                <>
                  {/* Student Type: Current / Alumni */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold">Student Status *</label>
                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      <label className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition select-none ${studentType === 'current' ? 'border-primary bg-primary/5 font-bold' : 'border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark font-medium text-text-lightMuted dark:text-text-darkMuted'}`}>
                        <input
                          type="radio"
                          name="studentType"
                          checked={studentType === 'current'}
                          onChange={() => setStudentType('current')}
                          className="sr-only"
                        />
                        Current
                      </label>
                      <label className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition select-none ${studentType === 'alumni' ? 'border-primary bg-primary/5 font-bold' : 'border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark font-medium text-text-lightMuted dark:text-text-darkMuted'}`}>
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
                      <label className="text-[10px] font-bold">Branch *</label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none focus:border-primary"
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
                        <label className="text-[10px] font-bold">Semester *</label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none"
                        >
                          {Array.from({ length: 8 }).map((_, i) => (
                            <option key={i} value={i + 1}>Sem {i + 1}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold">Graduation Year *</label>
                        <input
                          type="number"
                          required
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none focus:border-primary"
                          placeholder="e.g. 2026"
                        />
                      </div>
                    )}
                  </div>

                  {/* Regulation (Plain Text Field, Stored upper) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold">Regulation *</label>
                    <input
                      type="text"
                      required
                      value={regulation}
                      onChange={(e) => setRegulation(e.target.value)}
                      className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none uppercase font-semibold"
                      placeholder="e.g. R21, A3, R20"
                    />
                  </div>

                  {/* Roll Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold">Roll Number</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none uppercase"
                      placeholder="E.g., 21331A05XX"
                    />
                  </div>
                </>
              )}

              {/* Educator edit form panel */}
              {profileUser.role === 'educator' && (
                <>
                  {/* Department (Maps to branch) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold">Department *</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none focus:border-primary"
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
                    <label className="text-[10px] font-bold">Designation *</label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-xs focus:outline-none focus:border-primary"
                      placeholder="E.g., Assistant Professor"
                    />
                  </div>

                </>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted rounded-xl hover:bg-primary/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center">
                      <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
