import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Palette, 
  Type, 
  Compass, 
  Loader2,
  Tag
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { POST_CATEGORIES, PostCategory } from '../types';

const COLORS_AND_GRADIENTS = [
  { id: 'dark-slate', label: 'Dark Slate', style: 'bg-gradient-to-br from-zinc-900 to-black border-white/10' },
  { id: 'amber-gold', label: 'Amber Silk', style: 'bg-gradient-to-br from-amber-950/40 via-black to-zinc-950 border-amber-500/20' },
  { id: 'royal-purple', label: 'Amethyst Surge', style: 'bg-gradient-to-br from-purple-950/40 via-black to-zinc-950 border-purple-500/20' },
  { id: 'royal-blue', label: 'Sapphire Wave', style: 'bg-gradient-to-br from-blue-950/40 via-black to-zinc-950 border-blue-500/20' },
  { id: 'forest-emerald', label: 'Emerald Vault', style: 'bg-gradient-to-br from-emerald-950/40 via-black to-zinc-950 border-emerald-500/20' },
];

const CUSTOM_FONTS = [
  { id: 'sans', label: 'Swiss Modern', className: 'font-sans' },
  { id: 'serif', label: 'Editorial Serif', className: 'font-serif italic' },
  { id: 'mono', label: 'Mono Code', className: 'font-mono' },
];

interface TextPostScreenProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function TextPostScreen({ onClose, onSuccess }: TextPostScreenProps) {
  const { profile } = useAuth();
  const [typedContent, setTypedContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('dark-slate');
  const [selectedFont, setSelectedFont] = useState('sans');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const charLimit = 300;

  const handleSubmitTextPost = async () => {
    if (!profile || !typedContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    // Choose custom background color styling metadata if any
    const curBg = COLORS_AND_GRADIENTS.find(b => b.id === selectedBackground);
    const curFont = CUSTOM_FONTS.find(f => f.id === selectedFont);

    try {
      // Adding text post directly to main feed
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: typedContent.trim(),
        category: selectedCategory,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        // Custom branding metadata to display text nicely on home screen
        textStyle: {
          bgId: selectedBackground,
          fontId: selectedFont,
        }
      });
      onSuccess('Minimalist text thought broadcasted to feed successfully!');
      onClose();
    } catch (err) {
      console.error("Failed to share text post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBgStyle = COLORS_AND_GRADIENTS.find(b => b.id === selectedBackground)?.style || 'bg-black';
  const activeFontFamilyClass = CUSTOM_FONTS.find(f => f.id === selectedFont)?.className || 'font-sans';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row h-screen overflow-hidden text-white font-sans">
      
      {/* LEFT STATIC CANVAS RENDERER */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
        
        {/* Core display card preview */}
        <div 
          className={`relative w-full max-w-[440px] aspect-[4/5] rounded-[32px] p-8 border flex flex-col justify-between transition-all duration-300 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.8)] ${activeBgStyle}`}
        >
          {/* Subtle logo brand watermark header */}
          <div className="flex justify-between items-center opacity-30">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Collective Inscriptions</span>
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          {/* Typing field simulator body text */}
          <div className="my-auto">
            <textarea
              value={typedContent}
              onChange={(e) => setTypedContent(e.target.value.slice(0, charLimit))}
              placeholder="What elegant thought is resonant inside your space right now…"
              className={`w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl text-white placeholder-white/10 resize-none min-h-[160px] max-h-[220px] focus:outline-none focus:border-transparent uppercase-none tracking-wide text-center leading-relaxed selection:bg-purple-500/20 ${activeFontFamilyClass}`}
            />
          </div>

          {/* Card visuality footer */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-2">
              <img src={profile?.photoURL} alt="" className="w-7 h-7 object-cover rounded-lg ring-1 ring-white/10" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white">{profile?.displayName}</p>
                <p className="text-[7px] uppercase tracking-widest text-white/40">Member of core collective</p>
              </div>
            </div>

            <span className="text-[9px] font-mono tracking-widest uppercase text-white/30">
              {typedContent.length} / {charLimit}
            </span>
          </div>

        </div>

        {/* TOP CANCEL BUTTON */}
        <div className="absolute top-6 left-6 flex items-center z-10">
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* RIGHT DESIGN PALETTE & CONTROLS */}
      <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-white/5 bg-black/95 p-6 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-6">
          
          <div>
            <p className="text-purple-400 text-[9px] uppercase tracking-[0.4em] font-black">THOUGHT SCROLL</p>
            <h2 className="text-xl font-display font-black tracking-wider text-white uppercase mt-1">INSCRIPTION LAB</h2>
          </div>

          {/* BG PALETTE PICKER */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Ambient Backplate
            </h4>
            <div className="flex flex-col gap-2">
              {COLORS_AND_GRADIENTS.map((b) => {
                const isCur = selectedBackground === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBackground(b.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${isCur ? 'bg-white/5 border-purple-500 scale-98' : 'bg-transparent border-white/5 hover:border-white/15'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border border-white/10 ${b.style.split(' ')[0]} ${b.style.includes('via-') ? b.style.split(' ')[1] : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CUSTOM TYPOGRAPHY FONT PICKER */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Lithograph Typography
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {CUSTOM_FONTS.map((font) => {
                const isCur = selectedFont === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font.id)}
                    className={`p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest text-center transition-all ${isCur ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'}`}
                  >
                    {font.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHOOSE RESONANCE CHANNEL CATEGORY */}
          <div className="space-y-3.5 pt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Resonance channel category
            </h4>
            
            <div className="flex flex-wrap gap-2">
              {POST_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/[0.03] border-white/5 text-white/50 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM SUBMIT ROW */}
        <div className="pt-6 border-t border-white/5 space-y-3">
          <button
            onClick={handleSubmitTextPost}
            disabled={!typedContent.trim() || isSubmitting}
            className="w-full btn-gold py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Send className="w-4 h-4 text-black" />
            )}
            Broadcast thought
          </button>

          <p className="text-[8px] text-white/30 text-center uppercase tracking-widest">
            Publishes directly to the central community waveband
          </p>
        </div>

      </div>

    </div>
  );
}
