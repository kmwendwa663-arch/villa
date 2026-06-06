import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Loader2, Edit2, Check, X, Bookmark, AlertTriangle, EyeOff, VolumeX, ShieldAlert, Copy, ExternalLink, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '../types';
import { db, doc, updateDoc, increment, setDoc, deleteDoc, collection, serverTimestamp, onSnapshot, getDocs, addDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn, formatShortName } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { CommentsSection } from './CommentsSection';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../lib/notifications';

interface PostCardProps {
  post: Post;
  key?: React.Key;
}

export function PostCard({ post }: PostCardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('textarea') || 
      target.closest('input') ||
      target.closest('.no-card-click')
    ) {
      return;
    }
    navigate(`/post/${post.id}`);
  };

  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [hasLiked, setHasLiked] = useState<boolean>(post.hasLiked || false);
  const [imageError, setImageError] = useState(false);

  // Engagement & Custom States
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    return localStorage.getItem(`real_bookmark_${post.id}`) === 'true';
  });
  
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  
  // Menus and Overlays
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  // Specific menu-driven filter states
  const [commentsDisabled, setCommentsDisabled] = useState((post as any).allowComments === false);
  const [isArchived, setIsArchived] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isReported, setIsReported] = useState(false);

  // Notification / Feedback states
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  useEffect(() => {
    if (!profile) {
      setHasLiked(false);
      return;
    }
    const likeRef = doc(db, 'posts', post.id, 'likes', profile.uid);
    const unsubscribe = onSnapshot(likeRef, (docSnap) => {
      setHasLiked(docSnap.exists());
    }, (err) => {
      console.error("Error reading like status:", err);
    });
    return unsubscribe;
  }, [post.id, profile?.uid]);

  // Sync Bookmark status from Firestore subcollection dynamically
  useEffect(() => {
    if (!profile) return;
    const saveRef = doc(db, 'users', profile.uid, 'saved', post.id);
    const unsubscribe = onSnapshot(saveRef, (docSnap) => {
      const savedInCloud = docSnap.exists();
      setIsSaved(savedInCloud);
      if (savedInCloud) {
        localStorage.setItem(`real_bookmark_${post.id}`, 'true');
      } else {
        localStorage.removeItem(`real_bookmark_${post.id}`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${profile.uid}/saved/${post.id}`);
    });
    return unsubscribe;
  }, [post.id, profile?.uid]);

  // Load registered users list for direct messaging user picker
  useEffect(() => {
    if (!showUserPicker || allUsers.length > 0) return;
    setSearchingUsers(true);
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const list = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => u.id !== profile?.uid);
        setAllUsers(list);
      })
      .catch((err) => console.error('Error fetching messaging users:', err))
      .finally(() => setSearchingUsers(false));
  }, [showUserPicker, profile?.uid]);

  // Bookmark Toggle Function
  const toggleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!profile) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    localStorage.setItem(`real_bookmark_${post.id}`, String(nextSaved));

    try {
      const saveRef = doc(db, 'users', profile.uid, 'saved', post.id);
      if (nextSaved) {
        await setDoc(saveRef, { savedAt: new Date().toISOString() });
        showToast('Post saved to private collection!');
      } else {
        await deleteDoc(saveRef);
        showToast('Post removed from saved collection.');
      }
    } catch (err) {
      console.error('Failed saving bookmark position:', err);
    }
  };

  // Image Click Double Tap handler
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTime = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (currentTime - lastClickTime < DOUBLE_PRESS_DELAY) {
      // Trigger like
      if (!hasLiked) {
        handleLike();
      }
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
    setLastClickTime(currentTime);
  };

  // Send post via Direct Message
  const handleSendViaDM = async (recipient: any) => {
    if (!profile) return;
    try {
      // Send DM to recipient
      const chatId = profile.uid < recipient.id ? `${profile.uid}_${recipient.id}` : `${recipient.id}_${profile.uid}`;
      await addDoc(collection(db, 'messages'), {
        senderId: profile.uid,
        receiverId: recipient.id,
        participants: [profile.uid, recipient.id],
        content: `Shared a post: ${post.content || 'Attached inspiration'}`,
        postId: post.id,
        postImage: post.imageUrl || '',
        postContent: post.content || '',
        chatId,
        createdAt: serverTimestamp(),
        seen: false
      });
      showToast(`Transmission sent to @${recipient.username || 'member'}!`);
      setShowUserPicker(false);
      setShowShareSheet(false);
    } catch (err) {
      console.error('Failed sending post DM:', err);
      showToast('Failed sending direct transmission.');
    }
  };

  // Turn on/off comments
  const handleToggleComments = async () => {
    const nextDisabled = !commentsDisabled;
    setCommentsDisabled(nextDisabled);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        allowComments: !nextDisabled
      });
      showToast(nextDisabled ? 'Comments disabled for this post.' : 'Comments enabled.');
    } catch (err) {
      console.error('Failed toggling comments permission:', err);
    }
    setShowOptionsDropdown(false);
  };

  // Archive Post
  const handleArchivePost = async () => {
    setIsArchived(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        archived: true
      });
      showToast('Post archived!');
    } catch (err) {
      console.error('Archive failed:', err);
    }
    setShowOptionsDropdown(false);
  };

  // Simulating Report Action
  const handleReportPost = () => {
    setIsReported(true);
    showToast('Post reported! Thank you for maintaining collective aesthetic.');
    setShowOptionsDropdown(false);
  };

  // Simulating Not Interested
  const handleNotInterested = () => {
    setIsMuted(true);
    showToast('Signal tuned out. We will refine your recommendations feed.');
    setShowOptionsDropdown(false);
  };

  // Simulating Mute User
  const handleMuteUser = () => {
    setIsMuted(true);
    showToast(`Muted wave signals from @${formatShortName(post.authorName)}`);
    setShowOptionsDropdown(false);
  };

  // Simulating Block User
  const handleBlockUser = () => {
    setIsBlocked(true);
    showToast(`Blocked connection with @${formatShortName(post.authorName)}`);
    setShowOptionsDropdown(false);
  };

  // Copy Post Link to Clipboard
  const handleCopyLink = () => {
    const link = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(link);
    showToast('Link saved to credentials clipboard!');
    setShowShareSheet(false);
    setShowOptionsDropdown(false);
  };

  // Share to external space
  const handleExternalShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Collective Broadcast',
        text: post.content,
        url: `${window.location.origin}/post/${post.id}`,
      })
      .then(() => showToast('Shared successfully!'))
      .catch((err) => console.log('Rejected external share', err));
    } else {
      showToast('Redirecting external share protocols...');
    }
    setShowShareSheet(false);
  };

  const handleUpdate = async () => {
    if (!profile || profile.uid !== post.authorId || isUpdating) return;
    if (!editedContent.trim() || editedContent === post.content) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        content: editedContent.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating post', error);
      alert('Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!profile || profile.uid !== post.authorId || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting post', error);
      alert('Failed to delete post. You might not have permission.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!profile || isLiking) return;
    setIsLiking(true);
    
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', profile.uid);
      if (hasLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', post.id), {
          likesCount: increment(-1)
        });
      } else {
        await setDoc(likeRef, { userId: profile.uid, createdAt: new Date().toISOString() });
        await updateDoc(doc(db, 'posts', post.id), {
          likesCount: increment(1)
        });
        if (post.authorId !== profile.uid) {
          await createNotification({
            userId: post.authorId,
            type: 'like',
            username: profile.displayName || 'Collective partner',
            text: `${profile.displayName || 'Collective partner'} liked your wave broadcast`,
            avatarInitials: (profile.displayName || 'CP').substring(0, 2).toUpperCase(),
            avatarColor: '#EF4444',
            postId: post.id,
            postThumb: post.imageUrl || ''
          });
        }
      }
    } catch (error) {
      console.error('Error liking post', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formattedDate = (() => {
    if (post.createdAt?.toDate) {
      return formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true });
    } else if (post.createdAt instanceof Date) {
      return formatDistanceToNow(post.createdAt, { addSuffix: true });
    } else if (typeof post.createdAt === 'string' || typeof post.createdAt === 'number') {
      const d = new Date(post.createdAt);
      if (!isNaN(d.getTime())) {
        return formatDistanceToNow(d, { addSuffix: true });
      }
    }
    return 'just now';
  })();

  if (isMuted || isBlocked || isArchived || isReported) {
    return (
      <div className="glass-card premium-border p-6 mb-8 text-center text-[10px] tracking-widest text-white/30 uppercase font-mono">
        Signal connection archived or tuned out
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="glass-card premium-border p-6 sm:p-10 mb-8 transition-all duration-1000 group/card relative overflow-hidden cursor-pointer hover:border-gold-500/20"
    >
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[80px] pointer-events-none group-hover/card:bg-gold-500/20 transition-all duration-1000" />
      
      <div className="flex items-start justify-between mb-10">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-6 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-tr from-gold-600/20 via-gold-400/20 to-gold-600/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img 
              src={post.authorPhoto} 
              alt={formatShortName(post.authorName)} 
              className="relative w-16 h-16 rounded-[24px] object-cover ring-1 ring-white/10 group-hover:ring-gold-500/30 transition-all duration-700"
            />
          </div>
          <div>
            <h3 className="font-display font-semibold text-xl text-white group-hover:text-gold-500 transition-colors tracking-tight leading-none mb-1">{formatShortName(post.authorName)}</h3>
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black text-white/20 tracking-[0.3em] uppercase">{formattedDate}</p>
              {post.category && (
                <>
                  <div className="w-1 h-1 rounded-full bg-gold-500/30" />
                  <p className="text-[9px] font-black text-gold-500/60 tracking-[0.3em] uppercase">{post.category}</p>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Options Dot Menu */}
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowOptionsDropdown(!showOptionsDropdown);
            }}
            disabled={isDeleting || isUpdating || showDeleteConfirm}
            className="p-3 rounded-2xl text-white/20 hover:text-white hover:bg-white/5 transition-all duration-500 disabled:opacity-50 cursor-pointer"
            title="Post options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Options Dropdown Menu Panel */}
          <AnimatePresence>
            {showOptionsDropdown && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-14 z-50 w-52 glass bg-black border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 text-left no-card-click"
              >
                {profile?.uid === post.authorId ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                        setShowOptionsDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gold-500" /> Edit Caption
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComments();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                      {commentsDisabled ? 'Turn On Comments' : 'Turn Off Comments'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchivePost();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-blue-400" /> Archive Post
                    </button>
                    <div className="h-[1px] bg-white/5 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                        setShowOptionsDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-red-500/10 text-[10px] text-red-400 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" /> Copy Link
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotInterested();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" /> Not Interested
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMuteUser();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-orange-400" /> Mute User
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlockUser();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-[10px] text-white/80 font-black uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Block User
                    </button>
                    <div className="h-[1px] bg-white/5 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportPost();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-red-500/10 text-[10px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Report Post
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showDeleteConfirm && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 p-8 glass border border-rose-500/30 rounded-[32px] bg-rose-500/5"
        >
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h4 className="text-xl font-display font-bold text-white mb-2">Are you sure you want to delete this post?</h4>
              <p className="text-white/40 text-sm italic uppercase tracking-widest leading-relaxed">
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500 text-white hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isEditing ? (
        <div className="mb-10">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-32 glass-input font-serif text-xl sm:text-2xl text-white/90 leading-[1.6] italic p-4 rounded-2xl focus:ring-1 focus:ring-gold-500/30 mb-4"
            placeholder="Edit your post..."
            autoFocus
          />
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedContent(post.content);
              }}
              disabled={isUpdating}
              className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4 inline-block mr-2" />
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editedContent.trim() || editedContent === post.content}
              className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] bg-gold-500 text-black hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="font-serif text-xl sm:text-2xl text-white/90 leading-[1.6] mb-10 whitespace-pre-wrap selection:bg-gold-500/30 italic">
            "{post.content}"
          </p>
        )
      )}

      {/* Double Tap Likable Image */}
      {post.imageUrl && !imageError && (
        <div 
          onClick={handleImageClick}
          className="relative mb-10 overflow-hidden rounded-[24px] border border-white/5 bg-white/2 max-h-[400px] flex items-center justify-center group/img cursor-pointer no-card-click"
        >
          <div className="absolute -inset-1 bg-gradient-to-tr from-gold-500/10 via-transparent to-gold-500/5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <img
            src={post.imageUrl}
            alt="Attached inspiration"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-auto max-h-[400px] object-cover transition-transform duration-1000 group-hover/img:scale-[1.02] pointer-events-none"
          />
          <AnimatePresence>
            {showHeartOverlay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1.25 }}
                exit={{ opacity: 0, scale: 1.6 }}
                className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
              >
                <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="flex items-center gap-8 pt-8 border-t border-white/5">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          disabled={!profile}
          className={cn(
            "flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 group/btn cursor-pointer",
            hasLiked ? "text-rose-400" : "text-white/30 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-700",
            hasLiked ? "bg-rose-500/10 shadow-[0_0_20px_rgba(251,113,133,0.2)]" : "bg-white/2 hover:bg-white/5"
          )}>
            <Heart className={cn("w-4 h-4 transition-transform duration-500 group-active/btn:scale-150", hasLiked && "fill-current")} />
          </div>
          <span className="tabular-nums">{post.likesCount || 0}</span>
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(!showComments);
          }}
          className={cn(
            "flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 group/btn cursor-pointer",
            showComments ? "text-gold-500" : "text-white/30 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-700",
            showComments ? "bg-gold-500/10 shadow-[0_0_20px_rgba(197,160,89,0.2)]" : "bg-white/2 hover:bg-white/5"
          )}>
            <MessageCircle className="w-4 h-4 transition-transform duration-500 group-hover/btn:scale-110" />
          </div>
          <span className="tabular-nums">{post.commentsCount || 0}</span>
        </button>

        <div className="ml-auto flex items-center gap-2 no-card-click">
          {/* Bookmark Button */}
          <button 
            onClick={toggleSave}
            className={cn(
              "p-3 rounded-2xl transition-all duration-500 hover:bg-white/5 cursor-pointer",
              isSaved ? "text-gold-500 bg-gold-500/10" : "text-white/30 hover:text-white"
            )}
            title="Save post"
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>

          {/* Share Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowShareSheet(!showShareSheet);
            }}
            className="p-3 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 transition-all duration-500 group/btn cursor-pointer"
            title="Share waves"
          >
            <Share2 className="w-4 h-4 transition-transform duration-700 group-hover/btn:rotate-12" />
          </button>
        </div>
      </div>

      {showComments && !commentsDisabled && (
        <div className="mt-6 pt-6 border-t border-white/5 no-card-click">
          <CommentsSection postId={post.id} />
        </div>
      )}

      {showComments && commentsDisabled && (
        <p className="mt-6 pt-6 text-center text-[10px] uppercase font-black text-white/15 tracking-widest leading-none border-t border-white/5">
          Comments have been quieted on this waveband
        </p>
      )}

      {/* Share Bottom Sheet Overlay */}
      <AnimatePresence>
        {showShareSheet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-end justify-center p-4 no-card-click"
            onClick={() => setShowShareSheet(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm glass bg-[#0c0c0c] border border-white/10 rounded-t-[32px] p-6 space-y-4 text-center mt-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />
              <h4 className="text-gold-500 text-[10px] font-black uppercase tracking-[0.4em]">SHARE BROADCAST PANEL</h4>
              
              <div className="grid grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => setShowUserPicker(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 gap-2 cursor-pointer group transition-all"
                >
                  <Send className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Send DM</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 gap-2 cursor-pointer group transition-all"
                >
                  <Copy className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Copy Link</span>
                </button>
                <button
                  onClick={handleExternalShare}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 gap-2 cursor-pointer group transition-all"
                >
                  <ExternalLink className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">External</span>
                </button>
              </div>

              <button
                onClick={() => setShowShareSheet(false)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white cursor-pointer"
              >
                Cancel Share
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Picker DM Modal */}
      <AnimatePresence>
        {showUserPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 no-card-click"
          >
            <div className="w-full max-w-sm glass p-6 rounded-[32px] border border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-purple-400 text-[10px] font-black uppercase tracking-[0.4em]">CHOOSE RECIPIENT</h4>
                <button onClick={() => setShowUserPicker(false)} className="p-1 text-white/50 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto no-scrollbar py-1 space-y-2">
                {searchingUsers ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <p className="text-center text-[9px] uppercase tracking-widest font-mono text-white/20 py-8">No contacts loaded</p>
                ) : (
                  allUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSendViaDM(user)}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-purple-950/10 hover:border-purple-500/25 border border-white/5 transition-all flex items-center gap-3 cursor-pointer group"
                    >
                      <img src={user.photoURL} className="w-8 h-8 rounded-xl object-cover" alt="" />
                      <div className="flex-1 text-left">
                        <span className="text-xs uppercase text-white font-mono block leading-none mb-1">{user.displayName}</span>
                        <span className="text-[9px] text-white/40 uppercase tracking-widest">@{user.username || 'member'}</span>
                      </div>
                      <Send className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Global Micro Toast Alert */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[4000] px-5 py-3 rounded-2xl bg-black border border-white/10 shadow-[0_12px_44px_-8px_rgba(0,0,0,0.85)] text-white text-[10px] font-black uppercase tracking-widest text-center flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-gold-500" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
