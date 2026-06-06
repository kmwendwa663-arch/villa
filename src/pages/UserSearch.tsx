import React, { useEffect, useState, useRef } from 'react';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  writeBatch, 
  increment 
} from '../lib/firebase';
import { UserProfile, Post } from '../types';
import { useAuth } from '../lib/AuthContext';
import { 
  Search as SearchIcon, 
  Loader2, 
  Heart, 
  ChevronRight, 
  Clock, 
  X, 
  Hash, 
  MapPin, 
  UserPlus, 
  UserMinus, 
  Compass, 
  Activity, 
  Users 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn, isUserOnline, formatLastSeen } from '../lib/utils';

interface RecentSearch {
  id: string;
  type: 'tag' | 'person' | 'place';
  label: string;
  subtitle: string;
  avatar?: string;
  timestamp: number;
}

export function UserSearch() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Core Firestore lists
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Interface state controls
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeChip, setActiveChip] = useState<'For you' | 'Trending' | 'People' | 'Places' | 'Tags'>('For you');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Recent Searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('explore_recent_searches_v2');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Reading recent searches failed:", e);
      }
    }
  }, []);

  // Sync to local storage
  const saveRecentSearches = (updated: RecentSearch[]) => {
    setRecentSearches(updated);
    localStorage.setItem('explore_recent_searches_v2', JSON.stringify(updated));
  };

  // Listen to Users (for suggestions + suggested people to follow)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Loading users directory issue:", error);
    });
    return unsubscribe;
  }, []);

  // Listen to Posts (for masonry grid, calculations, tag frequencies)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setAllPosts(postsList);
    }, (error) => {
      console.error("Loading posts data issue:", error);
    });
    return unsubscribe;
  }, []);

  // Listen to Following list of current user in real-time
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'users', profile.uid, 'following'), (snapshot) => {
      setFollowingIds(snapshot.docs.map(doc => doc.id));
    }, (error) => {
      console.warn("Loading list of followed users issue:", error);
    });
    return unsub;
  }, [profile]);

  // Handler for saving a query into Recent Searches log
  const addRecentSearch = (item: Omit<RecentSearch, 'timestamp'>) => {
    const filterOutDup = recentSearches.filter(s => s.id !== item.id);
    const updated: RecentSearch[] = [
      { ...item, timestamp: Date.now() },
      ...filterOutDup
    ].slice(0, 8); // Keep last 8 searches
    saveRecentSearches(updated);
  };

  // Remove individual item from Recent Searches log
  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s.id !== id);
    saveRecentSearches(updated);
  };

  // Follow/Unfollow action toggler
  const toggleFollowUser = async (targetUid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    const isFollowing = followingIds.includes(targetUid);
    const followerRef = doc(db, 'users', targetUid, 'followers', profile.uid);
    const followingRef = doc(db, 'users', profile.uid, 'following', targetUid);
    const targetUserRef = doc(db, 'users', targetUid);
    const currentUserRef = doc(db, 'users', profile.uid);

    try {
      const batch = writeBatch(db);
      if (isFollowing) {
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
      } else {
        const followData = {
          followerId: profile.uid,
          followedId: targetUid,
          createdAt: new Date()
        };
        batch.set(followerRef, followData);
        batch.set(followingRef, followData);
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
      }
      await batch.commit();
    } catch (err) {
      console.error("Toggle follow failure:", err);
    }
  };

  // Generate category chips lists
  const categoryChips = ['For you', 'Trending', 'People', 'Places', 'Tags'] as const;

  // Compute live tags dynamically based on post categories + hashtag frequency counts
  const computedTagsAndCounts = React.useMemo(() => {
    const rawCounts: Record<string, number> = {};

    allPosts.forEach(post => {
      if (post.category) {
        rawCounts[post.category] = (rawCounts[post.category] || 0) + 1;
      }
      // Also check content for hashtags
      const matches = post.content?.match(/#\w+/g);
      if (matches) {
        matches.forEach(m => {
          const formatted = m.slice(1); // remove #
          if (formatted.length > 2) {
            const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            rawCounts[capitalized] = (rawCounts[capitalized] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(rawCounts)
      .map(([name, count]) => ({ name, count }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [allPosts]);

  // Compute live places dynamically based on user profile locations
  const computedPlacesAndCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};

    allUsers.forEach(u => {
      if (u.location) {
        const place = u.location.split(',')[0].trim();
        if (place) {
          counts[place] = (counts[place] || 0) + 1;
        }
      }
    });

    // Cross-check if any post mentions locations in text
    allPosts.forEach(post => {
      Object.keys(counts).forEach(place => {
        if (post.content?.toLowerCase().includes(place.toLowerCase())) {
          counts[place] = (counts[place] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([key, count]) => ({ name: key, count }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [allUsers, allPosts]);

  // Get people suggested to follow (exclude current user and people already following)
  const suggestedPeople = React.useMemo(() => {
    const otherUsers = allUsers.filter(u => u.uid !== profile?.uid);
    // Prefer users with larger follower counts, or shuffle/slice
    return otherUsers
      .filter(u => !followingIds.includes(u.uid))
      .slice(0, 3);
  }, [allUsers, profile, followingIds]);

  // Search results logic grouped by type: Tags, People, Places
  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return { tags: [], people: [], places: [] };

    const queryClean = searchTerm.toLowerCase();

    // 1. Tags matching
    const matchedTags = computedTagsAndCounts.filter(tag => 
      tag.name.toLowerCase().includes(queryClean)
    );

    // 2. People matching
    const matchedPeople = allUsers.filter(user => {
      const matchesName = user.displayName?.toLowerCase().includes(queryClean);
      const matchesUsername = user.username?.toLowerCase().includes(queryClean);
      return matchesName || matchesUsername;
    });

    // 3. Places matching
    const matchedPlaces = computedPlacesAndCounts.filter(place => 
      place.name.toLowerCase().includes(queryClean)
    );

    return {
      tags: matchedTags.slice(0, 4),
      people: matchedPeople.slice(0, 4),
      places: matchedPlaces.slice(0, 4),
    };
  }, [searchTerm, allUsers, computedTagsAndCounts, computedPlacesAndCounts]);

  // Matching preview thumbnails matching search term
  const matchingThumbnails = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const queryClean = searchTerm.toLowerCase();
    return allPosts.filter(post => 
      post.content?.toLowerCase().includes(queryClean) || 
      post.category?.toLowerCase() === queryClean
    ).slice(0, 3);
  }, [searchTerm, allPosts]);

  // Display posts in main grid depends on selected chip category
  const activeGridPosts = React.useMemo(() => {
    let list = [...allPosts];
    if (activeChip === 'Trending') {
      // Sort by likesCount + commentsCount
      list.sort((a, b) => ((b.likesCount || 0) + (b.commentsCount || 0)) - ((a.likesCount || 0) + (a.commentsCount || 0)));
    } else if (activeChip === 'Tags') {
      // Show posts that have categories
      list = list.filter(p => !!p.category);
    }
    // "For you" exhibits standard feed flow index array
    return list;
  }, [allPosts, activeChip]);

  // Cancel Active search handler (returns to default view state)
  const handleCancelSearch = () => {
    setSearchTerm('');
    setIsSearchActive(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Colors for suggested tags icons background
  const tagColorPresets = ['bg-amber-500/10 text-amber-400 border-amber-500/20', 'bg-purple-500/10 text-purple-400 border-purple-500/20', 'bg-blue-500/10 text-blue-400 border-blue-500/20'];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 pb-28 relative">
      {/* Background radial soft light highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-[300px] bg-gradient-to-b from-purple-500/5 via-gold-500/0 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* ─── SEARCH & TOP BAR AREA ─── */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className={`flex-1 relative flex items-center rounded-2xl transition-all duration-300 border bg-black/40 backdrop-blur-md ${isSearchActive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' : 'border-white/5 hover:border-white/10'}`}>
          <SearchIcon className={`absolute left-4 w-4 h-4 transition-colors duration-300 ${isSearchActive ? 'text-purple-400' : 'text-white/30'}`} />
          <input
            ref={searchInputRef}
            type="text"
            id="explore-search-input"
            value={searchTerm}
            onFocus={() => setIsSearchActive(true)}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search people, tags, places…"
            className="w-full pl-11 pr-4 py-3.5 bg-transparent text-xs text-white focus:outline-none placeholder-white/25 font-sans caret-purple-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-4 p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isSearchActive && (
            <motion.button
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancelSearch}
              className="px-4 py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
            >
              Cancel
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================== */}
        {/*   SEARCH ACTIVE STATE PRESENTATION                        */}
        {/* ========================================================== */}
        {isSearchActive ? (
          <motion.div
            key="search-active-pane"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 relative z-10"
          >
            {/* ─── CASE A: EMPTY QUERY, SHOW RECENT SEARCHES ─── */}
            {!searchTerm.trim() ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Recent Searches</h3>
                  {recentSearches.length > 0 && (
                    <button 
                      onClick={() => saveRecentSearches([])}
                      className="text-[9px] font-bold uppercase tracking-widest text-purple-400/80 hover:text-purple-400 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {recentSearches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.01] p-10 text-center">
                    <Clock className="w-5 h-5 text-white/10 mx-auto mb-2.5" />
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">No past explorations</p>
                    <p className="text-[8px] text-white/15 uppercase tracking-widest mt-1">Your recent searches will reside here persistently</p>
                  </div>
                ) : (
                  <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                    {recentSearches.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setSearchTerm(item.label);
                          addRecentSearch(item);
                        }}
                        className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                            {item.type === 'tag' && <Hash className="w-4 h-4" />}
                            {item.type === 'place' && <MapPin className="w-4 h-4" />}
                            {item.type === 'person' && (
                              item.avatar ? (
                                <img src={item.avatar} className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" alt="" />
                              ) : <Compass className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">{item.label}</h4>
                            <p className="text-[8px] uppercase tracking-widest text-white/30 mt-0.5">{item.subtitle}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => removeRecentSearch(item.id, e)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // ─── CASE B: HAS QUERY, SHOW LIVE CLASSIFIED SUGGESTIONS ───
              <div className="space-y-6">
                
                {/* SUGGEST GROUP: TAGS */}
                {searchResults.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-purple-400/80 mb-2.5">Topic matches</h4>
                    <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                      {searchResults.tags.map(tag => (
                        <div
                          key={tag.name}
                          onClick={() => {
                            addRecentSearch({
                              id: `tag-${tag.name}`,
                              type: 'tag',
                              label: `#${tag.name}`,
                              subtitle: 'Topic Frequency Tag'
                            });
                            navigate(`/tag/${tag.name}`);
                          }}
                          className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-purple-400" />
                            <div>
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider">#{tag.name}</h5>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-0.5">{tag.count} broadcasts indexed</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUGGEST GROUP: PEOPLE */}
                {searchResults.people.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-purple-400/80 mb-2.5">Collective Members</h4>
                    <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                      {searchResults.people.map(person => {
                        const isFollowing = followingIds.includes(person.uid);
                        return (
                          <div
                            key={person.uid}
                            onClick={() => {
                              addRecentSearch({
                                id: `person-${person.uid}`,
                                type: 'person',
                                label: person.displayName,
                                subtitle: `@${person.username || 'member'} • Member`,
                                avatar: person.photoURL
                              });
                              navigate(`/profile/${person.uid}`);
                            }}
                            className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-4 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                <img 
                                  src={person.photoURL} 
                                  className={cn(
                                    "w-9 h-9 rounded-xl object-cover transition-all",
                                    isUserOnline(person) ? "ring-2 ring-emerald-500/40 grayscale-0" : "ring-1 ring-white/10 grayscale-[35%] opacity-70"
                                  )} 
                                  alt="" 
                                />
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black",
                                  isUserOnline(person) ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-neutral-600"
                                )} />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider truncate flex items-center gap-1.5">
                                  {person.displayName}
                                </h5>
                                <p className="text-[8px] uppercase tracking-widest text-white/30 mt-0.5 truncate flex items-center gap-1.5">
                                  <span>@{person.username || person.displayName.toLowerCase().replace(/\s+/g, '')}</span>
                                  <span>•</span>
                                  <span>{person.followersCount || 0} waves</span>
                                  <span>•</span>
                                  <span className={cn(isUserOnline(person) ? "text-emerald-400 font-bold" : "text-white/20")}>
                                    {isUserOnline(person) ? "online" : "offline"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            
                            {profile && person.uid !== profile.uid && (
                              <button
                                onClick={(e) => toggleFollowUser(person.uid, e)}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-1 ${
                                  isFollowing
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                    : 'bg-white text-black border-transparent hover:bg-white/80'
                                }`}
                              >
                                {isFollowing ? (
                                  <>
                                    <UserMinus className="w-2.5 h-2.5" />
                                    <span>Unfollow</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-2.5 h-2.5" />
                                    <span>Follow</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUGGEST GROUP: PLACES */}
                {searchResults.places.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-purple-400/80 mb-2.5 font-sans">Geographic Locations</h4>
                    <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                      {searchResults.places.map(place => (
                        <div
                          key={place.name}
                          onClick={() => {
                            addRecentSearch({
                              id: `place-${place.name}`,
                              type: 'place',
                              label: place.name,
                              subtitle: 'Coordinate Location Node'
                            });
                            navigate(`/place/${place.name}`);
                          }}
                          className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            <div>
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider">{place.name}</h5>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-0.5">Frequency index synced ({place.count} references)</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── GRID PREVIEW OF MATCHING POST THUMBNAILS ─── */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Top posts matching "{searchTerm}"
                  </h4>
                  {matchingThumbnails.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">No imagery captures found match this parameter</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {matchingThumbnails.map(post => (
                        <div
                          key={post.id}
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all duration-300"
                        >
                          {post.imageUrl ? (
                            <img src={post.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-3 text-center bg-gradient-to-br from-purple-950/20 to-black">
                              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 line-clamp-3">{post.content}</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex items-center gap-1.5 text-white">
                              <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
                              <span className="text-[10px] font-bold">{post.likesCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </motion.div>
        ) : (
          // ==========================================================
          //   DEFAULT EXPLORE LANDING VIEW SCREEN
          // ==========================================================
          <motion.div
            key="explore-default-pane"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 relative z-10"
          >
            {/* ─── HORIZONTAL SCROLLABLE CATEGORY CHIPS ─── */}
            <div className="no-scrollbar overflow-x-auto flex items-center gap-2 pb-1">
              {categoryChips.map(chipName => {
                const isActive = activeChip === chipName;
                return (
                  <button
                    key={chipName}
                    onClick={() => setActiveChip(chipName)}
                    className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex-shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-purple-600 border border-purple-500 text-white shadow-[0_4px_12px_rgba(168,85,247,0.25)]' 
                        : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] text-white/50 hover:text-white'
                    }`}
                  >
                    {chipName}
                  </button>
                );
              })}
            </div>

            {/* ─── DYNAMIC BOARD CATEGORY RENDERERS ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  {activeChip === 'People' ? 'Collective Members' : activeChip === 'Places' ? 'Geo Frequency Coordinates' : activeChip === 'Tags' ? 'Trending Topic Waves' : 'Visuality Board'}
                </h3>
                <span className="text-[8px] text-purple-400 font-black uppercase tracking-[0.2em] flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" /> Live wave streams
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Structuring coordinates visualizer...</p>
                </div>
              ) : activeChip === 'People' ? (
                <div className="space-y-3">
                  {allUsers.length === 0 ? (
                    <div className="p-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                      <Users className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">No registered members found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allUsers.map((person) => {
                        const isFollowing = followingIds.includes(person.uid);
                        const isMe = person.uid === profile?.uid;
                        return (
                          <div
                            key={person.uid}
                            onClick={() => navigate(`/profile/${person.uid}`)}
                            className="p-4 rounded-2xl glass hover:bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 hover:border-purple-500/25"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                <img 
                                  src={person.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200'} 
                                  className={cn(
                                    "w-11 h-11 rounded-xl object-cover transition-all",
                                    isUserOnline(person) ? "ring-2 ring-emerald-500/40 grayscale-0" : "ring-1 ring-white/10 grayscale-[35%] opacity-70"
                                  )} 
                                  alt="" 
                                />
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black",
                                  isUserOnline(person) ? "bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" : "bg-neutral-600"
                                )} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate flex items-center gap-2">
                                  {person.displayName}
                                  {isUserOnline(person) ? (
                                    <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-widest leading-none animate-pulse">
                                      online
                                    </span>
                                  ) : (
                                    <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/30 font-bold uppercase tracking-widest leading-none">
                                      offline
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[8px] uppercase tracking-widest text-white/40 mt-0.5 truncate">
                                  @{person.username || person.displayName.toLowerCase().replace(/\s+/g, '')}
                                  {!isUserOnline(person) && person.lastSeen && (
                                    <span className="text-white/25"> • seen {formatLastSeen(person.lastSeen)}</span>
                                  )}
                                </p>
                                <p className="text-[7px] font-mono font-bold text-purple-400/80 uppercase tracking-widest mt-1">
                                  {person.followersCount || 0} Followers • {person.followingCount || 0} Following
                                </p>
                              </div>
                            </div>

                            {!isMe && profile && (
                              <button
                                onClick={(e) => toggleFollowUser(person.uid, e)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-1 flex-shrink-0 ${
                                  isFollowing
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                    : 'bg-white text-black border-transparent hover:bg-white/80'
                                }`}
                              >
                                {isFollowing ? (
                                  <>
                                    <UserMinus className="w-2.5 h-2.5" />
                                    <span>Following</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-2.5 h-2.5" />
                                    <span>Follow</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeChip === 'Places' ? (
                <div className="space-y-3">
                  {computedPlacesAndCounts.length === 0 ? (
                    <div className="p-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                      <MapPin className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">No registered location frequencies found</p>
                      <p className="text-[8px] text-white/10 uppercase tracking-widest mt-1">Specify a location in edit profile to sync coordinates</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {computedPlacesAndCounts.map((place) => (
                        <div
                          key={place.name}
                          onClick={() => navigate(`/place/${place.name}`)}
                          className="p-4 rounded-2xl glass hover:bg-white/[0.02] border border-white/5 flex items-center justify-between cursor-pointer transition-all duration-300 hover:border-amber-500/25 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">{place.name}</h4>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-0.5">{place.count} local frequency references</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeChip === 'Tags' ? (
                <div className="space-y-3">
                  {computedTagsAndCounts.length === 0 ? (
                    <div className="p-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                      <Hash className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">No registered hashtag frequencies found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {computedTagsAndCounts.map((tag) => (
                        <div
                          key={tag.name}
                          onClick={() => navigate(`/tag/${tag.name}`)}
                          className="p-4 rounded-2xl glass hover:bg-white/[0.02] border border-white/5 flex items-center justify-between cursor-pointer transition-all duration-300 hover:border-purple-500/25 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                              <Hash className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors">#{tag.name}</h4>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-0.5">{tag.count} broadcasts indexed</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeGridPosts.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                  <Compass className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">No wave capture records in active filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 auto-rows-[164px]">
                  {activeGridPosts.map((post, idx) => {
                    const isTall = idx % 3 === 0;
                    const showLikeOverlay = (post.likesCount || 0) > 100;
                    return (
                      <div
                        key={post.id}
                        onClick={() => navigate(`/post/${post.id}`)}
                        className={`rounded-2xl overflow-hidden bg-white/5 border border-white/5 relative group cursor-pointer hover:border-purple-500/50 hover:scale-[1.01] active:scale-95 transition-all duration-300 ${isTall ? 'row-span-2 h-full' : 'h-full'}`}
                      >
                        {post.imageUrl ? (
                          <img src={post.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-4 text-center bg-gradient-to-br from-purple-950/10 via-black to-gold-950/5">
                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 leading-relaxed line-clamp-4">{post.content}</p>
                          </div>
                        )}

                        {/* Hover Overlay OR likes count display overlay if likesCount > 100 */}
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 ${showLikeOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className={`flex items-center gap-1.5 text-white ${showLikeOverlay ? 'bg-black/40 px-2.5 py-1 rounded-xl backdrop-blur-md border border-white/10' : ''}`}>
                            <Heart className={`w-3.5 h-3.5 text-red-500 fill-current ${showLikeOverlay ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-bold">{post.likesCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── TRENDING TAGS SECTION ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Trending Tags</h3>
                <button
                  onClick={() => {
                    setActiveChip('Tags');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {computedTagsAndCounts.slice(0, 3).map((tag, idx) => {
                  const styleClass = tagColorPresets[idx % tagColorPresets.length];
                  return (
                    <div
                      key={tag.name}
                      onClick={() => navigate(`/tag/${tag.name}`)}
                      className="p-3.5 rounded-2xl glass hover:bg-white/[0.02] border border-white/5 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-xs font-mono font-black text-white/20 uppercase tracking-widest">{idx + 1}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors">#{tag.name}</h4>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-0.5">{tag.count} broadcasts broadcasted</p>
                        </div>
                      </div>

                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-black ${styleClass}`}>
                        <Hash className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── PEOPLE TO FOLLOW SECTION ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">People to Follow</h3>
                <button
                  onClick={() => {
                    setActiveChip('People');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {suggestedPeople.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">All current wave frequencies followed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedPeople.map((person) => {
                    const isFollowing = followingIds.includes(person.uid);
                    return (
                      <div
                        key={person.uid}
                        onClick={() => navigate(`/profile/${person.uid}`)}
                        className="p-3.5 rounded-2xl glass hover:bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img 
                              src={person.photoURL} 
                              className={cn(
                                "w-10 h-10 rounded-xl object-cover transition-all",
                                isUserOnline(person) ? "ring-2 ring-emerald-500/40 grayscale-0" : "ring-1 ring-white/10 grayscale-[35%] opacity-75"
                              )} 
                              alt="" 
                            />
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black",
                              isUserOnline(person) ? "bg-emerald-500 shadow-sm" : "bg-neutral-600"
                            )} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate flex items-center gap-1.5">
                              {person.displayName}
                              {isUserOnline(person) ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ) : null}
                            </h4>
                            <p className="text-[8px] uppercase tracking-widest text-white/30 mt-0.5 truncate flex items-center gap-1.5">
                              <span>@{person.username || person.displayName.toLowerCase().replace(/\s+/g, '')}</span>
                              <span>•</span>
                              <span>{person.followersCount || 0} waves</span>
                              <span>•</span>
                              <span className={cn(isUserOnline(person) ? "text-emerald-400 font-bold" : "text-white/20")}>
                                {isUserOnline(person) ? "online" : "offline"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => toggleFollowUser(person.uid, e)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-1 flex-shrink-0 ${
                            isFollowing
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                              : 'bg-white text-black border-transparent hover:bg-white/80'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserMinus className="w-2.5 h-2.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-2.5 h-2.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
