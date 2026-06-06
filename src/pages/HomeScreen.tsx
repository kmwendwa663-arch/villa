import React, { useEffect, useState, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot, getDocs, where } from '../lib/firebase';
import { Post, POST_CATEGORIES, UserProfile } from '../types';
import { useAuth } from '../lib/AuthContext';
import { PostCard } from '../components/PostCard';
import { Search, Bell, Plus, X, ArrowLeft, Heart, Sparkles, Send, Music, Check, Volume2, Loader2, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatShortName, isUserOnline } from '../lib/utils';

export function HomeScreen() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Feed states
  const [firebasePosts, setFirebasePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Real registered users list
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);

  // Notifications state using real dynamic usernames
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Load posts from Firebase
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      setFirebasePosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile]);

  // Load real registered users dynamically in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(user => user.uid !== profile?.uid);
      setRealUsers(usersList);
    }, (error) => {
      console.error("Error retrieving user listings:", error);
    });
    return unsub;
  }, [profile?.uid]);

  // Load real unread count from Firestore
  useEffect(() => {
    if (!profile?.uid) return;
    const qUnread = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('isRead', '==', false)
    );
    const unsubscribe = onSnapshot(qUnread, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (err) => {
      console.error("Error loading real notification count:", err);
    });
    return unsubscribe;
  }, [profile?.uid]);

  // Filter real database posts by category
  const filteredPosts = firebasePosts.filter(post => {
    if (activeCategory === 'All') return true;
    return post.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 relative pb-28">
      
      {/* Dynamic Glow Accents */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-gold-500/5 to-transparent pointer-events-none blur-3xl" />

      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-5 glass-dark px-4 sm:px-6 rounded-2xl border border-white/5 backdrop-blur-2xl shadow-xl mt-4 mb-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-display font-black text-2xl tracking-[0.2em] text-white group-hover:text-gold-500 transition-colors">
            MESO
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-ping" />
        </Link>

        {/* Action Tray */}
        <div className="flex items-center gap-3 relative">
          <Link 
            to="/search"
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/50 hover:text-gold-500 hover:bg-gold-500/10 active:scale-95 transition-all cursor-pointer"
            title="Explore members"
          >
            <Search className="w-4 h-4" />
          </Link>

          <Link 
            to="/chat"
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/50 hover:text-gold-500 hover:bg-gold-500/10 active:scale-95 transition-all cursor-pointer relative"
            title="Direct Messages"
          >
            <MessageSquare className="w-4 h-4" />
          </Link>
          
          <Link
            to="/notifications"
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/50 hover:text-gold-500 hover:bg-gold-500/10 active:scale-95 transition-all relative cursor-pointer"
            title="Communications Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-400 ring-2 ring-black animate-pulse" />
            )}
          </Link>
        </div>
      </header>

      {/* Horizontal Scrollable Stories Cluster */}
      <section className="mb-8" id="stories-row">
        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3.5 pl-1">EXCLUSIVE CHANNELS</h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 select-none">
          
          {/* Add Broadcast Button */}
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group" onClick={() => navigate('/create')}>
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-gold-500/40 group-hover:border-gold-500 group-hover:scale-105 transition-all duration-300">
              <div className="w-13 h-13 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-gold-500/60 group-hover:text-gold-500 transition-colors" />
              </div>
            </div>
            <span className="text-[9px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest mt-2">
              Broadcast
            </span>
          </div>

          {/* Live Dynamic Channels List */}
          {realUsers.map((item) => {
            const online = isUserOnline(item);
            return (
              <div 
                key={item.uid} 
                onClick={() => navigate(`/profile/${item.uid}`)}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
              >
                <div className="relative">
                  {/* Glowing status ring */}
                  {online ? (
                    <div className="absolute inset-0 rounded-full transition-all duration-500 group-hover:scale-105 bg-gradient-to-tr from-gold-600 via-amber-400 to-gold-500 p-0.5 animate-pulse" />
                  ) : (
                    <div className="absolute inset-0 rounded-full transition-all duration-500 group-hover:scale-105 border border-white/10" />
                  )}
                  <div className="relative w-16 h-16 rounded-full p-0.5 bg-black">
                    <img 
                      src={item.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.uid}`} 
                      alt={item.displayName} 
                      className={cn(
                        "w-full h-full rounded-full object-cover transition-all duration-500",
                        online ? "grayscale-[10%] group-hover:grayscale-0" : "grayscale-[85%] opacity-40 group-hover:grayscale-0 group-hover:opacity-100"
                      )}
                    />
                    {/* Small dynamic status node */}
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black",
                      online ? "bg-emerald-500 shadow-md shadow-emerald-500/40" : "bg-neutral-600"
                    )} />
                  </div>
                </div>
                <span className={cn(
                  "text-[9.5px] font-medium uppercase tracking-wider mt-2 transition-colors max-w-[70px] truncate",
                  online ? "text-white/80 group-hover:text-gold-500" : "text-white/40 group-hover:text-white"
                )}>
                  {formatShortName(item.displayName)}
                </span>
                <span className="text-[6.5px] text-white/20 uppercase font-black tracking-widest mt-0.5">
                  {online ? 'online' : 'offline'}
                </span>
              </div>
            );
          })}

          {realUsers.length === 0 && (
            <div className="flex items-center text-[9px] uppercase tracking-widest text-white/30 border border-white/5 bg-white/[0.01] px-5 py-4 rounded-2xl">
              No other frequency signals active
            </div>
          )}

        </div>
      </section>

      {/* Feed Filters Tabs */}
      <div className="sticky top-[86px] z-20 mb-8" id="category-scroller">
        <nav className="glass-dark p-1.5 rounded-2xl flex items-center gap-1.5 border border-white/5 backdrop-blur-2xl overflow-x-auto no-scrollbar shadow-2xl">
          {['All', ...POST_CATEGORIES].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex-shrink-0 cursor-pointer",
                  isActive 
                    ? "bg-gold-500 text-black shadow-lg shadow-gold-500/10" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                {cat === 'All' ? 'DISCOVER' : cat}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Feed Display Container */}
      <div className="space-y-6">
        {loading || authLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Syncing frequency channels...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="glass-card py-28 text-center premium-border">
            <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px] mb-1">THE VOID CALLS BACK</p>
            <p className="text-[9px] text-white/10 uppercase tracking-widest">Create a broadcast to launch transmission</p>
          </div>
        ) : (
          filteredPosts.map((post, idx) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.1, 0.4) }}
            >
              <PostCard post={post as Post} />
            </motion.div>
          ))
        )}
      </div>

    </div>
  );
}
