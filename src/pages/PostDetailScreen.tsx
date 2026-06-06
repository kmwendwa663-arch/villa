import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, increment, deleteDoc, setDoc, query, orderBy, getDocs, where } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Post, Comment } from '../types';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Send, Loader2, Tag, Calendar, X, Trash2, CornerDownRight, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatShortName, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../lib/notifications';

export function PostDetailScreen() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Unified States for real posts
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // Likes and Bookmarks
  const [hasLiked, setHasLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Comment input state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Real comment list (Firebase)
  const [realComments, setRealComments] = useState<Comment[]>([]);
  const [realCommentsLoading, setRealCommentsLoading] = useState(false);

  // Threaded replies and deletes states
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; authorId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Page Load Effect
  useEffect(() => {
    if (!postId) return;

    setLoading(true);

    // Handle Real Firebase Post Loading
    const postRef = doc(db, 'posts', postId);
    
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const loadedData = { id: docSnap.id, ...docSnap.data() } as Post;
        setPost(loadedData);
        setLikesCount(loadedData.likesCount || 0);

        // Listen to bookmarks status for Real Post
        const savedBookmark = localStorage.getItem(`real_bookmark_${postId}`);
        setIsBookmarked(savedBookmark === 'true');
      } else {
        setPost(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching real post:", err);
      setLoading(false);
    });

    // Listen to Likes status for Real Post
    let unsubscribeLike = () => {};
    if (profile) {
      const likeRef = doc(db, 'posts', postId, 'likes', profile.uid);
      unsubscribeLike = onSnapshot(likeRef, (docSnap) => {
        setHasLiked(docSnap.exists());
      }, (err) => {
        console.error("Error reading real post like status:", err);
      });
    }

    // Read real comments from subcollection
    setRealCommentsLoading(true);
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setRealComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Comment));
      setRealCommentsLoading(false);
    }, (err) => {
      console.error("Error monitoring real comments:", err);
      setRealCommentsLoading(false);
    });

    return () => {
      unsubscribePost();
      unsubscribeComments();
      unsubscribeLike();
    };
  }, [postId, profile?.uid]);

  // Handle Like Action
  const handleLike = async () => {
    if (!postId || !post || !profile) return;
    try {
      const likeRef = doc(db, 'posts', postId, 'likes', profile.uid);
      if (hasLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', postId), {
          likesCount: increment(-1)
        });
      } else {
        await setDoc(likeRef, { userId: profile.uid, createdAt: new Date().toISOString() });
        await updateDoc(doc(db, 'posts', postId), {
          likesCount: increment(1)
        });
        if (post.userId !== profile.uid) {
          await createNotification({
            userId: post.userId,
            type: 'like',
            username: profile.displayName || 'Collective partner',
            text: `${profile.displayName || 'Collective partner'} liked your wave broadcast`,
            avatarInitials: (profile.displayName || 'CP').substring(0, 2).toUpperCase(),
            avatarColor: '#EF4444',
            postId: postId,
            postThumb: post.imageUrl || ''
          });
        }
      }
    } catch (error) {
      console.error("Error updating like position:", error);
    }
  };

  // Handle Bookmark Action
  const handleBookmark = () => {
    if (!postId) return;
    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    localStorage.setItem(`real_bookmark_${postId}`, String(nextBookmarked));
  };

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !postId || !post || !newComment.trim()) return;

    setSubmittingComment(true);
    const commentText = newComment.trim();

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: profile.uid,
        authorName: profile.displayName,
        content: commentText,
        createdAt: serverTimestamp(),
        parentId: replyTo?.id || null,
        replyToName: replyTo?.authorName || null,
        replyToId: replyTo?.authorId || null,
      });

      // Trigger an update to increment comment status on the post document
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1)
      });

      setNewComment('');
      setReplyTo(null);

      // Send general comment notification to post creator if not self
      if (post.userId !== profile.uid) {
        await createNotification({
          userId: post.userId,
          type: 'comment',
          username: profile.displayName || 'Collective partner',
          text: `${profile.displayName || 'Collective partner'} commented: '${commentText.length > 30 ? commentText.substring(0, 30) + '...' : commentText}'`,
          avatarInitials: (profile.displayName || 'CP').substring(0, 2).toUpperCase(),
          avatarColor: '#9333EA',
          postId: postId,
          postThumb: post.imageUrl || ''
        });
      }

      // Check for @username mentions and trigger mention notification
      const mentionMatches = commentText.match(/@(\w+)/g);
      if (mentionMatches) {
        for (const match of mentionMatches) {
          const mentionedUsername = match.substring(1).toLowerCase();
          const usersQ = query(collection(db, 'users'), where('username', '==', mentionedUsername));
          const uSnap = await getDocs(usersQ);
          if (!uSnap.empty) {
            const mentionedUser = uSnap.docs[0];
            if (mentionedUser.id !== profile.uid) {
              await createNotification({
                userId: mentionedUser.id,
                type: 'mention',
                username: profile.displayName || 'Collective partner',
                text: `${profile.displayName || 'Collective partner'} mentioned you in a comment`,
                avatarInitials: (profile.displayName || 'CP').substring(0, 2).toUpperCase(),
                avatarColor: '#F59E0B',
                postId: postId,
                postThumb: post.imageUrl || ''
              });
            }
          }
        }
      }

      setNewComment('');
    } catch (error) {
      console.error("Failed to append commentary:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper to delete comment on Firestore
  const handleDeleteComment = async (comId: string) => {
    if (!postId) return;
    setDeletingId(null);
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', comId));
      
      // Decrement commentsCount on the post document
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1)
      });
    } catch (error) {
      console.error('Failed deleting comment:', error);
    }
  };

  // Human Readable date formatting
  const getFormattedDate = (dateVal: any) => {
    if (!dateVal) return 'recently';
    if (dateVal.toDate) return formatDistanceToNow(dateVal.toDate(), { addSuffix: true });
    if (dateVal instanceof Date) return formatDistanceToNow(dateVal, { addSuffix: true });
    
    // Fallback string parse
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      return formatDistanceToNow(parsed, { addSuffix: true });
    }
    return 'recently';
  };

  // Render Component View
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Focusing resonance channel...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h3 className="text-xl font-display font-black text-rose-500 tracking-wider mb-2 uppercase">TRANSMISSION LOST</h3>
        <p className="text-xs text-white/40 uppercase tracking-widest max-w-sm">The selected message node could not be retrieved from the network cluster.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 text-white/80"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const displayedCommentsCount = realComments.length;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Top Header Row with dynamic background */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/50 hover:text-gold-500 hover:bg-gold-500/10 border border-white/5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
        </button>
        <div className="text-center">
          <h2 className="text-xs font-display font-black tracking-[0.4em] text-white/30 uppercase">TRANSMISSION INTERFACE</h2>
        </div>
        <div className="w-[50px] sm:w-[80px]" /> {/* Spacer */}
      </div>

      {/* Main Grid: Split on desktop, single flow on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
        
        {/* Left column: Post content and Media */}
        <div className="flex-1 overflow-y-auto no-scrollbar glass rounded-[32px] border border-white/5 p-5 sm:p-7 flex flex-col bg-black/40">
          
          {/* Author Header */}
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={post.authorPhoto} 
              alt={post.authorName} 
              className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10"
            />
            <div>
              <h3 className="font-display font-bold text-base text-white tracking-wide uppercase leading-none mb-1">
                {formatShortName(post.authorName)}
              </h3>
              <div className="flex items-center gap-2 text-[8px] font-bold text-white/40 uppercase tracking-widest">
                <Calendar className="w-3 h-3 text-gold-500/50" />
                <span>{getFormattedDate(post.createdAt)}</span>
                {post.category && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-gold-500/80">{post.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Picture frame */}
          {post.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/5 mb-6 bg-black/40 flex-shrink-0 group">
              <img 
                src={post.imageUrl} 
                alt="Transmitted Inspiration" 
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[420px] object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Caption body */}
          <div className="flex-1">
            <p className="font-serif text-lg sm:text-xl text-white/90 leading-relaxed italic mb-6">
              "{post.content}"
            </p>

            {/* Hashtag pills */}
            {post.category && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-gold-500/10 text-gold-500 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {post.category}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl bg-white/[0.03] text-white/50">#Culture</span>
                <span className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl bg-white/[0.03] text-white/50">#Exclusive</span>
              </div>
            )}
          </div>

          {/* Control bar */}
          <div className="flex items-center gap-6 pt-5 border-t border-white/5 mt-auto flex-shrink-0">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] transition-all cursor-pointer",
                hasLiked ? "text-rose-400" : "text-white/40 hover:text-white"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl transition-all",
                hasLiked ? "bg-rose-500/10 shadow-[0_0_15px_rgba(251,113,133,0.15)]" : "bg-white/[0.03]"
              )}>
                <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
              </div>
              <span>{likesCount}</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-black text-white/40 uppercase tracking-[0.15em]">
              <div className="p-2.5 rounded-xl bg-white/[0.03]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>{displayedCommentsCount}</span>
            </div>

            <button 
              onClick={handleBookmark}
              className={cn(
                "p-2.5 rounded-xl bg-white/[0.03] text-white/40 hover:text-gold-500 active:scale-95 transition-all ml-auto cursor-pointer",
                isBookmarked && "text-gold-500 bg-gold-500/10"
              )}
              title="Bookmark post"
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
            </button>

            <button 
              className="p-2.5 rounded-xl bg-white/[0.03] text-white/40 hover:text-white transition-all cursor-pointer"
              title="Share transmission"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Channel wave link copied to credentials!");
              }}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right column: Comments and Input */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col h-full bg-black/40 glass rounded-[32px] border border-white/5 overflow-hidden">
          
          {/* Header */}
          <div className="p-5 border-b border-white/5 bg-black/20 flex-shrink-0 flex items-center justify-between">
            <h3 className="font-display font-black text-sm text-white tracking-widest uppercase">COMMENTS FEED</h3>
            <span className="text-[10px] font-black tracking-widest bg-gold-500/10 text-gold-500 px-2.5 py-1 rounded-lg border border-gold-500/10">
              {displayedCommentsCount} SECURE CHANNELS
            </span>
          </div>

          {/* Comments Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/10">
            {realCommentsLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
              </div>
            ) : realComments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 opacity-30 text-center">
                <MessageCircle className="w-8 h-8 mb-2 text-white/25" />
                <p className="text-[9px] font-black uppercase tracking-wider">No comments logged in collection.</p>
              </div>
            ) : (
              (() => {
                const primaryComments = realComments.filter(c => !(c as any).parentId);
                const replyComments = realComments.filter(c => (c as any).parentId);
                
                return (
                  <AnimatePresence initial={false}>
                    {primaryComments.map((com) => {
                      const matchedReplies = replyComments.filter(r => (r as any).parentId === com.id);
                      const isOwnMain = profile?.uid === com.authorId;
                      return (
                        <div key={com.id} className="space-y-3">
                          {/* Main Comment */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-3.5 rounded-2xl glass-dark border border-white/5 flex gap-2 flex-col group/com relative animate-fade-in"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display font-medium text-[11px] text-gold-500/90 tracking-widest uppercase">
                                {formatShortName(com.authorName)}
                              </span>
                              <span className="text-[8px] font-medium tracking-wider text-white/20 uppercase">
                                {getFormattedDate(com.createdAt)}
                              </span>
                            </div>
                            <p className="text-white/80 text-xs leading-relaxed">{com.content}</p>
                            
                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover/com:opacity-100 transition-opacity mt-1">
                              <button 
                                onClick={() => {
                                  setReplyTo({ id: com.id, authorName: com.authorName, authorId: com.authorId });
                                  setNewComment(`@${com.authorName.split(' ')[0]} `);
                                }}
                                className="text-[9px] font-black uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Reply className="w-3 h-3" />
                                <span>Reply</span>
                              </button>
                              {isOwnMain && (
                                <button 
                                  onClick={() => setDeletingId(com.id)}
                                  className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </motion.div>

                          {/* Replies */}
                          {matchedReplies.map((reply) => {
                            const isOwnReply = profile?.uid === reply.authorId;
                            return (
                              <motion.div 
                                key={reply.id} 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="pl-6 flex gap-3 relative group/com"
                              >
                                <div className="absolute left-2.5 top-0 bottom-4 w-0.5 bg-purple-500/10 border-l border-dashed border-purple-500/20" />
                                <div className="flex-shrink-0 pt-3 text-purple-400">
                                  <CornerDownRight className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 p-3.5 rounded-2xl bg-purple-950/5 border border-purple-500/5 hover:border-purple-500/15 flex gap-2 flex-col">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-display font-medium text-[11px] text-gold-500/90 tracking-widest uppercase">
                                        {formatShortName(reply.authorName)}
                                      </span>
                                      <span className="text-[9px] font-medium text-white/30 lowercase">
                                        replied to <span className="text-purple-400 font-bold">@{formatShortName((reply as any).replyToName || '').split(' ')[0]}</span>
                                      </span>
                                    </div>
                                    <span className="text-[8px] font-medium tracking-wider text-white/30 uppercase">
                                      {getFormattedDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-white/80 text-xs leading-relaxed">{reply.content}</p>
                                  
                                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover/com:opacity-100 transition-opacity mt-1">
                                    <button 
                                      onClick={() => {
                                        setReplyTo({ id: com.id, authorName: reply.authorName, authorId: reply.authorId });
                                        setNewComment(`@${reply.authorName.split(' ')[0]} `);
                                      }}
                                      className="text-[9px] font-black uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Reply className="w-3 h-3" />
                                      <span>Reply</span>
                                    </button>
                                    {isOwnReply && (
                                      <button 
                                        onClick={() => setDeletingId(reply.id)}
                                        className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </AnimatePresence>
                );
              })()
            )}
          </div>

          {/* Replying Status Bar */}
          {replyTo && (
            <div className="bg-purple-950/40 border-t border-purple-500/10 px-4 py-2.5 flex items-center justify-between text-[11px] text-purple-300 flex-shrink-0">
              <span className="font-black text-[9px] tracking-widest uppercase flex items-center gap-1.5 select-none">
                <Reply className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Replying to <span className="text-white">@{replyTo.authorName.split(' ')[0]}</span></span>
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setReplyTo(null);
                  setNewComment('');
                }} 
                className="p-1 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reply Bar */}
          {profile && (
            <form 
              onSubmit={handleAddComment}
              className="p-4 border-t border-white/5 bg-black/60 flex-shrink-0 flex items-center gap-3"
            >
              <img 
                src={profile.photoURL} 
                alt="My profile" 
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-gold-500/20"
              />
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 glass-input text-xs border-none rounded-xl py-3 px-4 shadow-inner focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="btn-gold w-10 h-10 rounded-xl flex items-center justify-center p-0 hover:scale-105 disabled:opacity-30 disabled:scale-100 flex-shrink-0 border-none cursor-pointer"
              >
                {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

        </div>

      </div>

      {/* Deletion Dialog Confirmation Overlay */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-xs glass p-6 rounded-3xl border border-white/10 text-center space-y-4">
              <h4 className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em]">DESTRUCTIVE ACTION</h4>
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
