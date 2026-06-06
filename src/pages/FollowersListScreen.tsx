import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, collection, getDocs, getDoc, doc, writeBatch, increment, serverTimestamp, deleteDoc, onSnapshot } from '../lib/firebase';
import { UserProfile } from '../types';
import { useAuth } from '../lib/AuthContext';
import { ChevronLeft, Loader2, UserMinus, UserPlus, Search, UserCheck } from 'lucide-react';
import { formatShortName, cn, isUserOnline, formatLastSeen } from '../lib/utils';
import { motion } from 'motion/react';

export function FollowersListScreen() {
  const { userId, type } = useParams<{ userId: string; type: 'followers' | 'following' }>();
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();

  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time tracking of who the current logged-in user is following
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Subject User details
  const [subjectUser, setSubjectUser] = useState<UserProfile | null>(null);

  // Load target user's basic profile details
  useEffect(() => {
    if (!userId) return;
    const fetchSubject = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          setSubjectUser(snap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Failed to load subject profile:", err);
      }
    };
    fetchSubject();
  }, [userId]);

  // Monitor all platform users in real-time to get status updates
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsersList(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (err) => {
      console.error("Error loading users database:", err);
    });
    return unsub;
  }, []);

  // Monitor this specific connection directory (followers or following) in real-time
  useEffect(() => {
    if (!userId || !type) return;

    setLoading(true);
    const unsub = onSnapshot(collection(db, 'users', userId, type), (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setConnectionIds(ids);
      setLoading(false);
    }, (err) => {
      console.error(`Error loading connections metadata for ${type}:`, err);
      setLoading(false);
    });

    return unsub;
  }, [userId, type]);

  // Derived connection users with real-time status updates
  const connectionUsers = allUsersList.filter(u => connectionIds.includes(u.uid));

  // Monitor my current follow alignment indices
  useEffect(() => {
    if (!currentProfile) return;

    const followingRef = collection(db, 'users', currentProfile.uid, 'following');
    const unsubscribe = onSnapshot(followingRef, (snapshot) => {
      setMyFollowingIds(snapshot.docs.map(d => d.id));
    }, (err) => {
      console.error("Error monitoring my alignments:", err);
    });

    return unsubscribe;
  }, [currentProfile]);

  // Handle follow/unfollow toggle for a user in the list
  const toggleFollowUser = async (targetUid: string) => {
    if (!currentProfile) {
      alert("Please sign in to manifest connection alignment.");
      return;
    }
    if (targetUid === currentProfile.uid) return;

    setActionLoadingId(targetUid);
    const isCurrentlyFollowing = myFollowingIds.includes(targetUid);

    try {
      const batch = writeBatch(db);
      
      const followerRef = doc(db, 'users', targetUid, 'followers', currentProfile.uid);
      const followingRef = doc(db, 'users', currentProfile.uid, 'following', targetUid);
      
      const targetUserRef = doc(db, 'users', targetUid);
      const currentUserRef = doc(db, 'users', currentProfile.uid);

      if (isCurrentlyFollowing) {
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
      } else {
        const followData = {
          followerId: currentProfile.uid,
          followedId: targetUid,
          createdAt: serverTimestamp()
        };
        batch.set(followerRef, followData);
        batch.set(followingRef, followData);
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error toggling connection in list:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getPageTitle = () => {
    if (type === 'followers') return 'Presence (Followers)';
    return 'Aligned (Following)';
  };

  const getPageSubtitle = () => {
    const name = subjectUser ? formatShortName(subjectUser.displayName) : 'Active User';
    if (type === 'followers') return `Profiles following ${name}'s resonance waves`;
    return `Profiles aligned with ${name}'s frequency channel`;
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      {/* Search Header Navigation Bar */}
      <div className="flex items-center gap-4 mb-8 sticky top-0 z-20 bg-[#070707]/90 py-4 border-b border-white/5 backdrop-blur-3xl">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-display font-black text-white uppercase tracking-[0.22em]">
            {getPageTitle()}
          </h1>
          <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5 font-bold">
            {getPageSubtitle()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">Securing Ledger Records...</p>
        </div>
      ) : connectionUsers.length === 0 ? (
        <div className="glass-card text-center p-16 border border-white/5 bg-black/40">
          <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px] mb-1">NO CHANNELS DISCOVERED</p>
          <p className="text-[8px] text-white/10 uppercase tracking-widest leading-relaxed">This transmission stream does not point to any registered relationships.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connectionUsers.map((user, idx) => {
            const isMe = currentProfile?.uid === user.uid;
            const isFollowingTarget = myFollowingIds.includes(user.uid);
            
            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                className={cn(
                  "p-4 rounded-2xl glass border transition-all flex items-center justify-between gap-4",
                  isUserOnline(user) 
                    ? "border-emerald-500/15 bg-[#0d1f11]/15 hover:border-emerald-500/25" 
                    : "border-white/[0.03] bg-black/40 hover:border-white/10"
                )}
              >
                <Link 
                  to={`/profile/${user.uid}`}
                  className="flex items-center gap-4 flex-1 min-w-0 group"
                >
                  <div className="relative flex-shrink-0">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName} 
                        className={cn(
                          "w-12 h-12 rounded-xl object-cover transition-all duration-500",
                          isUserOnline(user) ? "ring-2 ring-emerald-500/40 grayscale-0" : "ring-1 ring-white/10 grayscale-[35%] opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                        )}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-500 flex items-center justify-center font-black text-xs ring-1 ring-white/10">
                        {user.displayName ? user.displayName.substring(0,2).toUpperCase() : 'ME'}
                      </div>
                    )}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black",
                      isUserOnline(user) ? "bg-emerald-500 shadow-sm shadow-emerald-500/30 animate-pulse" : "bg-neutral-600"
                    )} />
                  </div>

                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-display font-bold text-sm uppercase tracking-wide duration-300 transition-colors truncate flex items-center gap-2",
                      isUserOnline(user) ? "text-emerald-400 group-hover:text-emerald-300" : "text-white group-hover:text-gold-500"
                    )}>
                      {formatShortName(user.displayName)}
                    </h3>
                    <p className="text-[9px] text-white/30 truncate tracking-wider flex items-center gap-1.5 font-bold">
                      <span>@{user.username || user.displayName.toLowerCase().replace(/\s+/g, '')}</span>
                      <span>•</span>
                      <span className={cn(isUserOnline(user) ? "text-emerald-400 font-black uppercase tracking-widest text-[8px]" : "text-white/20 uppercase tracking-widest text-[8px]")}>
                        {isUserOnline(user) ? "online" : "offline"}
                      </span>
                    </p>
                  </div>
                </Link>

                {/* Follow/Align active toggle buttons */}
                {!isMe && currentProfile && (
                  <button
                    onClick={() => toggleFollowUser(user.uid)}
                    disabled={actionLoadingId === user.uid}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 border cursor-pointer",
                      isFollowingTarget 
                        ? "bg-gold-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-gold-500 border-gold-500/25" 
                        : "bg-gold-500 text-black border-transparent hover:bg-gold-400"
                    )}
                  >
                    {actionLoadingId === user.uid ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowingTarget ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="sm:inline">Aligned</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="sm:inline">Align</span>
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
