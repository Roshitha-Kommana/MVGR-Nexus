import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { Comment } from '../types/index.js';
import { Send, CornerDownRight, Trash2, Reply } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ElephantLoader from './ElephantLoader.js';

interface CommentSectionProps {
  materialId: string;
  currentUser: any; // Database user profile
}

export const CommentSection = ({ materialId, currentUser }: CommentSectionProps) => {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Fetch threaded comments
  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: ['comments', materialId],
    queryFn: async () => {
      const res = await api.get(`/materials/${materialId}/comments`);
      return res.data;
    }
  });

  const commentsList = data?.comments || [];

  // Mutation to add comment/reply
  const postCommentMutation = useMutation({
    mutationFn: async (payload: { text: string; parentCommentId?: string }) => {
      const res = await api.post(`/materials/${materialId}/comments`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', materialId] });
      setCommentText('');
      setReplyText('');
      setActiveReplyId(null);
    }
  });

  // Mutation to soft-delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/comments/${commentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', materialId] });
    }
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postCommentMutation.mutate({ text: commentText });
  };

  const handleSubmitReply = (parentCommentId: string) => {
    if (!replyText.trim()) return;
    postCommentMutation.mutate({ text: replyText, parentCommentId });
  };

  const handleDelete = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const formattedTime = new Date(comment.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <div 
        key={comment.id} 
        className={`flex flex-col gap-2 p-4 rounded-xl border border-background-borderLight/40 dark:border-background-borderDark/40 bg-background-light/40 dark:bg-background-dark/40 ${isReply ? 'ml-8 md:ml-12 border-l-2 border-l-primary/40' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary uppercase overflow-hidden">
              {comment.author?.photoUrl ? (
                <img src={comment.author.photoUrl} alt={comment.author.name} className="w-full h-full object-cover" />
              ) : (
                comment.author?.name.substring(0, 2)
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text-light dark:text-text-dark flex items-center gap-1.5">
                {comment.author?.name}
                {comment.author?.role === 'admin' && (
                  <span className="bg-rose-100 text-rose-600 border border-rose-200 text-[9px] px-1.5 rounded">Admin</span>
                )}
                {comment.author?.role === 'educator' && (
                  <span className="bg-[#FFF3CD] text-[#B7860B] border border-amber-200 text-[9px] px-1.5 rounded">Faculty</span>
                )}
                {comment.author?.role === 'contributor' && (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 rounded">Contributor</span>
                )}
              </span>
              <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Delete action */}
          {!comment.isDeleted && (comment.author?.id === currentUser?.id || currentUser?.role === 'admin') && (
            <button
              onClick={() => handleDelete(comment.id)}
              disabled={deleteCommentMutation.isPending}
              className="text-text-lightMuted dark:text-text-darkMuted hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition"
              title="Delete Comment"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Text */}
        <p className={`text-sm text-text-light dark:text-text-dark ${comment.isDeleted ? 'italic text-text-lightMuted dark:text-text-darkMuted' : ''}`}>
          {comment.text}
        </p>

        {/* Action Bar (Only for top-level, and if not deleted) */}
        {!isReply && !comment.isDeleted && (
          <div className="flex items-center gap-4 mt-1 border-t border-background-borderLight/30 dark:border-background-borderDark/30 pt-2">
            <button
              onClick={() => {
                setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                setReplyText('');
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              <Reply size={12} />
              Reply
            </button>
          </div>
        )}

        {/* Nested Reply Form */}
        {activeReplyId === comment.id && (
          <div className="flex gap-2 items-center mt-3 ml-4">
            <CornerDownRight size={16} className="text-text-lightMuted dark:text-text-darkMuted" />
            <input
              type="text"
              placeholder={`Reply to ${comment.author?.name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={() => handleSubmitReply(comment.id)}
              disabled={postCommentMutation.isPending || !replyText.trim()}
              className="p-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition disabled:opacity-50"
            >
              {postCommentMutation.isPending ? (
                <div className="w-3 h-3">
                  <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                </div>
              ) : (
                <Send size={12} />
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 mt-8">
      <h3 className="font-heading font-semibold text-lg text-text-light dark:text-text-dark border-b border-background-borderLight dark:border-background-borderDark pb-2">
        Comments ({commentsList.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
      </h3>

      {/* Main Comment Input */}
      <form onSubmit={handleSubmitComment} className="flex gap-3">
        <input
          type="text"
          placeholder="Add a comment or ask a question..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 text-sm px-4 py-2.5 border border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={postCommentMutation.isPending || !commentText.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition text-sm font-semibold disabled:opacity-50"
        >
          {postCommentMutation.isPending ? (
            <div className="w-4 h-4">
              <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
            </div>
          ) : (
            <>
              Send <Send size={14} />
            </>
          )}
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <ElephantLoader size="sm" text="Loading discussion board..." />
      ) : commentsList.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-lightMuted dark:text-text-darkMuted italic border border-dashed border-background-borderLight dark:border-background-borderDark rounded-xl">
          No comments yet. Start the conversation!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {commentsList.map(parent => (
            <div key={parent.id} className="flex flex-col gap-2">
              {renderComment(parent, false)}
              {parent.replies && parent.replies.map(reply => renderComment(reply, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
