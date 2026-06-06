import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp, deleteDoc, increment, getDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Check, Trash2, ShieldAlert, Users, Loader2 } from 'lucide-react';
import { createNotification } from '../lib/notifications';
import { cn } from '../lib/utils';

interface FollowRequestItem {
  id: string;
  requesterId: string;
  receiverId: string;
  createdAt: string;
  username: string;
  displayName: string;
  photoURL?: string;
  followerCount?: number;
  mutualFollow?: boolean;
}

export function FollowRequestsScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<{ [key: string]: 'confirming' | 'deleting' }>({});

  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);

    const q = query(
      collection(db, 'follow_requests'),
      where('receiverId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FollowRequestItem[];

      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(items);
      setLoading(false);
    }, (error) => {
      console.error("Failed loading follow requests:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile?.uid]);

  // Confirm / Accept Request
  const handleConfirm = async (req: FollowRequestItem) => {
    if (!profile) return;
    setStatusMap(p => ({ ...p, [req.id]: 'confirming' }));
    try {
      const batch = writeBatch(db);
      
      const requesterId = req.requesterId;
      const receiverId = profile.uid;
      
      const followerRef = doc(db, 'users', receiverId, 'followers', requesterId);
      const followingRef = doc(db, 'users', requesterId, 'following', receiverId);
      
      const receiverUserRef = doc(db, 'users', receiverId);
      const requesterUserRef = doc(db, 'users', requesterId);
      
      const followData = {
        followerId: requesterId,
        followedId: receiverId,
        createdAt: serverTimestamp()
      };
      
      batch.set(followerRef, followData);
      batch.set(followingRef, followData);
      
      batch.update(receiverUserRef, { followersCount: increment(1) });
      batch.update(requesterUserRef, { followingCount: increment(1) });
      
      // Delete request
      batch.delete(doc(db, 'follow_requests', req.id));
      
      await batch.commit();

      // Push custom notification
      await createNotification({
        userId: requesterId,
        type: 'follow_accepted',
        username: profile.displayName || 'Collective Partner',
        text: `${profile.displayName || 'Collective Partner'} accepted your follow request`,
        avatarInitials: (profile.displayName || 'CP').substring(0, 2).toUpperCase(),
        avatarColor: '#10B981'
      });
    } catch (err) {
      console.error("Failed accepting follow request:", err);
    } finally {
      setStatusMap(p => {
        const copy = { ...p };
        delete copy[req.id];
        return copy;
      });
    }
  };

  // Delete Request
  const handleDelete = async (reqId: string) => {
    setStatusMap(p => ({ ...p, [reqId]: 'deleting' }));
    try {
      await deleteDoc(doc(db, 'follow_requests', reqId));
    } catch (err) {
      console.error("Failed deleting follow request:", err);
    } finally {
      setStatusMap(p => {
        const copy = { ...p };
        delete copy[reqId];
        return copy;
      });
    }
  };

  // Delete All Requests
  const handleDeleteAll = async () => {
    if (requests.length === 0) return;
    try {
      const batch = writeBatch(db);
      requests.forEach((req) => {
        batch.delete(doc(db, 'follow_requests', req.id));
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed deleting all follow requests:", err);
    }
  };

  return (
    <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-6 pb-28 relative">
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none blur-3xl" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-4 glass-dark px-4 rounded-xl border border-white/5 backdrop-blur-2xl shadow-xl mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-display font-black tracking-[0.2em] text-white uppercase mt-0.5">
            FOLLOW REQUESTS
          </h2>
          {requests.length > 0 && (
            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-500/20">
              {requests.length}
            </span>
          )}
        </div>
        <div className="w-8" /> {/* Balance spacer */}
      </header>

      {/* Brief Instruction */}
      <div className="glass p-4 rounded-xl border border-white/5 mb-6 text-[11px] text-white/60 leading-relaxed uppercase tracking-widest font-mono">
        Review wave alignments of members requesting private access to scanning your resonance frequencies.
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-black/20 border border-white/5 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">NO INBOUND REQUESTS</p>
          <p className="text-[8px] text-white/10 uppercase tracking-widest">No pending waves seeking authentication at this moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {requests.map((req) => (
              <motion.div
                layout
                key={req.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -30 }}
                transition={{ duration: 0.3 }}
                className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-4 shadow-sm hover:border-white/10 transition-colors"
                onClick={() => navigate(`/profile/${req.requesterId}`)}
              >
                <div className="flex items-center gap-3 min-w-0 cursor-pointer">
                  {/* Avatar */}
                  {req.photoURL ? (
                    <img 
                      src={req.photoURL} 
                      alt={req.displayName} 
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold shrink-0">
                      {req.displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Username and statistics info */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                      {req.displayName}
                    </h4>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate mt-0.5 leading-none">
                      @{req.username || 'member'} • {req.followerCount || 0} waves
                    </p>
                    {req.mutualFollow && (
                      <div className="flex items-center gap-1 mt-1.5 text-purple-400 text-[8px] font-black uppercase tracking-wider">
                        <Users className="w-2.5 h-2.5 shrink-0" />
                        <span>Followed by mutual friend</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm + Delete primary Buttons */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleConfirm(req)}
                    disabled={!!statusMap[req.id]}
                    className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-500 hover:bg-purple-400 text-white flex items-center gap-1 transition-all active:scale-95 cursor-pointer border-none"
                  >
                    {statusMap[req.id] === 'confirming' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3 h-3 shrink-0" />
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={!!statusMap[req.id]}
                    className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border border-purple-500/20 text-purple-300 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all active:scale-95 cursor-pointer bg-transparent"
                  >
                    {statusMap[req.id] === 'deleting' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Delete all button */}
          <div className="pt-6">
            <button
              onClick={handleDeleteAll}
              className="w-full py-3 px-4 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] border border-red-500/20 text-red-500 bg-red-500/[0.02] hover:bg-red-500/10 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete all requests</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
