import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, orderBy, onSnapshot, writeBatch, deleteDoc, setDoc, serverTimestamp, updateDoc, increment, getDocs, addDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { Post, UserProfile } from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../lib/AuthContext';
import { 
  Loader2, 
  MessageSquare, 
  UserPlus, 
  UserMinus, 
  Settings as SettingsIcon, 
  Check, 
  X, 
  Camera, 
  Trash2, 
  ArrowLeft,
  Share2, 
  Grid, 
  Bookmark, 
  Tag, 
  Menu, 
  Users, 
  Globe, 
  MapPin, 
  Calendar,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatShortName, isUserOnline, formatLastSeen } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../lib/notifications';

const COVER_PRESETS = [
  'linear-gradient(135deg, #1e1e1d 0%, #0a0a09 100%)',
  'linear-gradient(135deg, #451a03 0%, #022c22 100%)',
  'linear-gradient(135deg, #14532d 0%, #052e16 100%)',
  'linear-gradient(135deg, #1e1e24 0%, #0f1016 100%)',
  'linear-gradient(135deg, #581c87 0%, #090514 100%)',
];

export function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile, updateProfile: updateAuthProfile } = useAuth();
  
  // Use current profile UID if userId not defined
  const targetUid = userId || currentProfile?.uid || '';
  const isOwnProfile = currentProfile?.uid === targetUid;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Stats / Tabs
  const [activeTab, setActiveTab] = useState<'grid' | 'saved' | 'tagged'>('grid');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  // Local user settings
  const [showCoverPresetModal, setShowCoverPresetModal] = useState(false);

  // Load profile details
  useEffect(() => {
    if (!targetUid) return;

    setLoading(true);

    // Profile listener
    const docRef = doc(db, 'users', targetUid);
    const unsubscribeProfile = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    }, (err) => {
      console.error("Error loading profile:", err);
    });

    // Real Posts query
    const postsQ = query(
      collection(db, 'posts'),
      where('authorId', '==', targetUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePosts = onSnapshot(postsQ, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.warn("Could not load real posts. Showing offline presets:", error);
      setLoading(false);
    });

    // Followers & Following size calculations in real-time
    const followersRef = collection(db, 'users', targetUid, 'followers');
    const unsubscribeFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowersCount(snapshot.size);
      if (currentProfile) {
        setIsFollowing(snapshot.docs.some(doc => doc.id === currentProfile.uid));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${targetUid}/followers`);
    });

    const followingRef = collection(db, 'users', targetUid, 'following');
    const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${targetUid}/following`);
    });

    return () => {
      unsubscribeProfile();
      unsubscribePosts();
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [targetUid, currentProfile?.uid]);

  // Subscribe to pending follow requests
  useEffect(() => {
    if (!currentProfile?.uid || !targetUid || isOwnProfile) return;
    const qReq = query(
      collection(db, 'follow_requests'),
      where('requesterId', '==', currentProfile.uid),
      where('receiverId', '==', targetUid)
    );
    const unsubscribe = onSnapshot(qReq, (snap) => {
      setHasRequested(!snap.empty);
    }, (err) => {
      console.error("Error loaded request verification:", err);
    });
    return unsubscribe;
  }, [currentProfile?.uid, targetUid, isOwnProfile]);

  // Loading Saved posts dynamically from Local Storage
  useEffect(() => {
    // Collect posts registered in bookmark states
    const filtered = posts.filter(p => {
      const savedReal = localStorage.getItem(`real_bookmark_${p.id}`) === 'true';
      return savedReal;
    });

    // Handle deduplication by ID
    const uniqueMap = new Map();
    filtered.forEach(p => uniqueMap.set(p.id, p));
    setSavedPosts(Array.from(uniqueMap.values()));
  }, [posts, activeTab]);

  // Tagged posts - finding posts mentioning the @username
  const getTaggedPosts = () => {
    const formattedUsername = userProfile?.username || (userProfile?.email ? userProfile.email.split('@')[0] : 'user');
    
    return posts.filter(p => {
      const lowerCaption = p.content.toLowerCase();
      return lowerCaption.includes(`@${formattedUsername.toLowerCase()}`) || lowerCaption.includes(formattedUsername.toLowerCase());
    });
  };

  const handleUpdateCoverColor = async (colorString: string) => {
    if (!isOwnProfile || !currentProfile) return;
    try {
      await updateAuthProfile({ coverColor: colorString });
      setShowCoverPresetModal(false);
    } catch (error) {
      console.error('Failed to update cover style:', error);
    }
  };

  const toggleFollow = async () => {
    if (!currentProfile || !targetUid || isOwnProfile || !userProfile) return;

    setIsActionLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const batch = writeBatch(db);
        const followerRef = doc(db, 'users', targetUid, 'followers', currentProfile.uid);
        const followingRef = doc(db, 'users', currentProfile.uid, 'following', targetUid);
        const userRef = doc(db, 'users', targetUid);
        const currentUserRef = doc(db, 'users', currentProfile.uid);
        
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(userRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
        await batch.commit();
      } else {
        if (userProfile.isPrivate) {
          if (hasRequested) {
            // Cancel request
            const reqsQ = query(
              collection(db, 'follow_requests'),
              where('requesterId', '==', currentProfile.uid),
              where('receiverId', '==', targetUid)
            );
            const reqsSnap = await getDocs(reqsQ);
            if (!reqsSnap.empty) {
              await deleteDoc(doc(db, 'follow_requests', reqsSnap.docs[0].id));
            }
          } else {
            // Create pending request
            await addDoc(collection(db, 'follow_requests'), {
              requesterId: currentProfile.uid,
              receiverId: targetUid,
              createdAt: new Date().toISOString(),
              username: currentProfile.username || 'partner',
              displayName: currentProfile.displayName || 'Anonymous partner',
              photoURL: currentProfile.photoURL || '',
              followerCount: currentProfile.followersCount || 0,
              mutualFollow: false
            });

            // Notify receiver about requested follow status
            await createNotification({
              userId: targetUid,
              type: 'follow_request',
              username: currentProfile.displayName || 'Anonymous partner',
              text: `${currentProfile.displayName || 'Anonymous partner'} requested to connect with your private channel wave`,
              avatarInitials: (currentProfile.displayName || 'CP').substring(0, 2).toUpperCase(),
              avatarColor: '#8B5CF6'
            });
          }
        } else {
          // Public follow immediately
          const batch = writeBatch(db);
          const followerRef = doc(db, 'users', targetUid, 'followers', currentProfile.uid);
          const followingRef = doc(db, 'users', currentProfile.uid, 'following', targetUid);
          const userRef = doc(db, 'users', targetUid);
          const currentUserRef = doc(db, 'users', currentProfile.uid);
          
          const followData = {
            followerId: currentProfile.uid,
            followedId: targetUid,
            createdAt: serverTimestamp()
          };
          batch.set(followerRef, followData);
          batch.set(followingRef, followData);
          batch.update(userRef, { followersCount: increment(1) });
          batch.update(currentUserRef, { followingCount: increment(1) });
          await batch.commit();

          // Push Live Notification
          await createNotification({
            userId: targetUid,
            type: 'follow',
            username: currentProfile.displayName || 'Anonymous partner',
            text: `${currentProfile.displayName || 'Anonymous partner'} started following you`,
            avatarInitials: (currentProfile.displayName || 'CP').substring(0, 2).toUpperCase(),
            avatarColor: '#10B981'
          });
        }
      }
    } catch (error) {
      console.error('Error modifying alignment context:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Wave channel coordinates copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Calibrating resonance alignment...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-24 px-4">
        <h3 className="text-lg font-display font-black text-rose-500 tracking-widest uppercase mb-2">SIGNAL DRIFT</h3>
        <p className="text-xs text-white/40 uppercase tracking-widest">The specified user profile registry is offline or private.</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-3 text-[10px] uppercase tracking-widest font-black border border-white/10 rounded-xl text-white/80 hover:bg-white/5 cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Fallbacks for UI details
  const initials = userProfile.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : 'ME';
  const usernamePrefix = userProfile.username || (userProfile.email ? userProfile.email.split('@')[0] : 'user');
  const userBio = userProfile.bio || 'Meso Collective explorer. In pursuit of raw visual silence and analog resonances.';
  const backgroundCover = userProfile.coverColor || 'linear-gradient(135deg, #121212 0%, #070707 100%)';

  // Find posts owned by this user
  const uniqueMyPosts = posts;

  const displayedPosts = activeTab === 'grid' 
    ? uniqueMyPosts 
    : activeTab === 'saved' 
    ? savedPosts 
    : getTaggedPosts();

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      
      {/* Elegantly Styled Top Navigation Bar */}
      <div className="flex items-center justify-between py-4 border-b border-white/5 bg-[#070707]/90 sticky top-0 z-35 backdrop-blur-3xl px-1">
        {isOwnProfile ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-black text-white uppercase tracking-widest">
              {usernamePrefix}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        ) : (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
          </button>
        )}

        {/* Displays Username centered or left depending on Own */}
        {!isOwnProfile && (
          <span className="text-xs font-display font-black text-white/50 uppercase tracking-[0.2em] truncate max-w-[150px]">
            {usernamePrefix}
          </span>
        )}

        {/* Right side icons */}
        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <>
              <button 
                onClick={() => navigate('/search')}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-gold-500 cursor-pointer active:scale-95 transition-all"
                title="Add alliance"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white cursor-pointer active:scale-95 transition-all"
                title="Management Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-8" /> // Spacer matching symmetry
          )}
        </div>
      </div>

      {/* Cover picture color block banner */}
      <div 
        onClick={() => {
          if (isOwnProfile) setShowCoverPresetModal(true);
        }}
        className={cn(
          "relative h-44 rounded-[32px] overflow-hidden border border-white/5 mt-4 transition-all group shadow-inner",
          isOwnProfile && "cursor-pointer hover:brightness-105"
        )}
        style={{ background: backgroundCover }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {isOwnProfile && (
          <div className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-black/50 border border-white/10 text-white/60 group-hover:text-gold-500 group-hover:scale-105 transition-all">
            <Camera className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Profile Overlapping Avatar */}
      <div className="flex flex-col items-center -mt-16 sm:-mt-20 relative z-10 px-4 mb-6">
        <div className="relative group">
          {isUserOnline(userProfile) ? (
            <div className="absolute -inset-1.5 rounded-[44px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 p-0.5 animate-pulse" />
          ) : (
            <div className="absolute -inset-1 rounded-[42px] bg-gradient-to-tr from-gold-600/30 to-gold-400/10 blur group-hover:opacity-100 transition-opacity" />
          )}
          
          {userProfile.photoURL ? (
            <img 
              src={userProfile.photoURL} 
              alt={userProfile.displayName} 
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-[36px] object-cover ring-4 ring-black shadow-2xl transition-transform duration-700 group-hover:scale-102"
            />
          ) : (
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-[36px] bg-gradient-to-tr from-gold-600 to-amber-500/80 ring-4 ring-black flex items-center justify-center text-4xl font-black text-black shadow-2xl">
              {initials}
            </div>
          )}

          {/* Dynamic Presence Badge */}
          <div className={cn(
            "absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center z-20 shadow-lg",
            isUserOnline(userProfile) ? "bg-emerald-500" : "bg-neutral-600"
          )} />
        </div>

        {/* Display name (bold), @username, and bio */}
        <div className="text-center mt-4 max-w-md">
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide leading-tight mb-1">
            {formatShortName(userProfile.displayName)}
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <p className="text-[10px] font-black tracking-widest text-gold-500/80 uppercase">
              @{usernamePrefix}
            </p>
            <span className="text-white/20 text-[9px]">•</span>
            {isUserOnline(userProfile) ? (
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
                online
              </span>
            ) : (
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40 bg-white/[0.03] px-2.5 py-0.5 rounded-full border border-white/5 shadow-sm">
                offline • {userProfile.lastSeen ? formatLastSeen(userProfile.lastSeen) : 'recently'}
              </span>
            )}
          </div>

          <p className="text-xs text-white/70 leading-relaxed font-serif italic max-w-xs sm:max-w-sm mx-auto mb-6">
            "{userBio}"
          </p>

          {/* Website + Location additions */}
          {(userProfile.website || userProfile.location || userProfile.isPrivate) && (
            <div className="flex flex-wrap justify-center items-center gap-4 text-[9px] font-black uppercase tracking-wider text-white/45 mb-6">
              {userProfile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gold-500/60" />
                  <span>{userProfile.location}</span>
                </div>
              )}
              {userProfile.website && (
                <a 
                  href={userProfile.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1 text-gold-500 hover:underline"
                >
                  <Globe className="w-3 h-3" />
                  <span>{userProfile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {userProfile.isPrivate && (
                <div className="flex items-center gap-1 text-amber-500/80">
                  <Lock className="w-3 h-3" />
                  <span>PRIVATE ZONE</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Row: Posts | Followers | Following (Tappable opening FollowersListScreen) */}
        <div className="grid grid-cols-3 gap-1.5 w-full max-w-sm mx-auto bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-center mt-2 mb-6">
          <button 
            onClick={() => setActiveTab('grid')}
            className="border-r border-white/5 hover:text-gold-500 transition-colors cursor-pointer"
          >
            <p className="text-[15px] font-display font-bold text-white leading-none mb-1">{uniqueMyPosts.length}</p>
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest group-hover:text-gold-500">Creations</p>
          </button>
          
          <button 
            onClick={() => navigate(`/profile/${targetUid}/connections/followers`)}
            className="border-r border-white/5 hover:text-gold-500 transition-colors cursor-pointer"
          >
            <p className="text-[15px] font-display font-bold text-white leading-none mb-1">{followersCount}</p>
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest group-hover:text-gold-500">Presence</p>
          </button>

          <button 
            onClick={() => navigate(`/profile/${targetUid}/connections/following`)}
            className="hover:text-gold-500 transition-colors cursor-pointer"
          >
            <p className="text-[15px] font-display font-bold text-white leading-none mb-1">{followingCount}</p>
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest group-hover:text-gold-500">Aligned</p>
          </button>
        </div>

        {/* Action Button cluster Row */}
        <div className="flex gap-3 w-full max-w-sm mx-auto">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex-1 py-4 px-4 rounded-xl text-[10px] font-black bg-gold-500 text-black uppercase tracking-widest hover:bg-gold-400 active:scale-95 transition-all flex items-center justify-center gap-1 border-none cursor-pointer"
              >
                Edit Profile
              </button>
              <button
                onClick={handleShareProfile}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 text-white hover:text-gold-500 cursor-pointer transition-all active:scale-95"
                title="Share Channel wave link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            // Other user action layout
            <>
              <button
                onClick={toggleFollow}
                disabled={isActionLoading}
                className={cn(
                  "flex-1 py-4 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                  isFollowing 
                    ? "bg-transparent text-gold-500 border-gold-500/40 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5" 
                    : hasRequested
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                      : "bg-gold-500 text-black border-transparent hover:bg-gold-400"
                )}
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : hasRequested ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Requested</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <Link
                to={`/chat/${targetUid}`}
                className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-500 hover:bg-gold-500/20 active:scale-95 transition-all"
                title="Secure Whisper Message"
              >
                <MessageSquare className="w-4 h-4" />
              </Link>

              <button
                onClick={handleShareProfile}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 text-white hover:text-gold-500 cursor-pointer transition-all active:scale-95"
                title="Share coordinates"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs list (My profile: Grid, Saved, Tagged. Handled visibility) */}
      <div className="border-b border-white/5 mb-6 sticky top-[72px] bg-[#070707] z-30">
        <div className="flex justify-center gap-8 py-2">
          <button
            onClick={() => setActiveTab('grid')}
            className={cn(
              "pb-3.5 pt-1 border-b-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all",
              activeTab === 'grid' 
                ? "border-gold-500 text-gold-500" 
                : "border-transparent text-white/40 hover:text-white"
            )}
          >
            <Grid className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          {/* Saved Posts are ONLY shown on own profile */}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={cn(
                "pb-3.5 pt-1 border-b-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all",
                activeTab === 'saved' 
                  ? "border-gold-500 text-gold-500" 
                  : "border-transparent text-white/40 hover:text-white"
              )}
            >
              <Bookmark className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">Saved</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('tagged')}
            className={cn(
              "pb-3.5 pt-1 border-b-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all",
              activeTab === 'tagged' 
                ? "border-gold-500 text-gold-500" 
                : "border-transparent text-white/40 hover:text-white"
            )}
          >
            <Tag className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Tagged</span>
          </button>
        </div>
      </div>

      {/* 3-column Grid Display panel layout */}
      {userProfile?.isPrivate && !isFollowing && !isOwnProfile ? (
        <div className="glass-card text-center py-20 bg-black/40 premium-border rounded-[32px] max-w-sm mx-auto p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none blur-3xl" />
          <Lock className="w-10 h-10 text-purple-400 mx-auto mb-4 animate-pulse relative z-10" />
          <p className="text-white font-black uppercase tracking-[0.3em] text-[11px] mb-2 relative z-10">PRIVATE WAVE TUNER</p>
          <p className="text-[9px] text-white/50 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed relative z-10 mb-4">
            Alignment waves are encrypted. Request follow access to synch with their transmissions and scan past broadcasts.
          </p>
          
          <button
            onClick={toggleFollow}
            disabled={isActionLoading}
            className={cn(
              "py-3.5 px-6 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95",
              hasRequested
                ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25"
                : "bg-purple-500 hover:bg-purple-400 text-white border-none"
            )}
          >
            {isActionLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hasRequested ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Request Connection</span>
              </>
            )}
          </button>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="glass-card text-center py-20 bg-black/20 premium-border">
          {activeTab === 'grid' ? (
            <>
              <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px] mb-1">RECORD VAULT IS EMPTY</p>
              <p className="text-[8px] text-white/10 uppercase tracking-widest">No wave broadcasts registered under this registry</p>
            </>
          ) : activeTab === 'saved' ? (
            <>
              <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px] mb-1">NO CHANNELS BOOKMARKED</p>
              <p className="text-[8px] text-white/10 uppercase tracking-widest">Saved waves from the main feed will organize here</p>
            </>
          ) : (
            <>
              <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px] mb-1">NO MEMBER TAGS FILED</p>
              <p className="text-[8px] text-white/10 uppercase tracking-widest">Mentions of this frequency will register alignment here</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {displayedPosts.map((post) => (
            <motion.div
              layout
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              className="aspect-square rounded-2xl overflow-hidden glass border border-white/5 relative group cursor-pointer bg-black/40 hover:brightness-110 shadow"
            >
              {post.imageUrl ? (
                <img 
                  src={post.imageUrl} 
                  alt="Post thumbnail" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-3 sm:p-4 flex flex-col justify-between">
                  {post.category && (
                    <span className="text-[7.5px] font-black uppercase text-gold-400 tracking-wider">
                      {post.category}
                    </span>
                  )}
                  <p className="text-[9.5px] text-white/60 font-serif italic line-clamp-3 leading-snug">
                    "{post.content}"
                  </p>
                  <span className="text-[6.5px] font-mono tracking-widest text-white/20 uppercase">
                    Typographic Preview
                  </span>
                </div>
              )}

              {/* Hover Details card overlay stats */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-xs font-black uppercase tracking-wider text-white">
                <div className="flex items-center gap-1.5 hover:text-gold-500 transition-colors">
                  <span className="text-rose-400">♥</span>
                  <span>{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-gold-500 transition-colors">
                  <span className="text-gold-500">💬</span>
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* -------------------- OVERLAY MODALS --------------------- */}

      {/* Cover Presets Color Chooser Overlay Modal */}
      <AnimatePresence>
        {showCoverPresetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm glass p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div>
                  <h4 className="font-display font-black text-sm text-white tracking-widest uppercase">COVER DECORATION PRESET</h4>
                  <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Select a luxury profile background gradient</p>
                </div>
                <button 
                  onClick={() => setShowCoverPresetModal(false)}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2.5">
                  {COVER_PRESETS.map((preset, index) => (
                    <button
                      key={preset}
                      onClick={() => handleUpdateCoverColor(preset)}
                      className="h-14 rounded-xl border border-white/5 cursor-pointer relative overflow-hidden flex items-center px-4 hover:border-gold-500/50 hover:scale-101 transition-all"
                      style={{ background: preset }}
                    >
                      <span className="text-[9px] font-black uppercase text-white tracking-widest p-1.5 bg-black/20 rounded-md">
                        Luxury Vibe {index + 1}
                      </span>
                      {backgroundCover === preset && (
                        <Check className="w-5 h-5 text-gold-500 absolute right-4" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="pt-3 border-t border-white/5 mt-4">
                  <label className="text-[8px] font-black uppercase tracking-widest block text-white/30 mb-2">CUSTOM CSS COLOR OR GRADIENT</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. #b45309 or linear-gradient(...)"
                      className="flex-1 glass-input text-xs border-none rounded-xl px-4 py-3"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) handleUpdateCoverColor(val);
                        }
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowCoverPresetModal(false)}
                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-xl text-white/50 hover:bg-white/10 cursor-pointer mt-4"
                >
                  Cancel Preset Selector
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
