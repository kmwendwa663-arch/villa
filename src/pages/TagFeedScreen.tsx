import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, collection, query, orderBy, onSnapshot } from '../lib/firebase';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { Loader2, ChevronLeft, Hash } from 'lucide-react';
import { motion } from 'motion/react';

export function TagFeedScreen() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tagId) return;

    setLoading(true);
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      // Filter by category or content containing tagId (case-insensitive)
      const filtered = allPosts.filter(post => {
        const matchesCategory = post.category?.toLowerCase() === tagId.toLowerCase();
        const matchesHashtag = post.content?.toLowerCase().includes(`#${tagId.toLowerCase()}`);
        return matchesCategory || matchesHashtag;
      });

      setPosts(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading tag posts issue:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [tagId]);

  const displayTag = tagId ? tagId.toUpperCase() : '';

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-28">
      {/* Premium Header Accent Grid */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none blur-3xl animate-pulse" />

      {/* Breadcrumb Back Navigation */}
      <div className="mb-6 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/70 hover:text-purple-400 hover:bg-purple-500/10 transition-all border border-white/5 flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">Back to collective</span>
        </button>
      </div>

      {/* Tag Page Identification */}
      <div className="text-center py-6 sm:py-10 mb-8 relative z-10 border-b border-white/5">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Hash className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-purple-400 text-[10px] uppercase tracking-[0.5em] font-black mb-1">
          Tagged Frequency
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-widest text-white uppercase">
          #{displayTag}
        </h1>
        <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">
          Syncing records with code {tagId?.toLowerCase()} resonance index
        </p>
      </div>

      {/* Feed list */}
      <div className="space-y-6 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">Scanning wave signatures...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card py-24 text-center border-dashed border-white/5 rounded-3xl">
            <p className="text-white/25 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Frequency Silent</p>
            <p className="text-white/10 text-[8px] uppercase tracking-widest leading-relaxed">No posts matching #{tagId} currently exist</p>
          </div>
        ) : (
          posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * Math.min(idx, 5) }}
            >
              <PostCard post={post} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
