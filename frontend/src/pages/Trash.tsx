import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Material } from '../types/index.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import ElephantLoader from '../components/ElephantLoader.js';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FolderOpen,
  Clock,
  Calendar,
  FileText,
  X,
  ChevronLeft,
  ShieldAlert,
} from 'lucide-react';

// Days left until auto-permanent-delete
const getDaysRemaining = (deletedAt: string | Date | null) => {
  if (!deletedAt) return 30;
  const deleted = new Date(deletedAt);
  const now = new Date();
  const diffMs = deleted.getTime() + 30 * 24 * 60 * 60 * 1000 - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const TrashItemCard = ({
  material,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: {
  material: Material;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}) => {
  const daysLeft = getDaysRemaining(material.deletedAt ?? null);
  const urgencyColor =
    daysLeft <= 3
      ? 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
      : daysLeft <= 10
      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
      : 'text-[#8C8270] dark:text-[#A09685] bg-[#F5F0E8] dark:bg-[#1E1B15] border-[#E6DFD3] dark:border-[#3A342B]';

  const deletedDate = material.deletedAt
    ? new Date(material.deletedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="group relative bg-white dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B]/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Red overlay for critically expiring items */}
      {daysLeft <= 3 && (
        <div className="absolute inset-0 rounded-2xl border-2 border-red-400/40 pointer-events-none animate-pulse" />
      )}

      <div className="flex items-start gap-4">
        {/* Material type icon block */}
        <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-rose-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-sm text-[#2C2518] dark:text-[#EFECE6] leading-tight line-clamp-2">
            {material.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-[#D4A843]/20 bg-[#D4A843]/5 text-[#D4A843] uppercase">
              {material.regulation}
            </span>
            <span className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685]">
              {material.branch}
            </span>
            <span className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] flex items-center gap-0.5">
              <FolderOpen size={9} /> {material.subject}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#8C8270] dark:text-[#A09685] font-bold">
            <Calendar size={10} />
            <span>Deleted: {deletedDate}</span>
          </div>
        </div>

        {/* Days remaining badge */}
        <div className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-center ${urgencyColor}`}>
          <div className="text-sm font-heading font-black leading-none">{daysLeft}</div>
          <div className="text-[8px] font-bold uppercase mt-0.5 flex items-center gap-0.5 justify-center">
            <Clock size={7} /> days left
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 mt-4">
        <button
          onClick={() => onRestore(material.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-heading font-bold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
        >
          <RotateCcw size={13} />
          Restore
        </button>
        <button
          onClick={() => onPermanentDelete(material.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-heading font-bold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
        >
          <X size={13} />
          Delete Forever
        </button>
      </div>
    </div>
  );
};

const Trash = () => {
  const { dbUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [confirmPermaDelete, setConfirmPermaDelete] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<{ id: string; type: 'restore' | 'delete' } | null>(null);

  // Fetch user's own trashed materials
  const { data, isLoading, isError } = useQuery<{ materials: Material[] }>({
    queryKey: ['trash', dbUser?.id],
    queryFn: async () => {
      const res = await api.get('/materials', {
        params: {
          showDeleted: 'true',
          uploadedBy: dbUser?.id,
          limit: '50',
        },
      });
      return res.data;
    },
    enabled: !!dbUser,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/materials/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setConfirmPermaDelete(null);
    },
  });

  const handleRestore = async (id: string) => {
    setActiveAction({ id, type: 'restore' });
    try {
      await restoreMutation.mutateAsync(id);
    } finally {
      setActiveAction(null);
    }
  };

  const handlePermanentDelete = (id: string) => {
    setConfirmPermaDelete(id);
  };

  const confirmAndDelete = async () => {
    if (!confirmPermaDelete) return;
    setActiveAction({ id: confirmPermaDelete, type: 'delete' });
    try {
      await permanentDeleteMutation.mutateAsync(confirmPermaDelete);
    } finally {
      setActiveAction(null);
    }
  };

  const trashedItems = data?.materials ?? [];

  if (isLoading) {
    return <ElephantLoader fullscreen text="Loading Trash..." />;
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8C8270] dark:text-[#A09685] hover:text-[#D4A843] transition"
        >
          <ChevronLeft size={14} /> Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center">
            <Trash2 size={18} className="text-rose-500" />
          </div>
          <div>
            <h1 className="font-heading font-black text-xl text-[#2C2518] dark:text-[#EFECE6]">
              My Trash
            </h1>
            <p className="text-[10px] font-bold text-[#8C8270] dark:text-[#A09685] uppercase tracking-wider">
              Items deleted in the last 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
          Deleted materials are kept for <strong>30 days</strong> before being permanently removed. You can restore them anytime before they expire, or delete them immediately if you're sure.
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <ShieldAlert size={40} className="text-red-400" />
          <p className="text-sm font-bold text-[#8C8270] dark:text-[#A09685]">
            Failed to load your Trash. Please try again.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isError && trashedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F0E8] dark:bg-[#2A251D] border border-[#E6DFD3] dark:border-[#3A342B] flex items-center justify-center">
            <Trash2 size={28} className="text-[#8C8270] dark:text-[#A09685] opacity-50" />
          </div>
          <div className="space-y-1">
            <p className="font-heading font-bold text-base text-[#2C2518] dark:text-[#EFECE6]">
              Trash is Empty
            </p>
            <p className="text-xs text-[#8C8270] dark:text-[#A09685]">
              Materials you delete will appear here for 30 days before being permanently removed.
            </p>
          </div>
          <Link
            to="/browse"
            className="text-xs font-bold text-[#D4A843] underline underline-offset-2"
          >
            Browse your materials →
          </Link>
        </div>
      )}

      {/* Trashed items grid */}
      {trashedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C8270] dark:text-[#A09685]">
              {trashedItems.length} item{trashedItems.length !== 1 ? 's' : ''} in Trash
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-1">
            {trashedItems.map((material) => (
              <TrashItemCard
                key={material.id}
                material={material}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                isRestoring={activeAction?.id === material.id && activeAction?.type === 'restore'}
                isDeleting={activeAction?.id === material.id && activeAction?.type === 'delete'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {confirmPermaDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#2A251D] border border-rose-200 dark:border-rose-900/40 p-6 rounded-2xl shadow-2xl space-y-5 font-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#2C2518] dark:text-[#EFECE6]">
                  Delete Permanently?
                </h3>
                <p className="text-[10px] font-bold text-[#8C8270] dark:text-[#A09685] mt-0.5 uppercase tracking-wide">
                  This cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs text-[#8C8270] dark:text-[#A09685] leading-relaxed">
              This material and its file will be <strong className="text-rose-500">permanently deleted</strong> from storage immediately. You will not be able to recover it.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmPermaDelete(null)}
                disabled={!!activeAction}
                className="flex-1 py-2.5 px-4 border border-[#E6DFD3] dark:border-[#3A342B] text-[#8C8270] dark:text-[#A09685] rounded-xl font-heading font-bold text-xs hover:bg-[#F5F0E8] dark:hover:bg-[#1E1B15] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                disabled={!!activeAction}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-heading font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {activeAction?.type === 'delete' ? (
                  <>
                    <span className="animate-spin text-white">⟳</span> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Yes, Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;
