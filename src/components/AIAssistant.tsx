import React, { useState } from 'react';
import { Sparkles, X, Send, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWallpaper } from '../lib/WallpaperContext';
import { cn } from '../lib/utils';
import { Wallpaper } from '../types';

interface Suggestion {
  name: string;
  image_url: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { setWallpaper } = useWallpaper();

  const handleSuggest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!mood.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyWallpaper = (s: Suggestion) => {
    const newWallpaper: Wallpaper = {
      id: `ai-${Date.now()}`,
      name: s.name,
      url: s.image_url,
      category: 'AI Suggestion' as any
    };
    setWallpaper(newWallpaper);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-[30px] right-[30px] z-[100]">
        <div className="relative group">
          {/* Pulsing Glow */}
          <div className="absolute inset-0 bg-gold-500 rounded-full animate-ping opacity-20 pointer-events-none" />
          <div className="absolute inset-x-[-10px] inset-y-[-10px] bg-gold-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-16 h-16 bg-gradient-to-br from-gold-600 to-gold-400 rounded-full shadow-[0_0_30px_rgba(197,160,89,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-black z-10 border-none"
          >
             <Sparkles className={cn("w-7 h-7 transition-all duration-500", isOpen ? "rotate-90 scale-75 opacity-50" : "scale-100 opacity-100")} />
             {isOpen && (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="absolute inset-0 flex items-center justify-center"
               >
                 <X className="w-7 h-7" />
               </motion.div>
             )}
          </button>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-4 px-3 py-1.5 glass-dark rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-xs font-bold uppercase tracking-widest text-white/70 border border-white/10">
            AI Suggest
          </div>
        </div>
      </div>

      {/* Suggestion Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-[110px] right-[30px] w-[380px] z-[100] max-h-[calc(100vh-150px)] flex flex-col"
          >
            <div className="glass-dark rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-full bg-black/60 backdrop-blur-3xl">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h3 className="font-bold text-white tracking-tight">AI Wallpaper Suggestion</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <form onSubmit={handleSuggest} className="space-y-4">
                  <div className="relative">
                    <input
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="Enter mood (e.g. calm, dark, energetic)"
                      className="glass-input w-full pr-12 text-sm"
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || !mood.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gold-500 disabled:opacity-30 transition-all hover:scale-110"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading || !mood.trim()}
                    className="w-full btn-gold py-4 rounded-2xl flex items-center justify-center gap-2 group"
                  >
                    <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span className="uppercase tracking-widest text-xs font-black">Suggest for me</span>
                  </button>
                </form>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Suggestions</h4>
                  
                  {suggestions.length === 0 && !isLoading && (
                    <div className="py-12 text-center text-white/10 italic text-sm">
                      Describe your mood to start...
                    </div>
                  )}

                  {isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest animate-pulse">Consulting the AI...</p>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => applyWallpaper(s)}
                        className="group relative h-24 rounded-2xl overflow-hidden backdrop-blur-md border border-white/5 hover:border-gold-500/30 transition-all text-left bg-white/5"
                      >
                        <img src={s.image_url} alt={s.name} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent p-4 flex flex-col justify-center">
                          <p className="text-white font-bold text-sm tracking-tight">{s.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-tighter mt-1">Select Vision</p>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <Sparkles className="w-5 h-5 text-gold-500" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
