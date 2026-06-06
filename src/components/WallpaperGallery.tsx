import React, { useState } from 'react';
import { useWallpaper, WALLPAPERS } from '../lib/WallpaperContext';
import { Heart, Play, Pause, ChevronRight, Hash, Palette, History, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { WallpaperInterval } from '../types';
import { motion } from 'motion/react';

export function WallpaperGallery() {
  const { state, setWallpaper, setSolidColor, toggleSlideshow, setInterval, toggleFavorite } = useWallpaper();
  const [activeCategory, setActiveCategory] = useState('Nature');
  const categories = ['Nature', 'Space', 'City', 'Abstract', 'Dark', 'Minimal', 'Favorites'];

  const filteredWallpapers = activeCategory === 'Favorites' 
    ? WALLPAPERS.filter(w => state.favorites.includes(w.id))
    : WALLPAPERS.filter(w => w.category === activeCategory);

  const recentWallpapers = state.recent;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6">
      <header className="py-12 sm:py-20 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 tracking-tight">Environmental Control</h1>
          <p className="text-white/20 uppercase tracking-[0.4em] text-[10px] font-bold">Curate Your Digital Sanctuary</p>
        </div>
        
        <div className="flex items-center gap-4 glass p-2 rounded-[28px] border-white/5 shadow-2xl backdrop-blur-3xl">
          <button 
            onClick={() => toggleSlideshow(!state.isSlideshowActive)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-[22px] text-[10px] font-black transition-all uppercase tracking-[0.2em]",
              state.isSlideshowActive ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
          >
            {state.isSlideshowActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>Slideshow</span>
          </button>
          
          <div className="flex items-center gap-1 pr-3">
            {[5, 10, 30].map(val => (
              <button
                key={val}
                onClick={() => setInterval(val as WallpaperInterval)}
                className={cn(
                  "w-10 h-10 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-center",
                  state.slideshowInterval === val && state.isSlideshowActive ? "text-gold-500 bg-gold-500/10" : "text-white/10 hover:text-white/30"
                )}
              >
                {val}s
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main categories */}
      <nav className="flex items-center gap-3 overflow-x-auto pb-12 no-scrollbar px-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-8 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap border",
              activeCategory === cat 
                ? "bg-gold-500 text-black border-gold-500 shadow-xl shadow-gold-500/10" 
                : "bg-white/2 text-white/30 border-white/5 hover:border-white/10 hover:text-white/80"
            )}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-20">
        {filteredWallpapers.length === 0 ? (
          <div className="col-span-full py-32 text-center glass-card border-dashed border-white/5">
            <p className="text-white/10 font-bold uppercase tracking-[0.4em]">No visions were found in the archive</p>
          </div>
        ) : (
          filteredWallpapers.map((w, idx) => (
            <motion.div 
              key={w.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * Math.min(idx, 6) }}
              className="group relative h-96 rounded-[48px] overflow-hidden shadow-2xl cursor-pointer ring-1 ring-white/5 hover:ring-gold-500/30 transition-all duration-700"
              onClick={() => setWallpaper(w)}
            >
              <img 
                src={w.url} 
                alt={w.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-all duration-700" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12 opacity-0 group-hover:opacity-100 transition-all duration-700">
                <h4 className="text-white font-display font-bold text-3xl mb-8 translate-y-8 group-hover:translate-y-0 transition-transform duration-700">{w.name}</h4>
                <div className="flex items-center gap-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-1000 delay-100">
                  <button className="flex-1 btn-gold py-5 rounded-[24px]">
                    {state.currentWallpaper?.id === w.id ? 'Manifested' : 'Manifest Now'}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(w.id);
                    }}
                    className={cn(
                      "p-5 rounded-[24px] glass border border-white/10 transition-all active:scale-90",
                      state.favorites.includes(w.id) ? "bg-rose-500 text-white border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]" : "text-white hover:bg-white/10"
                    )}
                  >
                    <Heart className={cn("w-6 h-6", state.favorites.includes(w.id) && "fill-current")} />
                  </button>
                </div>
              </div>

              {state.currentWallpaper?.id === w.id && (
                <div className="absolute top-8 left-8 glass border border-gold-500/30 px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] text-gold-500 shadow-2xl">
                  Active Aura
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Solid Color Section */}
      <section className="mb-24">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic mb-10 text-center">Minimal Monoliths</h3>
        <div className="flex flex-wrap justify-center gap-6 glass p-10 rounded-[48px] border border-white/5">
          <button 
            onClick={() => setSolidColor(null)}
            className="w-16 h-16 rounded-[22px] glass border border-white/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white/20 hover:text-rose-500"
          >
            <div className="w-8 h-[2px] bg-current -rotate-45" />
          </button>
          
          {['#000000', '#050505', '#1a1a1a', '#c5a059', '#164e63', '#312e81'].map(color => (
            <button
              key={color}
              onClick={() => setSolidColor(color)}
              className={cn(
                "w-16 h-16 rounded-[22px] hover:scale-110 active:scale-95 transition-all shadow-2xl relative",
                state.solidColor === color && "ring-2 ring-gold-500 ring-offset-8 ring-offset-black"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          
          <div className="relative group">
            <input 
              type="color" 
              onChange={(e) => setSolidColor(e.target.value)}
              className="w-16 h-16 rounded-[22px] cursor-pointer bg-white/5 border border-white/5 appearance-none overflow-hidden hover:scale-110 transition-all"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 group-hover:opacity-100">
               <Palette className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Recently Used */}
      {recentWallpapers.length > 0 && (
        <section className="pb-32">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic mb-10">Ghost of Presences past</h3>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
            {recentWallpapers.map(w => (
              <button 
                key={w.id}
                onClick={() => setWallpaper(w)}
                className="flex-shrink-0 w-56 h-32 glass rounded-[28px] overflow-hidden relative group border border-white/5"
              >
                <img src={w.url} alt={w.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/20 transition-all" />
                {state.currentWallpaper?.id === w.id && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-gold-500 rounded-full shadow-[0_0_15px_rgba(197,160,89,1)]" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{w.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
