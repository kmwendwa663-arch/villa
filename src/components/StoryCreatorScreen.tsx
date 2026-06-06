import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Camera, 
  Sparkles, 
  Type, 
  Music, 
  Smile, 
  ChevronRight, 
  Download, 
  Share2, 
  Heart,
  Loader2,
  Undo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';

interface StoryPreset {
  id: string;
  url: string;
  name: string;
}

const STORY_PRESETS: StoryPreset[] = [
  { id: 'story-1', url: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=600&auto=format&fit=crop&q=80', name: 'Desert Oasis' },
  { id: 'story-2', url: 'https://images.unsplash.com/photo-1513829096999-4978602297af?w=600&auto=format&fit=crop&q=80', name: 'City After Hours' },
  { id: 'story-3', url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&auto=format&fit=crop&q=80', name: 'Acoustic GoldenHour' },
  { id: 'story-4', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80', name: 'Gallery Arch' },
];

const STORY_FILTERS = [
  { id: 'none', label: 'Normal', className: '' },
  { id: 'chroma', label: 'Chrome', className: 'saturate-150 contrast-110' },
  { id: 'warm', label: 'Warm Glow', className: 'sepia-30 hue-rotate-15 contrast-95 saturate-125' },
  { id: 'midnight', label: 'Midnight', className: 'brightness-75 contrast-125 grayscale' },
  { id: 'vintage', label: '1990s Film', className: 'contrast-90 saturate-75 sepia-20' },
  { id: 'neon', label: 'Cyber Neon', className: 'hue-rotate-60 saturate-200 contrast-105' },
];

const STORY_MUSIC = [
  { id: 'm-1', title: 'Serenade of Monaco', artist: 'Saint Tropez Trio' },
  { id: 'm-2', title: 'Cyber Resonance', artist: 'Hologram Keys' },
  { id: 'm-3', title: 'Midnight Lounge', artist: 'Coterie' },
  { id: 'm-4', title: 'Vintage Velvet', artist: 'L\'Atelier' },
];

interface StoryCreatorScreenProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function StoryCreatorScreen({ onClose, onSuccess }: StoryCreatorScreenProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [selectedPhoto, setSelectedPhoto] = useState<string>(STORY_PRESETS[0].url);
  const [activeFilter, setActiveFilter] = useState('none');
  const [textSticker, setTextSticker] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [placedText, setPlacedText] = useState<{ text: string; x: number; y: number; color: string } | null>(null);
  const [textColor, setTextColor] = useState('#ffffff');
  
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; artist: string } | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag text implementation simulation
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleShareStory = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      // Stories disappear in 24 hours, added to Firestore posts with tag Story or category Story
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `Added to Story ⚡ ${textSticker || placedText?.text || ''} ${selectedMusic ? `🎶 ${selectedMusic.title}` : ''}`,
        category: 'Lifestyle',
        imageUrl: selectedPhoto,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        isStory: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      onSuccess('Story published successfully to your community!');
      onClose();
    } catch (err) {
      console.error("Story sharing failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFilterClass = STORY_FILTERS.find(f => f.id === activeFilter)?.className || '';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row h-screen overflow-hidden text-white font-sans">
      
      {/* ─── LEFT PANEL: THE CREATIVE CANVAS VIEWPORT ─── */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-950 p-4 sm:p-6 md:p-8">
        
        {/* Story Content Frame Container */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-[420px] aspect-[9/16] bg-zinc-900 rounded-[32px] overflow-hidden shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] border border-white/5 flex items-center justify-center select-none"
        >
          {/* Main Selected Image Base with Active Filter */}
          <img 
            src={selectedPhoto} 
            alt="Story Canvas" 
            className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-300 ${currentFilterClass}`}
            referrerPolicy="no-referrer"
          />

          {/* Glowing Premium Ambient Aura behind */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* FLOATING TEXT STICKER PREVIEW */}
          {placedText && (
            <motion.div 
              drag
              dragConstraints={containerRef}
              className="absolute z-20 cursor-grab active:cursor-grabbing px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10"
              style={{ left: `${placedText.x}%`, top: `${placedText.y}%` }}
            >
              <p className="text-sm font-black tracking-wider uppercase" style={{ color: placedText.color }}>
                {placedText.text}
              </p>
            </motion.div>
          )}

          {/* FLOATING STICKERS PREVIEW */}
          {selectedStickers.map((sticker, idx) => (
            <motion.div
              key={idx}
              drag
              dragConstraints={containerRef}
              className="absolute text-5xl z-20 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform"
              style={{ left: `${25 + (idx * 15) % 40}%`, top: `${35 + (idx * 10) % 30}%` }}
            >
              {sticker}
            </motion.div>
          ))}

          {/* FLOATING CURRENT SONG BADGE */}
          {selectedMusic && (
            <motion.div 
              className="absolute bottom-16 left-6 right-6 z-20 glass-dark p-3 rounded-2xl border border-white/10 flex items-center gap-3 animate-pulse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-400 truncate">{selectedMusic.title}</p>
                <p className="text-[8px] uppercase tracking-widest text-white/40 truncate">{selectedMusic.artist}</p>
              </div>
              <button 
                onClick={() => setSelectedMusic(null)}
                className="p-1 rounded bg-white/5 text-white/50 hover:text-white"
              >
                <X className="w-3 advisory-icon" />
              </button>
            </motion.div>
          )}

          {/* TOP OVERLAY HUD */}
          <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-30">
            <button 
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTextInput(true)}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${placedText ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10 text-white/70 hover:text-white'}`}
              >
                <Type className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setShowMusicPicker(!showMusicPicker);
                  setShowStickerPicker(false);
                }}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${selectedMusic ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10 text-white/70 hover:text-white'}`}
              >
                <Music className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowMusicPicker(false);
                }}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${selectedStickers.length > 0 ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10 text-white/70 hover:text-white'}`}
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: INSTRUMENTS AND SELECTORS ─── */}
      <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-white/5 bg-black/90 p-6 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-6">
          
          <div>
            <p className="text-purple-400 text-[9px] uppercase tracking-[0.4em] font-black">STORY COMPOSER</p>
            <h2 className="text-xl font-display font-black tracking-wider text-white uppercase mt-1">CREATIVE LAB</h2>
          </div>

          {/* CATEGORY 1: SELECT SOURCE BASE IMAGE */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Scene Atmosphere</h4>
            <div className="grid grid-cols-4 gap-2">
              {STORY_PRESETS.map((p) => {
                const isActive = selectedPhoto === p.url;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhoto(p.url)}
                    className={`aspect-square rounded-xl overflow-hidden relative border transition-all group ${isActive ? 'border-purple-500 scale-95 ring-2 ring-purple-500/20' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <img src={p.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt="" referrerPolicy="no-referrer" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* CATEGORY 2: FILTERS COMPILATION */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Lens Filters</h4>
            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
              {STORY_FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${isActive ? 'bg-purple-500 border-purple-400 text-white' : 'bg-white/[0.03] border-white/5 text-white/50 hover:text-white'}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CATEGORY 3: SUB-DRAWER: MUSIC PICKING */}
          {showMusicPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-purple-400">Luxury Resonance Club</h5>
                <button onClick={() => setShowMusicPicker(false)} className="text-white/30 hover:text-white text-xs">Close</button>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                {STORY_MUSIC.map((song) => {
                  const isCur = selectedMusic?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => setSelectedMusic(song)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${isCur ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' : 'bg-transparent hover:bg-white/5 text-white/70'}`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider">{song.title}</p>
                        <p className="text-[8px] uppercase tracking-widest text-white/40">{song.artist}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* CATEGORY 4: SUB-DRAWER: STICKER SELECTION */}
          {showStickerPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-purple-400">Ambient Reactions</h5>
                <button onClick={() => setShowStickerPicker(false)} className="text-white/30 hover:text-white text-xs">Close</button>
              </div>
              <div className="grid grid-cols-4 gap-3 text-2xl text-center py-2">
                {['✨', '🔥', '💎', '🤍', '🥂', '🌴', '🕶️', '⚡', '💫', '🌅', '🏰', '🥀'].map((stik) => (
                  <button
                    key={stik}
                    onClick={() => {
                      setSelectedStickers([...selectedStickers, stik]);
                      setShowStickerPicker(false);
                    }}
                    className="hover:scale-125 transition-transform"
                  >
                    {stik}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STICKERS AND TEXT ACTIONS RESET */}
          {(placedText || selectedStickers.length > 0) && (
            <button
              onClick={() => {
                setPlacedText(null);
                setSelectedStickers([]);
              }}
              className="w-full py-2.5 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
            >
              <Undo className="w-3 h-3" />
              Reset stickers & placements
            </button>
          )}

        </div>

        {/* BOTTOM CONFIRM ACTIONS */}
        <div className="pt-6 border-t border-white/5 space-y-3">
          <button
            onClick={handleShareStory}
            disabled={isSubmitting}
            className="w-full btn-gold py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_30px_rgb(212,175,55,0.15)] group"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin inline text-black" />
            ) : (
              <Share2 className="w-4 h-4 inline group-hover:scale-110 transition-transform text-black" />
            )}
            <span className="font-black text-xs uppercase tracking-widest text-black">Transmit to Story Feed</span>
          </button>
          
          <p className="text-[8px] text-white/30 text-center uppercase tracking-widest">
            Disappears automatically to archives after 24 hrs
          </p>
        </div>

      </div>

      {/* TEXT OVERLAY MODAL */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm space-y-5 text-center">
              <h4 className="text-purple-400 text-[10px] uppercase tracking-[0.4em] font-black">STICKER INSCRIPTION</h4>
              
              <input
                type="text"
                autoFocus
                placeholder="Type story overlay note…"
                value={textSticker}
                onChange={(e) => setTextSticker(e.target.value)}
                className="w-full bg-transparent border-none text-2xl font-black text-center text-white focus:ring-0 placeholder-white/15 focus:outline-none uppercase tracking-wider"
              />

              {/* Text color selector */}
              <div className="flex justify-center gap-2.5">
                {['#ffffff', '#ebb334', '#a855f7', '#3b82f6', '#10b981', '#f43f5e'].map((col) => (
                  <button
                    key={col}
                    onClick={() => setTextColor(col)}
                    className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setTextSticker('');
                    setShowTextInput(false);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (textSticker.trim()) {
                      setPlacedText({
                        text: textSticker.trim(),
                        x: 30,
                        y: 40,
                        color: textColor
                      });
                    }
                    setShowTextInput(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-purple-500"
                >
                  Add Note
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
