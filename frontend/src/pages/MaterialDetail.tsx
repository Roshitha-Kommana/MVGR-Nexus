import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { Material } from '../types/index.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import PDFViewer from '../components/PDFViewer.js';
import RatingStars from '../components/RatingStars.js';
import CommentSection from '../components/CommentSection.js';
import ElephantLoader from '../components/ElephantLoader.js';
import { 
  Download, 
  Calendar, 
  Tag, 
  Bookmark, 
  AlertTriangle, 
  Share2, 
  ChevronLeft,
  BookmarkCheck,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const MaterialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dbUser } = useCurrentUser();

  const [ratingInput, setRatingInput] = useState<number>(0);
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSoftDelete = async () => {
    if (!material) return;
    if (confirm('Are you sure you want to move this resource to the Trash? It will be stored for 30 days before being permanently deleted.')) {
      setIsDeleting(true);
      try {
        await api.delete(`/materials/${material.id}`);
        alert('Material moved to Trash successfully.');
        navigate('/');
      } catch (err: any) {
        console.error('Error soft-deleting material:', err);
        alert(err.response?.data?.error || 'Failed to move material to Trash.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleShare = async () => {
    if (!material) return;
    const shareData = {
      title: material.title,
      text: `Check out this study resource on MVGR Nexus: ${material.title}`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // 1. Fetch Material details
  const { data, isLoading, isError, refetch } = useQuery<{ material: Material; uploader: any }>({
    queryKey: ['material', id],
    queryFn: async () => {
      const res = await api.get(`/materials/${id}`);
      return res.data;
    }
  });

  // 2. Fetch User bookmark status
  const { data: bookmarkData } = useQuery<{ saved: Material[] }>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get('/bookmarks');
      return res.data;
    },
    enabled: !!dbUser
  });

  const material = data?.material;
  const uploader = data?.uploader;
  const isBookmarked = bookmarkData?.saved.some(m => m.id === id) || false;

  // 3. Rating mutation
  const rateMutation = useMutation({
    mutationFn: async (ratingValue: number) => {
      const res = await api.post(`/materials/${id}/rate`, { rating: ratingValue });
      return res.data;
    },
    onSuccess: (newData) => {
      queryClient.invalidateQueries({ queryKey: ['material', id] });
      setRatingInput(0);
      alert(`Thank you for rating! New Average: ${newData.averageRating}★`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to submit rating.');
    }
  });

  // 4. Bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await api.delete(`/bookmarks/${id}`);
      } else {
        await api.post(`/bookmarks/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });

  // 5. Download handle
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get(`/materials/${id}/download`);
      const downloadUrl = res.data.downloadUrl;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = material?.title ? `${material.title}.pdf` : 'material.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      queryClient.invalidateQueries({ queryKey: ['material', id] });
    } catch (err) {
      console.error('Download error:', err);
      alert('Error starting file download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 6. Submit Report handle
  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setIsReportSubmitting(true);
    try {
      await api.post('/reports', {
        materialId: id,
        reason: reportReason.trim()
      });
      alert('This material has been reported to administration. Thank you.');
      setShowReportModal(false);
      setReportReason('');
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to file report.');
    } finally {
      setIsReportSubmitting(false);
    }
  };

  if (isLoading) {
    return <ElephantLoader fullscreen text="Opening resource..." />;
  }

  if (isError || !material) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F5F0E8] dark:bg-[#1E1B15]">
        <AlertTriangle size={48} className="text-red-500 mb-2" />
        <h2 className="font-heading font-bold text-lg text-[#2C2518] dark:text-[#EFECE6]">Material Not Found</h2>
        <p className="text-sm text-[#8C8270] mt-1">This material may have been deleted by administrators.</p>
        <Link to="/browse" className="text-xs font-bold text-[#D4A843] underline mt-4 flex items-center gap-1">
          <ChevronLeft size={14} /> Back to Browse
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(material.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isPlacement = material.regulation === 'PLACEMENT';

  // Dynamic vertical gradients for the academic cover (matching MaterialCard)
  const getCoverGradient = (subject: string) => {
    const gradients = [
      'from-amber-600 via-amber-800 to-[#2A251D]',     // Academic Gold/Amber
      'from-emerald-700 via-emerald-900 to-[#142A1D]',   // Forest Green
      'from-blue-700 via-blue-900 to-[#102038]',         // Deep Blue
      'from-rose-700 via-rose-900 to-[#2B1015]',         // Burgundy
      'from-[#D4A843]/80 via-amber-900 to-[#15102D]'     // Indigo-Gold Mix
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash % gradients.length);
    return gradients[idx];
  };

  const coverGradient = getCoverGradient(material.subject);

  // Abbreviation helper
  const getSubjectAbbreviation = (subjectName: string) => {
    const clean = subjectName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return subjectName.substring(0, 3).toUpperCase();
  };

  const subjectAbbr = getSubjectAbbreviation(material.subject);

  return (
    <div className="max-w-7xl mx-auto px-1 py-4 space-y-6 text-[#2C2518] dark:text-[#EFECE6]">
      {/* Back button */}
      <Link to="/browse" className="inline-flex items-center gap-1 text-xs font-bold text-[#8C8270] dark:text-[#A09685] hover:text-[#D4A843] transition">
        <ChevronLeft size={16} /> Back to Library
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: 55% PDF Preview */}
        <div className="w-full lg:w-[55%] h-[400px] lg:h-[calc(100vh-140px)] rounded-2xl overflow-hidden shadow-premium border border-[#E6DFD3] dark:border-[#3A342B]/50 bg-white dark:bg-[#2A251D]">
          <PDFViewer fileUrl={`/api/materials/local-download?key=${encodeURIComponent(material.s3Key)}`} />
        </div>

        {/* Right Side: 45% Metadata Info Panel */}
        <div className="w-full lg:w-[45%] space-y-6">
          <div className="border border-[#E6DFD3] dark:border-[#3A342B]/50 bg-white dark:bg-[#2A251D] rounded-2xl p-6 shadow-premium space-y-6">
            
            {/* Textbook cover visual block (Mocking Image 2) */}
            <div className="flex justify-center py-2">
              <div className={`w-36 aspect-[3/4] rounded-2xl bg-gradient-to-br ${coverGradient} relative overflow-hidden shadow-md p-4 flex flex-col justify-between text-white select-none`}>
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/10" />
                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/5" />
                <div className="flex justify-between items-center z-10">
                  <div className="px-1.5 py-0.5 rounded bg-[#D4A843] text-white font-bold text-[8.5px] leading-none">
                    ⭐ {parseFloat(material.averageRating || '0').toFixed(1)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 text-center py-2 opacity-35">
                  <span className="font-heading font-black text-3xl tracking-widest text-white leading-none">
                    {subjectAbbr}
                  </span>
                  <span className="text-[8px] font-bold tracking-widest text-white uppercase mt-0.5">
                    {material.branch}
                  </span>
                </div>
                <div className="space-y-1 z-10 border-t border-white/15 pt-1.5">
                  <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-[#D4A843] block">
                    {material.materialType}
                  </span>
                  <div className="flex items-center justify-between text-[8px] text-white/80 font-bold leading-none">
                    <span>{material.branch}</span>
                    <span>{material.regulation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header info */}
            <div className="space-y-3.5 text-center lg:text-left">
              <div className="flex gap-2 flex-wrap items-center justify-center lg:justify-start">
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border border-[#D4A843]/20 bg-[#D4A843]/5 text-[#D4A843] uppercase">
                  {isPlacement ? 'Placement' : material.regulation}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border border-[#E6DFD3] dark:border-[#3A342B] text-[#8C8270] dark:text-[#A09685] bg-[#F5F0E8] dark:bg-[#1E1B15]">
                  {material.branch}
                </span>
                {!isPlacement && (
                  <span className="text-[9.5px] font-bold text-[#8C8270] dark:text-[#A09685]">
                    Semester {material.semester}
                  </span>
                )}
              </div>

              <h1 className="font-heading font-extrabold text-xl text-[#2C2518] dark:text-[#EFECE6] leading-snug">
                {material.title}
              </h1>

              <div className="flex items-center justify-center lg:justify-start gap-1.5 text-xs text-[#8C8270] dark:text-[#A09685] font-bold">
                <FolderOpen size={13} className="text-[#D4A843]" />
                {material.subject} <span className="opacity-50">•</span> <span className="text-[#D4A843]">{material.materialType}</span>
              </div>
            </div>

            {/* 4-column metric strip (Mocking Image 2) */}
            <div className="grid grid-cols-4 gap-2 bg-[#FBF8F3] dark:bg-[#1E1B15] border border-[#E6DFD3] dark:border-[#3A342B] p-3.5 rounded-xl text-center select-none shadow-sm">
              <div className="flex flex-col">
                <span className="text-[13px] font-heading font-black text-[#D4A843]">
                  {parseFloat(material.averageRating || '0').toFixed(1)}
                </span>
                <span className="text-[7.5px] text-[#8C8270] dark:text-[#A09685] font-bold uppercase mt-0.5">
                  Rating
                </span>
              </div>
              <div className="flex flex-col border-l border-[#E6DFD3] dark:border-[#3A342B]">
                <span className="text-[13px] font-heading font-black text-[#2C2518] dark:text-[#EFECE6]">
                  {material.downloadCount}
                </span>
                <span className="text-[7.5px] text-[#8C8270] dark:text-[#A09685] font-bold uppercase mt-0.5">
                  Downloads
                </span>
              </div>
              <div className="flex flex-col border-l border-[#E6DFD3] dark:border-[#3A342B]">
                <span className="text-[13px] font-heading font-black text-[#2C2518] dark:text-[#EFECE6] uppercase">
                  {material.branch}
                </span>
                <span className="text-[7.5px] text-[#8C8270] dark:text-[#A09685] font-bold uppercase mt-0.5">
                  Branch
                </span>
              </div>
              <div className="flex flex-col border-l border-[#E6DFD3] dark:border-[#3A342B]">
                <span className="text-[13px] font-heading font-black text-[#2C2518] dark:text-[#EFECE6] truncate px-1">
                  {material.regulation}
                </span>
                <span className="text-[7.5px] text-[#8C8270] dark:text-[#A09685] font-bold uppercase mt-0.5">
                  Reg
                </span>
              </div>
            </div>

            {/* Description */}
            {material.description && (
              <div className="p-3.5 bg-[#F5F0E8]/50 dark:bg-[#1E1B15]/30 border border-[#E6DFD3] dark:border-[#3A342B]/40 rounded-xl italic text-xs leading-relaxed text-[#8C8270] dark:text-[#A09685]">
                "{material.description}"
              </div>
            )}

            {/* Academic Meta fields */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold border-y border-[#E6DFD3] dark:border-[#3A342B]/40 py-4">
              <div className="space-y-1">
                <span className="text-[#8C8270] dark:text-[#A09685] block text-[9px] uppercase font-bold">Faculty Member</span>
                <span className="text-[#2C2518] dark:text-[#EFECE6] font-bold">{material.facultyName || 'Not Specified'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#8C8270] dark:text-[#A09685] block text-[9px] uppercase font-bold">Academic Year</span>
                <span className="text-[#2C2518] dark:text-[#EFECE6] font-bold">{material.academicYear || 'Not Specified'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#8C8270] dark:text-[#A09685] block text-[9px] uppercase font-bold">Upload Date</span>
                <span className="text-[#2C2518] dark:text-[#EFECE6] flex items-center gap-1 font-bold">
                  <Calendar size={12} /> {formattedDate}
                </span>
              </div>
            </div>

            {/* Tags display */}
            {material.tags && material.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-bold text-[#8C8270] dark:text-[#A09685] flex items-center gap-1">
                  <Tag size={10} /> Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {material.tags.map(tag => (
                    <span key={tag} className="text-[9.5px] font-semibold bg-[#F5F0E8] dark:bg-[#1E1B15] border border-[#E6DFD3] dark:border-[#3A342B] px-2 py-0.5 rounded-lg text-[#2C2518] dark:text-[#EFECE6]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rating display & Upsert block */}
            <div className="space-y-3 bg-[#FBF8F3] dark:bg-[#1E1B15]/30 border border-[#E6DFD3] dark:border-[#3A342B]/40 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Review Document Quality</span>
                <div className="flex items-center gap-1 font-heading font-black text-sm text-[#2C2518] dark:text-[#EFECE6]">
                  <span>{material.averageRating}★</span>
                  <span className="text-[10px] text-[#8C8270] dark:text-[#A09685] font-bold">({material.totalRatings} ratings)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8C8270] dark:text-[#A09685] font-bold">Your Score:</span>
                <RatingStars
                  rating={ratingInput || parseFloat(material.averageRating)}
                  interactive={true}
                  onChange={(val) => {
                    setRatingInput(val);
                    rateMutation.mutate(val);
                  }}
                />
              </div>
            </div>

            {/* Bookmark, Share & Report Action Strip */}
            <div className="flex gap-4">
              <button
                onClick={() => toggleBookmarkMutation.mutate()}
                className={`flex-1 py-3 px-4 rounded-xl border font-heading font-bold text-xs transition duration-150 flex items-center justify-center gap-1.5 hover:scale-[1.01] ${
                  isBookmarked 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' 
                    : 'border-[#E6DFD3] dark:border-[#3A342B] hover:bg-[#D4A843]/10 text-[#8C8270] dark:text-[#A09685]'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck size={15} /> Saved in Shelf
                  </>
                ) : (
                  <>
                    <Bookmark size={15} /> Bookmark Notes
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className={`flex-1 py-3 px-4 rounded-xl border font-heading font-bold text-xs transition duration-150 flex items-center justify-center gap-1.5 hover:scale-[1.01] ${
                  shareCopied
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : 'border-[#E6DFD3] dark:border-[#3A342B] hover:bg-[#D4A843]/10 text-[#8C8270] dark:text-[#A09685]'
                }`}
              >
                <Share2 size={15} />
                <span>{shareCopied ? 'Copied Link! ✅' : 'Share Resource'}</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="py-3 px-4 rounded-xl border border-[#E6DFD3] dark:border-[#3A342B] text-[#8C8270] dark:text-[#A09685] hover:text-red-500 hover:border-red-500/30 hover:bg-red-50/5 font-heading font-bold text-xs transition duration-150 flex items-center justify-center gap-1.5"
                title="Report File"
              >
                <AlertTriangle size={13} /> Report
              </button>
            </div>

            {/* Download Main button (Rich academic gold theme) */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3.5 px-4 bg-[#D4A843] hover:bg-[#B58B2F] text-white rounded-xl font-heading font-extrabold text-xs.5 tracking-wider transition duration-150 flex items-center justify-center gap-2 hover:scale-[1.01] shadow-md shadow-[#D4A843]/15 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4">
                    <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                  </div>
                  <span>Fetching secure link...</span>
                </>
              ) : (
                <>
                  <Download size={15} /> DOWNLOAD FULL PDF
                </>
              )}
            </button>

            {/* Owner/Admin Delete/Soft-Delete action button */}
            {dbUser && (dbUser.id === material.uploadedBy || dbUser.role === 'admin') && (
              <button
                onClick={handleSoftDelete}
                disabled={isDeleting}
                className="w-full py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-heading font-bold text-xs transition duration-150 flex items-center justify-center gap-1.5 hover:scale-[1.01] disabled:opacity-50"
              >
                <Trash2 size={15} /> Move to Trash
              </button>
            )}
          </div>

          {/* Uploader Profile Strip */}
          {uploader && (
            <div className="border border-[#E6DFD3] dark:border-[#3A342B]/40 bg-white dark:bg-[#2A251D] rounded-2xl p-4.5 shadow-premium flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center font-bold text-sm text-[#D4A843] uppercase overflow-hidden shrink-0">
                  {uploader.photoUrl ? (
                    <img src={uploader.photoUrl} alt={uploader.name} className="w-full h-full object-cover" />
                  ) : (
                    uploader.name.substring(0, 2)
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#8C8270] dark:text-[#A09685] font-bold uppercase tracking-wider">Uploaded By</span>
                  <Link to={`/profile/${uploader.supabaseUserId}`} className="text-xs.5 font-bold text-[#2C2518] dark:text-[#EFECE6] hover:text-[#D4A843] transition leading-none mt-0.5">
                    {uploader.name}
                  </Link>
                  <div className="mt-1">
                    {uploader.role === 'educator' ? (
                      <span className="inline-block text-[8px] font-extrabold uppercase tracking-wider bg-[#FBF8F3] dark:bg-[#1E1B15] text-[#D4A843] border border-[#D4A843]/20 px-1 rounded">
                        Faculty Member
                      </span>
                    ) : uploader.role === 'admin' ? (
                      <span className="inline-block text-[8px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-500 border border-rose-500/10 px-1 rounded">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-block text-[8px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-500 border border-emerald-500/10 px-1 rounded">
                        Student Contributor
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-[#2C2518] dark:text-[#EFECE6] block leading-none">{uploader.totalUploads}</span>
                <span className="text-[8px] uppercase font-bold text-[#8C8270] dark:text-[#A09685] tracking-wider mt-1 block">Total uploads</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flag Abuse Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleReport} className="w-full max-w-md bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] p-6 rounded-2xl shadow-2xl space-y-4 font-body">
            <h3 className="font-heading font-bold text-lg text-[#2C2518] dark:text-[#EFECE6] flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Report Study Material
            </h3>
            <p className="text-xs text-[#8C8270] dark:text-[#A09685] leading-relaxed">
              Flag this file if it contains incorrect content, copyright violations, wrong regulation tags, or corrupt files.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#2C2518] dark:text-[#EFECE6]">Reason for Flagging</label>
              <textarea
                required
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-3 border border-[#E6DFD3] dark:border-[#3A342B] bg-[#F5F0E8]/40 dark:bg-[#1E1B15] rounded-xl text-[#2C2518] dark:text-[#EFECE6] focus:outline-none focus:border-[#D4A843]"
                placeholder="Briefly describe why this notes sheet is inappropriate..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="px-4 py-2 border border-[#E6DFD3] dark:border-[#3A342B] text-[#8C8270] dark:text-[#A09685] rounded-xl hover:bg-[#D4A843]/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReportSubmitting || !reportReason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition disabled:opacity-50"
              >
                {isReportSubmitting ? 'Filing Report...' : 'File Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Threaded Comments Section */}
      {dbUser && <CommentSection materialId={id!} currentUser={dbUser} />}
    </div>
  );
};

export default MaterialDetail;
