import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { validatePDF } from '../components/PDFValidator.js';
import { api } from '../services/api.js';
import { Loader2, UploadCloud, AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react';
import ElephantLoader from '../components/ElephantLoader.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Upload = () => {
  const navigate = useNavigate();
  const { dbUser, isLoading: isUserLoading } = useCurrentUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Notes';

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [semester, setSemester] = useState('1');
  const [regulation, setRegulation] = useState('');
  const [materialType, setMaterialType] = useState(initialType);
  const [facultyName, setFacultyName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const section = searchParams.get('section'); // 'aptitude' | 'dsa' | 'interview_qa' | 'resumes' | 'coding_platforms' | null

  // Custom Labels & Placeholders based on placement section
  let headerText = "Upload Study Material";
  let descriptionText = "Contributors share materials with matching branches and semesters.";

  let titleLabel = "Material Title";
  let titlePlaceholder = "E.g., Operating Systems Lecture Notes Unit 1";

  let subjectLabel = "Subject Name";
  let subjectPlaceholder = "E.g., Database Management Systems";

  let descLabel = "Description";
  let descPlaceholder = "Brief description summarizing the content of these notes...";

  let facultyLabel = "Faculty Member (Optional)";
  let facultyPlaceholder = "E.g., Dr. Ch. V. Subbarao";

  let showAcademicFields = true;
  let showFacultyField = true;
  let showAcademicYearField = true;

  if (section === 'aptitude') {
    headerText = "Add Aptitude & Reasoning Resource";
    descriptionText = "Share aptitude guides, logical puzzles, or quantitative formulas.";
    titleLabel = "Aptitude Material Title";
    titlePlaceholder = "E.g., Quantitative Aptitude Cheat Sheet";
    subjectLabel = "Aptitude Topic";
    subjectPlaceholder = "E.g., Percentages, Permutations, Logical Puzzles";
    descLabel = "Aptitude Topic Summary";
    descPlaceholder = "E.g., Formula sheet covering percentages and probability shortcuts...";
    showAcademicFields = false;
    showFacultyField = false;
    showAcademicYearField = false;
  } else if (section === 'dsa') {
    headerText = "Add DSA Resource";
    descriptionText = "Share DSA worksheets, cheat sheets, or theory guides.";
    titleLabel = "DSA Resource Title";
    titlePlaceholder = "E.g., Graph Algorithms Cheat Sheet";
    subjectLabel = "Data Structure / Algorithm Topic";
    subjectPlaceholder = "E.g., Dynamic Programming, Trees, Binary Search";
    descLabel = "Included Problems / Guide Notes";
    descPlaceholder = "E.g., Includes implementations of DFS, BFS, and Dijkstra with code snippets...";
    showAcademicFields = false;
    showFacultyField = false;
    showAcademicYearField = false;
  } else if (section === 'interview_qa') {
    headerText = "Add Interview Q&A Resource";
    descriptionText = "Share company-specific interview question sets or study sheets.";
    titleLabel = "Q&A Document Title";
    titlePlaceholder = "E.g., Amazon SDE-1 Interview Questions";
    subjectLabel = "Target Company Name";
    subjectPlaceholder = "E.g., Amazon, TCS, Cognizant";
    facultyLabel = "Target Job Role";
    facultyPlaceholder = "E.g., Software Development Engineer (SDE)";
    descLabel = "Description of Rounds/Concepts Covered";
    descPlaceholder = "E.g., 50 coding questions and technical answers for TCS Digital coding test...";
    showAcademicFields = false;
    showAcademicYearField = false;
  } else if (section === 'resumes') {
    headerText = "Add Resume Template";
    descriptionText = "Share resume template previews and shareable edit links.";
    titleLabel = "Resume Template Title";
    titlePlaceholder = "E.g., Clean ATS-Friendly LaTeX Resume Template";
    subjectLabel = "Format / Tool Name";
    subjectPlaceholder = "E.g., LaTeX/Overleaf, Canva, MS Word";
    descLabel = "Template Access / Edit Link";
    descPlaceholder = "Provide Canva edit link, Google Drive file link, or Overleaf read-only template link...";
    showAcademicFields = false;
    showFacultyField = false;
    showAcademicYearField = false;
  } else if (section === 'coding_platforms') {
    headerText = "Add Coding Platform Guide";
    descriptionText = "Share study checklists, curation list sheets, or profiles.";
    titleLabel = "Platform Guide Title";
    titlePlaceholder = "E.g., LeetCode 75 Curated Study Guide";
    subjectLabel = "Platform Name";
    subjectPlaceholder = "E.g., LeetCode, CodeForces, HackerRank";
    descLabel = "Recommended Study Link / Walkthrough";
    descPlaceholder = "Provide link to profile, problem list, or playlist...";
    showAcademicFields = false;
    showFacultyField = false;
    showAcademicYearField = false;
  }

  // Autocomplete state
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // PDF Pre-validation status
  const [pdfCheckStatus, setPdfCheckStatus] = useState<'idle' | 'validating' | 'valid' | 'warning' | 'invalid'>('idle');
  const [pdfCheckReason, setPdfCheckReason] = useState('');
  const [isWarningConfirmed, setIsWarningConfirmed] = useState(false);

  // Dynamic autocomplete query
  useEffect(() => {
    const fetchSubjects = async () => {
      if (regulation.trim() && branch) {
        try {
          const res = await api.get(`/subjects?regulation=${regulation.trim()}&branch=${branch}`);
          setSubjectSuggestions(res.data.subjects || []);
        } catch (err) {
          console.error('Error autocomplete suggestions:', err);
        }
      }
    };
    fetchSubjects();
  }, [regulation, branch]);

  // Enforce access control: Onboarded users only
  useEffect(() => {
    if (!isUserLoading && dbUser) {
      if (dbUser.role !== 'student' && dbUser.role !== 'educator' && dbUser.role !== 'admin') {
        alert('Access Denied: Only onboarded Students, Educators, and Admins can upload resources.');
        navigate('/');
      }
    }
  }, [dbUser, isUserLoading, navigate]);

  // Handle local PDF checks
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setFile(null);
      setPdfCheckStatus('invalid');
      setPdfCheckReason('Invalid file type. Please upload a PDF file.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setFile(null);
      setPdfCheckStatus('invalid');
      setPdfCheckReason('File exceeds the 25MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selectedFile);
    setPdfCheckStatus('validating');
    setPdfCheckReason('');
    setIsWarningConfirmed(false);

    // Call browser-side validator helper
    const result = await validatePDF(selectedFile);

    if (!result.valid) {
      setPdfCheckStatus('invalid');
      setPdfCheckReason(result.reason || 'PDF validation failed.');
    } else if (result.textLength && result.textLength >= 50 && result.textLength <= 150) {
      setPdfCheckStatus('warning');
      setPdfCheckReason(`This PDF has very little text (${result.textLength} chars). Are you sure it's correct?`);
    } else {
      setPdfCheckStatus('valid');
      setPdfCheckReason('PDF looks healthy and text-based.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) {
      setErrorMsg('Please select a PDF file to upload.');
      return;
    }

    if (pdfCheckStatus === 'invalid') {
      setErrorMsg('Cannot upload an invalid PDF. Fix the errors below.');
      return;
    }

    if (pdfCheckStatus === 'warning' && !isWarningConfirmed) {
      setErrorMsg('Please confirm that the low-text PDF is correct before submitting.');
      return;
    }

    const finalRegulation = isPlacementType || section
      ? 'PLACEMENT'
      : regulation.trim().toUpperCase();

    if (!isPlacementType && !section && !finalRegulation) {
      setErrorMsg('Please specify a regulation.');
      return;
    }

    const finalBranch = section ? 'PLACEMENT' : branch;
    const finalSemester = section ? '1' : semester;

    // Build tags with section-specific keyword if needed
    let finalTags = tags.trim();
    if (section) {
      const sectionTags: Record<string, string> = {
        aptitude: 'aptitude',
        dsa: 'dsa',
        interview_qa: 'qa',
        resumes: 'resume',
        coding_platforms: 'platform'
      };
      const newTag = sectionTags[section];
      if (newTag) {
        if (finalTags) {
          if (!finalTags.toLowerCase().includes(newTag)) {
            finalTags = `${finalTags}, ${newTag}`;
          }
        } else {
          finalTags = newTag;
        }
      }
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('subject', subject.trim());
    formData.append('regulation', finalRegulation.toUpperCase());
    formData.append('branch', finalBranch);
    formData.append('semester', finalSemester);
    formData.append('materialType', materialType);
    formData.append('facultyName', facultyName.trim());
    formData.append('academicYear', academicYear.trim());
    formData.append('description', description.trim());
    formData.append('tags', finalTags);

    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Upload successful!');
      navigate(`/material/${res.data.materialId}`);
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to upload document. Please check file properties.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return <ElephantLoader fullscreen text="Verifying session details..." />;
  }

  const isPlacementType = materialType.includes('Placement') || materialType.includes('Coding') || materialType.includes('Interview');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-text-lightMuted dark:text-text-darkMuted hover:text-primary transition">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>

      <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary to-indigo-500" />
        
        <div>
          <h2 className="font-heading font-black text-2xl text-text-light dark:text-text-dark tracking-tight">{headerText}</h2>
          <p className="text-xs text-text-lightMuted dark:text-text-darkMuted mt-1">{descriptionText}</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-semibold text-text-light dark:text-text-dark">
          {/* File input drag and drop area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">PDF Document (Max 25MB)</label>
            <div className="relative border-2 border-dashed border-background-borderLight dark:border-background-borderDark rounded-xl p-6 hover:border-primary/50 dark:hover:border-primary/50 transition bg-background-light/20 dark:bg-background-dark/20 text-center">
              <input
                type="file"
                accept=".pdf"
                required
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <UploadCloud size={32} className="text-primary" />
                <span className="text-xs font-bold">{file ? file.name : 'Select or drop PDF document here'}</span>
                <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted">Only PDF file extensions are supported</span>
              </div>
            </div>

            {/* Validation feedback logs */}
            {pdfCheckStatus === 'validating' && (
              <div className="flex items-center gap-1.5 text-primary mt-1">
                <div className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center">
                  <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                </div>
                <span>Analyzing pages and scanning text...</span>
              </div>
            )}
            {pdfCheckStatus === 'valid' && (
              <div className="flex items-center gap-1.5 text-emerald-500 mt-1">
                <CheckCircle2 size={12} /> {pdfCheckReason}
              </div>
            )}
            {pdfCheckStatus === 'invalid' && (
              <div className="flex items-center gap-1.5 text-red-500 mt-1">
                <AlertCircle size={12} /> {pdfCheckReason}
              </div>
            )}
            {pdfCheckStatus === 'warning' && (
              <div className="p-3 bg-yellow-400/10 border border-yellow-400/35 rounded-xl flex flex-col gap-2 mt-1">
                <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{pdfCheckReason}</span>
                </div>
                <label className="flex items-center gap-2 text-[10px] text-text-lightMuted dark:text-text-darkMuted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isWarningConfirmed}
                    onChange={(e) => setIsWarningConfirmed(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-yellow-500 bg-background-light dark:bg-background-dark border-background-borderLight dark:border-background-borderDark"
                  />
                  Yes, I confirm this PDF is correct (e.g. syllabus, cover, or blueprint sheet).
                </label>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">{titleLabel}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
              placeholder={titlePlaceholder}
            />
          </div>

          {showAcademicFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
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
                <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <option key={i} value={i + 1}>Semester {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!section && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Material Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Material Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
                >
                  <option value="Notes">Notes</option>
                  <option value="Lab Manual">Lab Manual</option>
                  <option value="Previous Year Question Paper">Previous Year Question Paper</option>
                  <option value="Assignment Solution">Assignment Solution</option>
                  <option value="Placement Resource">Placement Resource</option>
                  <option value="Coding Resource">Coding Resource</option>
                  <option value="Interview Experience">Interview Experience</option>
                </select>
              </div>

              {/* Regulation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Regulation</label>
                {isPlacementType ? (
                  <div className="p-3 bg-background-light dark:bg-background-dark/30 border border-background-borderLight dark:border-background-borderDark rounded-xl text-[10px] text-text-lightMuted dark:text-text-darkMuted italic font-bold">
                    Placement Resources are visible globally (no regulation filtering).
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
                    className="w-full text-xs p-3 bg-white dark:bg-[#2A251D] border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary uppercase font-semibold"
                    placeholder="e.g. R21, A3, R20"
                  />
                )}
              </div>
            </div>
          )}

          {/* Subject Autocomplete */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">{subjectLabel}</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setShowSubjectDropdown(true);
              }}
              onFocus={() => setShowSubjectDropdown(true)}
              className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
              placeholder={subjectPlaceholder}
            />
            {showSubjectDropdown && subjectSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark rounded-xl shadow-xl z-20 max-h-36 overflow-y-auto">
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
                      className="w-full text-left px-3 py-2 text-xs text-text-light hover:bg-primary/10 hover:text-primary dark:text-text-dark transition border-b border-background-borderLight/35 dark:border-background-borderDark/35 last:border-b-0"
                    >
                      {s}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {(showFacultyField || showAcademicYearField) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Faculty Name */}
              {showFacultyField && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">{facultyLabel}</label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
                    placeholder={facultyPlaceholder}
                  />
                </div>
              )}

              {/* Academic Year */}
              {showAcademicYearField && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
                    placeholder="E.g., 2025-26"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">{descLabel}</label>
              <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted font-bold">
                {description.length}/300 chars
              </span>
            </div>
            <textarea
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 border border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
              placeholder={descPlaceholder}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full text-xs p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
              placeholder="E.g., dbms, sql, relational-algebra, unit-2"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || pdfCheckStatus === 'invalid' || (pdfCheckStatus === 'warning' && !isWarningConfirmed)}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-heading font-extrabold text-sm transition duration-150 flex items-center justify-center gap-2 hover:scale-101 disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center">
                  <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                </div>
                <span>Broadcasting and uploading notes...</span>
              </>
            ) : (
              'Upload and Publish resource'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
