import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, getDocs } from '../lib/firebase';
import { Post, POST_CATEGORIES } from '../types';
import { useAuth } from '../lib/AuthContext';
import { PostCard } from '../components/PostCard';
import { CreatePost } from '../components/CreatePost';
import { Loader2, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Feed() {
  const { profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    if (activeCategory !== 'All') {
      q = query(collection(db, 'posts'), where('category', '==', activeCategory), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile, activeCategory]);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6">
      <header className="py-12 sm:py-20 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-white mb-4"
        >
          <span className="text-gold-500 italic">Meso</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 uppercase tracking-[0.4em] text-[10px] font-bold"
        >
          The Collective Consciousness
        </motion.p>
      </header>

      <div className="space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 sm:p-10 premium-border"
        >
          <CreatePost />
        </motion.div>

        <div className="sticky top-6 z-20">
          <nav className="glass-dark p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl border border-white/5 backdrop-blur-2xl overflow-x-auto no-scrollbar">
            {['All', ...POST_CATEGORIES].map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex-shrink-0",
                    isActive 
                      ? "bg-gold-500 text-black" 
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  {cat === 'All' ? 'Discover' : cat}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-6 pb-20">
          {loading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Syncing Feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card py-32 text-center">
              <p className="text-white/20 font-bold uppercase tracking-[0.4em]">The void calls back</p>
            </div>
          ) : (
            posts.map((post, idx) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * Math.min(idx, 5) }}
              >
                <PostCard post={post} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
