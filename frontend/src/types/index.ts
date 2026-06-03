export interface User {
  id: string;
  supabaseUserId: string;
  name: string;
  email: string;
  branch: string;
  semester: number;
  regulation: string;
  rollNumber: string | null;
  role: 'student' | 'educator' | 'admin' | 'contributor';
  studentType?: 'current' | 'alumni' | null;
  graduationYear?: number | null;
  designation?: string | null;
  employeeId?: string | null;
  photoUrl: string | null;
  totalUploads: number;
  isBanned: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  title: string;
  subject: string;
  regulation: string; // "A3", "R21", etc. or "PLACEMENT"
  branch: string;
  semester: number;
  materialType: string;
  facultyName: string | null;
  academicYear: string | null;
  description: string | null;
  tags: string[] | null;
  s3Key: string;
  uploadedBy: string | null;
  uploaderName: string;
  downloadCount: number;
  averageRating: string; // Decimal string e.g. "4.50"
  totalRatings: number;
  isFeatured: boolean;
  isReported: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  uploader?: {
    name: string;
    photoUrl: string | null;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  supabaseUserId: string;
  photoUrl: string | null;
  role: 'student' | 'educator' | 'admin' | 'contributor';
}

export interface Comment {
  id: string;
  materialId: string;
  text: string;
  parentCommentId: string | null;
  isDeleted: boolean;
  createdAt: string;
  author: CommentAuthor;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_material' | 'comment_reply' | 'rating' | 'announcement' | 'comment';
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  materialId: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface RejectedUpload {
  id: string;
  supabaseUserId: string;
  uploaderName: string | null;
  originalFilename: string | null;
  rejectionReason: string;
  pageCount: number | null;
  extractedTextLength: number | null;
  rejectedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdBy: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface InterviewExperience {
  id: string;
  authorId: string;
  company: string;
  role: string;
  year: number | null;
  experience: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    supabaseUserId: string;
    photoUrl: string | null;
    branch: string;
  };
}

export interface PublicStats {
  totalMaterials: number;
  totalContributors: number;
  totalDownloads: number;
}
