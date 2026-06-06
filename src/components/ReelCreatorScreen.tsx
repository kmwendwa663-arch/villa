import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Music, 
  Sparkles, 
  Video, 
  Volume2, 
  Layers, 
  Play, 
  Pause, 
  Scissors, 
  Upload, 
  RotateCcw,
  Loader2,
  Share2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';

interface ReelClipPreset {
  id: string;
  url: string;
  thumbnail: string;
  duration: string;
  location: string;
}

const REEL_PRESETS: ReelClipPreset[] = [
  { id: 're-1', url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=100&q=50', duration: '9.4s', location: 'St. Tropez Coastline' },
  { id: 're-2', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=100&q=50', duration: '12.1s', location: 'Malibu Sunset Shore' },
  { id: 're-3', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&q=50', duration: '15.0s', location: 'Metropolitan Suite View' },
  { id: 're-4', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=100&q=50', duration: '8.5s', location: 'Versailles Garden Path' },
];

const REEL_MUSIC_SUGGESTIONS = [
  { id: 'rm-1', name: 'Golden Hour Symphony', artist: 'Hôtel Ritz Ambient Orchestra' },
  { id: 'rm-2', name: 'Riviera Yacht Club Lounge', artist: 'DJ Sol' },
  { id: 'rm-3', name: 'Neon Skylines', artist: 'The Grid Syndicate' },
  { id: 'rm-4', name: 'Minimalist Dreamscape', artist: 'Katsuya' },
];

const REEL_EFFECTS = [
  { id: 'none', label: 'Vintage Clean', className: 'sepia-10 saturate-110' },
  { id: 'gold', label: 'Luxury Flare', className: 'contrast-105 saturate-125 brightness-105 sepia' },
  { id: 'glitch', label: 'Metropolis Glitch', className: 'hue-rotate-90 saturate-150 contrast-125' },
  { id: 'cinematic', label: 'Concierge Grain', className: 'grayscale contrast-110 brightness-95' },
];

interface ReelCreatorScreenProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function ReelCreatorScreen({ onClose, onSuccess }: ReelCreatorScreenProps) {
  const { profile } = useAuth();
  const [selectedClip, setSelectedClip] = useState<ReelClipPreset>(REEL_PRESETS[0]);
  const [activeMusic, setActiveMusic] = useState<typeof REEL_MUSIC_SUGGESTIONS[0] | null>(null);
  const [activeEffect, setActiveEffect] = useState('none');
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundVolume, setSoundVolume] = useState(75);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [locationText, setLocationText] = useState(REEL_PRESETS[0].location);

  const [trimDuration, setTrimDuration] = useState([0, 100]); // percentage trim slider simulation

  useEffect(() => {
    setLocationText(selectedClip.location);
  }, [selectedClip]);

  const handleShareReel = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `Uploaded a Reel 🎬: ${captionText || 'Live on the waveband'} ${activeMusic ? `🎶 Music: ${activeMusic.name}` : ''} 📍 Location: ${locationText}`,
        category: 'Luxury',
        imageUrl: selectedClip.url,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        isReel: true,
        musicTitle: activeMusic?.name || null,
        location: locationText
      });
      onSuccess('Premium Reel shared in Feed Stream successfully!');
      onClose();
    } catch (err) {
      console.error("Failed to share Reel:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentEffectClass = REEL_EFFECTS.find(e => e.id === activeEffect)?.className || '';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row h-screen overflow-hidden text-white font-sans">
      
      {/* LEFT COMPILER VIEWPORT */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
        
        {/* Core Screen */}
        <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-[36px] overflow-hidden border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col justify-between">
          
          {/* Main Visual Frame */}
          <div className="absolute inset-0 z-0">
            <img 
              src={selectedClip.url} 
              className={`w-full h-full object-cover transition-all duration-500 origin-center ${currentEffectClass}`} 
              alt="Reel canvas"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 pointer-events-none" />

            {/* Glowing active play icon simulation */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:scale-105 transition-transform" onClick={() => setIsPlaying(true)}>
                    <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TOP OVERLAY */}
          <div className="relative z-10 p-5 flex items-center justify-between">
            <button 
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="px-3.5 py-1.5 rounded-full bg-red-600 border border-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.3)] select-none">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Reel Live
            </span>
          </div>

          {/* BOTTOM OVERLAY INFO ACCENTS */}
          <div className="relative z-10 p-5 space-y-4">
            
            {/* Ambient Song Card overlay */}
            {activeMusic && (
              <div className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2.5 max-w-[85%] animate-bounce">
                <Music className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 truncate">{activeMusic.name}</p>
                  <p className="text-[7px] uppercase tracking-widest text-white/50 truncate">by {activeMusic.artist}</p>
                </div>
              </div>
            )}

            {/* Live progress slider timeline bar */}
            <div className="space-y-1">
              <div className="h-[2.5px] w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-amber-500" 
                  initial={{ width: '0%' }}
                  animate={isPlaying ? { width: '100%' } : { width: '40%' }}
                  transition={isPlaying ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">Clip Preset Length</span>
                <span className="text-[8px] font-mono text-white/60 tracking-widest uppercase">{selectedClip.duration}</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT EDITING INSTRUMENTS PANEL */}
      <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-white/5 bg-black/95 p-6 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-6">
          
          <div>
            <p className="text-amber-500 text-[9px] uppercase tracking-[0.4em] font-black">REEL MULTIMEDIA</p>
            <h2 className="text-xl font-display font-black tracking-wider text-white uppercase mt-1">CINEMATIC LAB</h2>
          </div>

          {/* CLIP PRESETS SELECTOR */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Raw Footage Frame</h4>
            <div className="grid grid-cols-4 gap-2">
              {REEL_PRESETS.map((p) => {
                const isActive = selectedClip.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedClip(p)}
                    className={`aspect-square rounded-xl overflow-hidden relative border transition-all ${isActive ? 'border-amber-500 scale-95 ring-2 ring-amber-500/20' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <img src={p.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    <span className="absolute bottom-1 right-1 text-[7px] bg-black/70 px-1 rounded text-white font-mono">{p.duration}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BACKGROUND MUSIC SELECTOR */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Soundtrack Fusion</h4>
            <div className="space-y-2 divide-y divide-white/5 bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
              {REEL_MUSIC_SUGGESTIONS.map((sound) => {
                const isCur = activeMusic?.id === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => setActiveMusic(sound)}
                    className={`p-3 hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors ${isCur ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'text-white/70'}`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white">{sound.name}</p>
                      <p className="text-[8px] uppercase tracking-widest text-white/40">{sound.artist}</p>
                    </div>
                    {isCur ? (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-white/25 hover:text-white" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CINEMATIC POST EFFECTS */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Cinematography Tone</h4>
            <div className="grid grid-cols-2 gap-2">
              {REEL_EFFECTS.map((e) => {
                const isCur = activeEffect === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveEffect(e.id)}
                    className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all text-center ${isCur ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white'}`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAPTION DIRECT ENTRY */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Reels Inscription</h4>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="What is this cinematic moment telling the collective…"
              className="w-full bg-[#121212] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500 uppercase tracking-widest min-h-[75px] resize-none"
            />
          </div>

          {/* EDIT GEOGRAPHIC COORDINATE TEXT */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Coordinate Resonance Label</h4>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="E.g. Cote d'Azur Coastline"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500 uppercase tracking-widest"
            />
          </div>

        </div>

        {/* ACTIONS FOOTER */}
        <div className="pt-6 border-t border-white/5 space-y-3">
          <button
            onClick={handleShareReel}
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95 text-xs font-black uppercase tracking-widest"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Share2 className="w-4 h-4 text-black" />
            )}
            Transmit Reel Wave
          </button>

          <p className="text-[8px] text-white/30 text-center uppercase tracking-widest">
            Broadcasts instantly inside feed and dynamic visuality boards
          </p>
        </div>

      </div>

    </div>
  );
}
