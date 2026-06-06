import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, collection, query, orderBy, onSnapshot, getDocs } from '../lib/firebase';
import { Post, UserProfile } from '../types';
import { PostCard } from '../components/PostCard';
import { Loader2, ChevronLeft, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export function PlaceFeedScreen() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!placeId) return;

    setLoading(true);

    const loadPostsAndFilter = async () => {
      try {
        // Step 1: Query users where location matches placeId
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersMap = new Map<string, UserProfile>();
        usersSnap.docs.forEach(docSnap => {
          const u = docSnap.data() as UserProfile;
          usersMap.set(u.uid, u);
        });

        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const allPosts = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as Post[];

          // Filter posts:
          // 1. If post content contains the placeId name (case-insensitive)
          // 2. Or, if the post author's profile has location == placeId
          const filtered = allPosts.filter(post => {
            const cleanPlaceId = placeId.toLowerCase();
            const contentsMatch = post.content?.toLowerCase().includes(cleanPlaceId);
            
            const author = usersMap.get(post.authorId);
            const authorLocationMatches = author?.location?.toLowerCase() === cleanPlaceId;

            return contentsMatch || authorLocationMatches;
          });

          setPosts(filtered);
          setLoading(false);
        }, (error) => {
          console.error("Firestore loading place posts snapshot error:", error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Failed to load users mapping for place feed:", err);
        setLoading(false);
      }
    };

    let unsub: any;
    loadPostsAndFilter().then((cleanup) => {
      unsub = cleanup;
    });

    return () => {
      if (unsub) unsub();
    };
  }, [placeId]);

  const displayPlace = placeId ? placeId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-28">
      {/* Premium Header Accent Grid */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none blur-3xl animate-pulse" />

      {/* Breadcrumb Back Navigation */}
      <div className="mb-6 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/70 hover:text-amber-400 hover:bg-gold-500/10 transition-all border border-white/5 flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">Back to collective</span>
        </button>
      </div>

      {/* Place Page Identification */}
      <div className="text-center py-6 sm:py-10 mb-8 relative z-10 border-b border-white/5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <MapPin className="w-6 h-6 animate-bounce" />
        </div>
        <p className="text-gold-500 text-[10px] uppercase tracking-[0.5em] font-black mb-1">
          Geo Frequency Node
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-widest text-white uppercase">
          {displayPlace}
        </h1>
        <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">
          Syncing local coordinate records and wave signatures
        </p>
      </div>

      {/* Feed list */}
      <div className="space-y-6 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">Syncing coordinates waveband...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card py-24 text-center border-dashed border-white/5 rounded-3xl pb-20">
            <p className="text-white/25 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Atmosphere Calm</p>
            <p className="text-white/10 text-[8px] uppercase tracking-widest leading-relaxed">No telemetry broadcasts matching this place currently registered</p>
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
