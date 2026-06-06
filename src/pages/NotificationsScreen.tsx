import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, getDocs, doc, writeBatch, serverTimestamp, getDoc, addDoc, increment, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCheck, Settings, Heart, MessageSquare, 
  UserPlus, AtSign, ChevronRight, Loader2, Sparkles, User, UserCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'follow_request' | 'follow_accepted' | 'system';
  userId: string;
  username: string;
  avatarInitials: string;
  avatarColor: string;
  text: string;
  postId?: string;
  postThumb?: string;
  timestamp: string;
  isRead: boolean;
  senderPhoto?: string;
}

export function NotificationsScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [followRequestsCount, setFollowRequestsCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'like' | 'comment' | 'follow' | 'mention'>('all');
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load current user's following list to show follow/following states on buttons
  useEffect(() => {
    if (!profile?.uid) return;
    const followingRef = collection(db, 'users', profile.uid, 'following');
    const unsubscribe = onSnapshot(followingRef, (snap) => {
      setFollowingIds(snap.docs.map(doc => doc.id));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${profile.uid}/following`);
    });
    return unsubscribe;
  }, [profile?.uid]);

  // Load real notifications from Firestore
  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);

    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items: NotificationItem[] = [];
      const userCache = new Map<string, any>();

      // Read profiles to load accurate sender photos dynamically if available
      for (const d of snapshot.docs) {
        const data = d.data();
        let senderPhoto = undefined;
        
        if (data.username && data.username !== 'Meso Network') {
          // Attempt to find a matching registered user to get high-res avatar
          if (userCache.has(data.username)) {
            senderPhoto = userCache.get(data.username).photoURL;
          } else {
            const usersQ = query(collection(db, 'users'), where('displayName', '==', data.username));
            const uSnap = await getDocs(usersQ);
            if (!uSnap.empty) {
              const uData = uSnap.docs[0].data();
              senderPhoto = uData.photoURL;
              userCache.set(data.username, uData);
            }
          }
        }

        items.push({
          id: d.id,
          type: data.type,
          userId: data.userId,
          username: data.username || 'Collective Member',
          avatarInitials: data.avatarInitials || 'CM',
          avatarColor: data.avatarColor || '#D4AF37',
          text: data.text,
          postId: data.postId,
          postThumb: data.postThumb,
          timestamp: data.timestamp,
          isRead: data.isRead,
          senderPhoto
        });
      }

      // Sort chronological descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
      setLoading(false);

      // Auto Seed beautiful premium notifications and requests if completely empty
      if (snapshot.empty) {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const publicUsersList = usersSnap.docs
            .map(d => ({ uid: d.id, ...d.data() } as any))
            .filter(u => u.uid !== profile.uid);

          const seedSource = publicUsersList.length >= 2 ? publicUsersList : [
            { uid: 'alpha', displayName: 'Aurelia Sterling', username: 'aurelia', photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
            { uid: 'beta', displayName: 'Julian Vance', username: 'julian', photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
            { uid: 'gamma', displayName: 'Valene Dubois', username: 'valene', photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
            { uid: 'delta', displayName: 'Marlowe Vance', username: 'marlowe', photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
          ];

          const seedNotifs = [
            {
              userId: profile.uid,
              type: 'like',
              username: seedSource[0].displayName,
              avatarInitials: 'AS',
              avatarColor: '#EF4444',
              text: `${seedSource[0].displayName} and 4 others liked your photo`,
              postId: 'post-seed-1',
              postThumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150',
              timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
              isRead: false
            },
            {
              userId: profile.uid,
              type: 'comment',
              username: seedSource[1].displayName,
              avatarInitials: 'JV',
              avatarColor: '#9333EA',
              text: `${seedSource[1].displayName} commented: 'Incredible light captured here.'`,
              postId: 'post-seed-2',
              postThumb: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=150',
              timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
              isRead: false
            },
            {
              userId: profile.uid,
              type: 'follow',
              username: seedSource[2].displayName,
              avatarInitials: 'VD',
              avatarColor: '#10B981',
              text: `${seedSource[2].displayName} started following you`,
              timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
              isRead: true
            },
            {
              userId: profile.uid,
              type: 'mention',
              username: seedSource[3].displayName,
              avatarInitials: 'MV',
              avatarColor: '#F59E0B',
              text: `${seedSource[3].displayName} mentioned you in a comment`,
              postId: 'post-seed-3',
              postThumb: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=150',
              timestamp: new Date(Date.now() - 25 * 3600000).toISOString(),
              isRead: true
            },
            {
              userId: profile.uid,
              type: 'system',
              username: 'Meso Network',
              avatarInitials: 'MN',
              avatarColor: '#4F46E5',
              text: 'Your quantum network profile latency encryption is completed.',
              timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
              isRead: true
            }
          ];

          const notifCollection = collection(db, 'notifications');
          for (const notif of seedNotifs) {
            await addDoc(notifCollection, notif);
          }

          // Seed follow requests
          const reqsQ = query(collection(db, 'follow_requests'), where('receiverId', '==', profile.uid));
          const reqsSnap = await getDocs(reqsQ);
          if (reqsSnap.empty) {
            const seedRequests = [
              {
                requesterId: seedSource[2].uid,
                receiverId: profile.uid,
                createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
                username: seedSource[2].username || 'valene',
                displayName: seedSource[2].displayName,
                photoURL: seedSource[2].photoURL || '',
                followerCount: 247,
                mutualFollow: true
              },
              {
                requesterId: seedSource[3].uid,
                receiverId: profile.uid,
                createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
                username: seedSource[3].username || 'marlowe',
                displayName: seedSource[3].displayName,
                photoURL: seedSource[3].photoURL || '',
                followerCount: 1290,
                mutualFollow: false
              }
            ];
            const reqCollection = collection(db, 'follow_requests');
            for (const req of seedRequests) {
              await addDoc(reqCollection, req);
            }
          }
        } catch (e) {
          console.error("Failed to seed items:", e);
        }
      }
    }, (error) => {
      console.error("Error reading notifications:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile?.uid]);

  // Read current follow request count
  useEffect(() => {
    if (!profile?.uid) return;
    const qRequests = query(collection(db, 'follow_requests'), where('receiverId', '==', profile.uid));
    const unsubscribe = onSnapshot(qRequests, (snapshot) => {
      setFollowRequestsCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'follow_requests');
    });
    return unsubscribe;
  }, [profile?.uid]);

  // Mark all as read action
  const markAllAsRead = async () => {
    if (!profile?.uid) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        if (!notif.isRead) {
          const docRef = doc(db, 'notifications', notif.id);
          batch.update(docRef, { isRead: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Mark all read failed:", error);
    }
  };

  // Toggle follow
  const toggleFollowUser = async (targetUid: string) => {
    if (!profile || !targetUid) return;
    setActionLoadingId(targetUid);
    try {
      const batch = writeBatch(db);
      const isFollowing = followingIds.includes(targetUid);
      
      const followerRef = doc(db, 'users', targetUid, 'followers', profile.uid);
      const followingRef = doc(db, 'users', profile.uid, 'following', targetUid);
      const targetUserRef = doc(db, 'users', targetUid);
      const currentUserRef = doc(db, 'users', profile.uid);

      if (isFollowing) {
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
      } else {
        const followData = {
          followerId: profile.uid,
          followedId: targetUid,
          createdAt: serverTimestamp()
        };
        batch.set(followerRef, followData);
        batch.set(followingRef, followData);
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
        
        // Push a live follow notification to the user
        await createNotification({
          userId: targetUid,
          type: 'follow',
          username: profile.displayName || 'Anonymous Partner',
          text: `${profile.displayName || 'Anonymous Partner'} started following you`,
          avatarInitials: (profile.displayName || 'AP').substring(0, 2).toUpperCase(),
          avatarColor: '#10B981'
        });
      }
      await batch.commit();
    } catch (err) {
      console.error("Toggle follow in notification lists exception:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter state
  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'like') return notif.type === 'like';
    if (activeFilter === 'comment') return notif.type === 'comment';
    if (activeFilter === 'follow') return notif.type === 'follow' || notif.type === 'follow_accepted';
    if (activeFilter === 'mention') return notif.type === 'mention';
    return true;
  });

  // Time groupings helper
  const getGroup = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'New';
    }
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (date.getTime() >= startOfToday) {
      return 'Earlier today';
    }
    
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
    if (date.getTime() >= startOfWeek) {
      return 'This week';
    }
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (date.getTime() >= startOfMonth) {
      return 'This month';
    }
    
    return 'Earlier';
  };

  // Format time relative helper
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Just now';
    }
  };

  // Grouped items mapping
  const groupCollection: { [key: string]: NotificationItem[] } = {
    'New': [],
    'Earlier today': [],
    'This week': [],
    'This month': [],
    'Earlier': []
  };

  filteredNotifications.forEach(notif => {
    try {
      const grp = getGroup(new Date(notif.timestamp));
      groupCollection[grp].push(notif);
    } catch {
      groupCollection['Earlier'].push(notif);
    }
  });

  // Tapping a notification navigates or updates state
  const handleNotifClick = async (notif: NotificationItem) => {
    try {
      // Mark as read in Firestore
      if (!notif.isRead) {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      }
      
      // Navigate depending on type and presence of IDs
      if (notif.postId && (notif.type === 'like' || notif.type === 'comment' || notif.type === 'mention')) {
        navigate(`/post/${notif.postId}`);
      } else if (notif.username) {
        // Find matching registered user if exists, then navigate to profile
        const usersQ = query(collection(db, 'users'), where('displayName', '==', notif.username));
        const uSnap = await getDocs(usersQ);
        if (!uSnap.empty) {
          navigate(`/profile/${uSnap.docs[0].id}`);
        } else {
          navigate(`/profile`);
        }
      }
    } catch (err) {
      console.error("Failed notification execution click:", err);
    }
  };

  const hasUnread = notifications.some(n => !n.isRead);

  // Type-Badge colors/icons resolver
  const getBadgeConfig = (type: string) => {
    switch (type) {
      case 'like':
        return { color: 'bg-red-500', icon: Heart };
      case 'comment':
        return { color: 'bg-indigo-500', icon: MessageSquare };
      case 'follow':
      case 'follow_request':
      case 'follow_accepted':
        return { color: 'bg-emerald-500', icon: UserPlus };
      case 'mention':
        return { color: 'bg-amber-500', icon: AtSign };
      default:
        return { color: 'bg-blue-500', icon: Sparkles };
    }
  };

  return (
    <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-6 pb-28 relative">
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none blur-3xl" />

      {/* Primary Top Header Nav */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-4 glass-dark px-4 rounded-xl border border-white/5 backdrop-blur-2xl shadow-xl mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-display font-black tracking-[0.2em] text-white uppercase mt-0.5">
          NOTIFICATIONS
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            disabled={!hasUnread}
            className={cn(
              "p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/40 active:scale-95 transition-all cursor-pointer",
              hasUnread ? "hover:text-gold-400 hover:bg-gold-500/10 hover:border-gold-500/20" : "opacity-30 cursor-not-allowed"
            )}
            title="Mark all as read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <Link
            to="/settings"
            className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/40 hover:text-white active:scale-95 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Filter Row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 select-none">
        {(['all', 'like', 'comment', 'follow', 'mention'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border whitespace-nowrap",
              activeFilter === filter
                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                : "bg-white/[0.01] text-white/40 border-white/5 hover:text-white hover:bg-white/5"
            )}
          >
            {filter === 'all' ? 'All' : filter + 's'}
          </button>
        ))}
      </div>

      {/* Special Row: Pending Follow Requests list */}
      {followRequestsCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/follow-requests')}
          className="mb-4 glass p-4 rounded-xl border border-purple-500/20 text-xs font-semibold flex items-center justify-between cursor-pointer select-none hover:bg-purple-950/10 group shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
            <div className="text-[11px] font-black uppercase tracking-wider text-purple-300">
              You have <span className="text-purple-400 text-xs px-1">{followRequestsCount}</span> pending follow requests
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-purple-400/60 group-hover:text-purple-400 transition-colors">Review</span>
            <ChevronRight className="w-4 h-4 text-purple-400/60 group-hover:translate-x-0.5 transition-all" />
          </div>
        </motion.div>
      )}

      {/* Notifications listings */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-black/20 border border-white/5 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">TRANSMISSIONS CLEAR</p>
          <p className="text-[8px] text-white/10 uppercase tracking-widest">No wave notifications recorded under this selector</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupCollection).map((grpKey) => {
            const list = groupCollection[grpKey];
            if (list.length === 0) return null;

            return (
              <div key={grpKey} className="space-y-2.5">
                <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-purple-400/90 pl-1">
                  {grpKey === 'New' ? '🔥 ' + grpKey : grpKey}
                </h3>
                
                <div className="space-y-1.5">
                  {list.map((notif) => {
                    const badge = getBadgeConfig(notif.type);
                    const BadgeIcon = badge.icon;
                    const isFollowingUser = followingIds.includes(notif?.userId || '');

                    return (
                      <motion.div
                        layout
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={cn(
                          "p-3 rounded-xl flex items-center justify-between gap-3 border transition-all cursor-pointer relative overflow-hidden group hover:brightness-105",
                          notif.isRead 
                            ? "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]" 
                            : "bg-[#130E26]/40 border-purple-500/20 shadow-[0_4px_16px_rgba(147,51,234,0.04)]"
                        )}
                      >
                        {/* Soft Unread Highlight Tint Element */}
                        {!notif.isRead && (
                          <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-purple-500 to-indigo-600" />
                        )}

                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with dynamic Corner Badge */}
                          <div className="relative shrink-0 select-none">
                            {notif.senderPhoto ? (
                              <img 
                                src={notif.senderPhoto} 
                                alt={notif.username}
                                className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-black"
                                style={{ backgroundColor: notif.avatarColor }}
                              >
                                {notif.avatarInitials}
                              </div>
                            )}
                            
                            {/* Colorful corner badge */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-black",
                              badge.color
                            )}>
                              <BadgeIcon className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>

                          {/* Text Area */}
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-white/90 leading-tight block line-clamp-2 pr-1">
                              {notif.text}
                            </span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mt-1 leading-none">
                              {formatTimeAgo(notif.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Right Area Action / Thumbnail / Chevron */}
                        <div className="shrink-0 flex items-center">
                          {notif.postThumb && (notif.type === 'like' || notif.type === 'comment' || notif.type === 'mention') ? (
                            <img 
                              src={notif.postThumb} 
                              alt="Post preview" 
                              className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/5 group-hover:scale-105 transition-transform"
                            />
                          ) : notif.type === 'follow' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notif.userId) {
                                  toggleFollowUser(notif.userId);
                                }
                              }}
                              disabled={actionLoadingId === notif.userId}
                              className={cn(
                                "py-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-wider select-none shrink-0 border transition-all active:scale-95 cursor-pointer",
                                isFollowingUser
                                  ? "bg-purple-950/20 text-purple-300 border-purple-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                                  : "bg-purple-500 text-white border-transparent hover:bg-purple-400"
                              )}
                            >
                              {actionLoadingId === notif.userId ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                              ) : isFollowingUser ? (
                                <span className="flex items-center gap-1"><UserCheck className="w-2.5 h-2.5" /> Aligned</span>
                              ) : (
                                "Align back"
                              )}
                            </button>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
