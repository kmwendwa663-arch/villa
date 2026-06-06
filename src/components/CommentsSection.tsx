import React, { useEffect, useState, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, increment } from '../lib/firebase';
import { Comment } from '../types';
import { useAuth } from '../lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Loader2, Trash2, CornerDownRight, X, Reply } from 'lucide-react';
import { formatShortName } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom states for replies & deletes
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; authorId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Comment));
      setLoading(false);
    });

    return unsubscribe;
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const textToSend = content.trim();
    
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: profile.uid,
        authorName: profile.displayName || 'Anonymous Partner',
        content: textToSend,
        createdAt: serverTimestamp(),
        // Keep track of replies context
        parentId: replyTo?.id || null,
        replyToName: replyTo?.authorName || null,
        replyToId: replyTo?.authorId || null,
      });

      // Increment commentsCount in post
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1)
      });

      setContent('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error adding comment', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyClick = (com: Comment) => {
    setReplyTo({ id: com.id, authorName: com.authorName, authorId: com.authorId });
    setContent(`@${com?.authorName.split(' ')[0]} `);
    inputRef.current?.focus();
  };

  const handleDeleteComment = async (comId: string) => {
    setDeletingId(null);
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', comId));
      
      // Decrement commentsCount in post
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1)
      });
    } catch (error) {
      console.error('Failed deleting comment:', error);
    }
  };

  // Separate top-level comments and replies to maintain visual threads
  const primaryComments = comments.filter(c => !(c as any).parentId);
  const replies = comments.filter(c => (c as any).parentId);

  const getFormattedTime = (comment: Comment) => {
    if (comment.createdAt?.toDate) {
      return formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true });
    } else if (comment.createdAt instanceof Date) {
      return formatDistanceToNow(comment.createdAt, { addSuffix: true });
    } else if (typeof comment.createdAt === 'string' || typeof comment.createdAt === 'number') {
      const d = new Date(comment.createdAt);
      if (!isNaN(d.getTime())) {
        return formatDistanceToNow(d, { addSuffix: true });
      }
    }
    return 'now';
  };

  const renderCommentCard = (comment: Comment, isReply: boolean = false) => {
    const isOwn = profile?.uid === comment.authorId;
    return (
      <motion.div 
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`flex ${isReply ? 'ml-8' : ''} gap-4 group/comment relative`}
      >
        {isReply && (
          <div className="flex-shrink-0 flex items-start text-white/20 pt-4">
            <CornerDownRight className="w-4 h-4 text-purple-400" />
          </div>
        )}
        
        <div className={`flex-1 glass bg-white/[0.02] rounded-[24px] p-4 sm:p-5 border border-white/5 group-hover/comment:border-white/10 transition-all ${isReply ? 'bg-purple-950/5' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-display font-medium text-[11px] text-gold-500/95 uppercase tracking-wider">
                {formatShortName(comment.authorName)}
              </span>
              {(comment as any).replyToName && (
                <span className="text-[9px] font-medium text-white/30 lowercase">
                  replied to <span className="text-purple-400 font-bold">@{formatShortName((comment as any).replyToName).split(' ')[0]}</span>
                </span>
              )}
            </div>
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
              {getFormattedTime(comment)}
            </span>
          </div>
          <p className="text-white/80 text-xs sm:text-xs leading-relaxed font-sans">{comment.content}</p>
          
          <div className="mt-2.5 flex items-center justify-end gap-3 opacity-0 group-hover/comment:opacity-100 transition-opacity">
            <button 
              onClick={() => handleReplyClick(comment)}
              className="text-[9px] font-black uppercase text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
            {isOwn && (
              <button 
                onClick={() => setDeletingId(comment.id)}
                className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Comments List Container */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar py-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-gold-500/20 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center py-4 text-[10px] font-black text-white/15 uppercase tracking-[0.4em]">No transmissions added yet</p>
        ) : (
          <AnimatePresence initial={false}>
            {primaryComments.map(com => {
              const matchedReplies = replies.filter(r => (r as any).parentId === com.id);
              return (
                <div key={com.id} className="space-y-3">
                  {renderCommentCard(com, false)}
                  {matchedReplies.map(reply => renderCommentCard(reply, true))}
                </div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Reply Context Active Bar */}
      {replyTo && (
        <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-[11px] text-purple-300">
          <div className="flex items-center gap-1.5 uppercase font-black tracking-widest text-[9px]">
            <Reply className="w-3 h-3 text-purple-400" />
            <span>Replying to <span className="text-white">@{replyTo.authorName.split(' ')[0]}</span></span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setReplyTo(null);
              setContent('');
            }} 
            className="p-1 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      {profile && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contribute a thought..."
            className="flex-1 glass-input text-xs"
          />
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="btn-gold w-12 h-12 rounded-xl flex items-center justify-center p-0 disabled:opacity-30 transition-all shadow-none border-none cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* Deletion Dialog Confirmation Overlay */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-xs glass p-6 rounded-3xl border border-white/10 text-center space-y-4">
              <h4 className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em]">DESTRUCTIVE COMMAND</h4>
              <p className="text-white/60 text-xs font-mono uppercase tracking-widest">Delete comment permanently?</p>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteComment(deletingId)}
                  className="flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
