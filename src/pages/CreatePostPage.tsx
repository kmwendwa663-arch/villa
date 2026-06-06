import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatePickerBottomSheet } from '../components/CreatePickerBottomSheet';
import { CreatePostComposer } from '../components/CreatePostComposer';
import { StoryCreatorScreen } from '../components/StoryCreatorScreen';
import { ReelCreatorScreen } from '../components/ReelCreatorScreen';
import { TextPostScreen } from '../components/TextPostScreen';
import { 
  X, 
  Activity, 
  Users, 
  Heart, 
  MessageSquare, 
  Loader2, 
  Volume2, 
  Camera,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';

type CreateMode = 'picker' | 'post' | 'story' | 'reel' | 'text' | 'live';

export function CreatePostPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<CreateMode>('picker');

  // Live Screen simulation states
  const [liveCountdown, setLiveCountdown] = useState<number | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveViewerCount, setLiveViewerCount] = useState(1);
  const [liveComments, setLiveComments] = useState<{ id: string; user: string; text: string }[]>([]);
  const [hoverHearts, setHoverHearts] = useState<number[]>([]);

  // Simulated live metadata
  const liveMockCommentsPool = [
    { user: 'SaintTropezExplorer', text: 'Stellar transmission! Outstanding!' },
    { user: 'VillaGilded', text: 'Is this the private penthouse view?' },
    { user: 'Coterie_Art', text: 'Beautiful ambiance tonight.' },
    { user: 'Metropolis_Line', text: 'Insane quality bounds here' },
    { user: 'Monaco_Keys', text: 'Sound is incredible' },
  ];

  // Initialize live timer if activated
  useEffect(() => {
    let interval: any;
    if (isLiveActive) {
      interval = setInterval(() => {
        setLiveDuration((prev) => prev + 1);
        
        // Randomly adjust viewers
        setLiveViewerCount((v) => Math.max(12, v + Math.floor(Math.random() * 5) - 2));

        // Randomly add floating hearts inside
        if (Math.random() > 0.4) {
          setHoverHearts((prev) => [...prev, Date.now()]);
        }

        // Randomly inject mockup comments
        if (Math.random() > 0.6) {
          const randomComment = liveMockCommentsPool[Math.floor(Math.random() * liveMockCommentsPool.length)];
          setLiveComments((prev) => [...prev, { id: Date.now().toString(), ...randomComment }].slice(-6));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveActive]);

  // Handle successful publishing across creations
  const handlePublishSuccess = (message: string) => {
    // Elegant digital pluck audio cue to signal success
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5 chord tone
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Chime blocked:", e);
    }

    // Save success toast state inside localStorage so App.tsx can render it as a toast
    localStorage.setItem('success_toast', message);
    navigate('/');
  };

  const startLiveCountdownFlow = () => {
    setActiveMode('live');
    setLiveCountdown(3);
  };

  // Process live countdown
  useEffect(() => {
    if (liveCountdown === null) return;
    if (liveCountdown > 0) {
      const timer = setTimeout(() => {
        setLiveCountdown(liveCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setLiveCountdown(null);
      setIsLiveActive(true);
      setLiveViewerCount(105);
      // Seed first comments
      setLiveComments([
        { id: '1', user: 'VillaConcierge', text: 'Live broadcast link secure. Connection established 🥂' }
      ]);
    }
  }, [liveCountdown]);

  const endLiveBroadcastSubmit = () => {
    setIsLiveActive(false);
    setLiveDuration(0);
    setLiveComments([]);
    handlePublishSuccess('Live wave transmission ended. Session summary recorded & updated!');
  };

  return (
    <div className="flex-1 w-full bg-black min-h-screen relative flex flex-col items-center justify-center font-sans">
      
      {/* Dynamic ambient dark glowing aura backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gold-500/2.5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
        
        {/* Step 1: CREATE PICKER BOTTOM SHEET */}
        {activeMode === 'picker' && (
          <CreatePickerBottomSheet
            onSelectType={(type) => {
              if (type === 'live') {
                startLiveCountdownFlow();
              } else {
                setActiveMode(type);
              }
            }}
            onClose={() => navigate(-1)}
          />
        )}

        {/* Step 2: POST COMPOSER SCREEN */}
        {activeMode === 'post' && (
          <CreatePostComposer
            onClose={() => setActiveMode('picker')}
            onSuccess={handlePublishSuccess}
          />
        )}

        {/* Step 3: STORY COMPOSER SCREEN */}
        {activeMode === 'story' && (
          <StoryCreatorScreen
            onClose={() => setActiveMode('picker')}
            onSuccess={handlePublishSuccess}
          />
        )}

        {/* Step 4: REEL COMPOSER SCREEN */}
        {activeMode === 'reel' && (
          <ReelCreatorScreen
            onClose={() => setActiveMode('picker')}
            onSuccess={handlePublishSuccess}
          />
        )}

        {/* Step 5: TEXT POST COMPOSER */}
        {activeMode === 'text' && (
          <TextPostScreen
            onClose={() => setActiveMode('picker')}
            onSuccess={handlePublishSuccess}
          />
        )}

        {/* STEP 6: GO LIVE TRANSMISSION PORTAL SIMULATOR */}
        {activeMode === 'live' && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none font-sans overflow-hidden">
            
            {/* Live Countdowns Screen */}
            <AnimatePresence>
              {liveCountdown !== null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-center p-6"
                >
                  <motion.p className="text-red-500 text-[10px] uppercase tracking-[0.6em] font-black mb-8 gold-glow animate-pulse">Establishing Satellite Ingress</motion.p>
                  <motion.h1 
                    key={liveCountdown}
                    initial={{ opacity: 0, scale: 0.5, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="text-8xl md:text-9xl font-semibold font-display text-white"
                  >
                    {liveCountdown === 0 ? 'START' : liveCountdown}
                  </motion.h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Live Broadcast HUD Layout */}
            {isLiveActive && (
              <div className="relative w-full max-w-sm aspect-[9/16] bg-zinc-900 border border-white/10 rounded-[36px] overflow-hidden flex flex-col justify-between shadow-[0_24px_65px_rgba(0,0,0,0.85)]">
                
                {/* Background video simulation using dynamic modern abstract Unsplash loop preset */}
                <div className="absolute inset-0 z-0">
                  <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80" className="w-full h-full object-cover saturate-125 select-none pointer-events-none" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60" />
                </div>

                {/* Live HUD Header Info */}
                <div className="relative z-10 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-red-600 animate-pulse text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.4)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>

                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-mono tracking-widest text-white/80">
                      {Math.floor(liveDuration / 60)}:{(liveDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-wider text-white gap-1 inline-flex items-center">
                      <Users className="w-3 h-3 text-purple-400" />
                      {liveViewerCount}
                    </span>
                    
                    <button 
                      onClick={endLiveBroadcastSubmit}
                      className="p-2 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Floating hearts and interactive comments scroll view */}
                <div className="relative z-10 p-5 flex flex-col justify-end flex-1 mb-4 space-y-4">
                  
                  {/* Dynamic simulated feedback streams */}
                  <div className="space-y-2.5 max-h-[220px] overflow-hidden flex flex-col justify-end pb-2 border-b border-white/5">
                    {liveComments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, x: -10, y: 5 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        className="flex items-start gap-2 p-2 rounded-2xl bg-black/45 backdrop-blur-sm border border-white/5 max-w-[90%]"
                      >
                        <div className="text-left">
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">@{comment.user}</span>
                          <span className="text-[11px] text-white/85 mt-0.5 block">{comment.text}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Comments entry field and heart blast */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Comment something live…"
                      className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500 uppercase tracking-widest"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const customText = (e.target as HTMLInputElement).value.trim();
                          if (customText) {
                            setLiveComments([...liveComments, {
                              id: Date.now().toString(),
                              user: profile?.displayName || 'VillaExplorer',
                              text: customText
                            }]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />

                    <button 
                      onClick={() => setHoverHearts((prev) => [...prev, Date.now()])}
                      className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center border border-white/10 cursor-pointer shadow-lg active:scale-90 transition-transform text-white shrink-0"
                    >
                      <Heart className="w-5 h-5 fill-current text-white animate-pulse" />
                    </button>
                  </div>

                </div>

                {/* FLOATING HEARTS ANIMATED ELEMENT CONTAINER */}
                <div className="absolute right-6 bottom-20 w-16 h-48 pointer-events-none z-20">
                  <AnimatePresence>
                    {hoverHearts.map((heartId) => (
                      <motion.div
                        key={heartId}
                        initial={{ opacity: 0, scale: 0.5, y: 0, x: 0 }}
                        animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.2, 0.8], y: -160, x: Math.sin(heartId) * 15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                        className="absolute bottom-0 right-4 text-rose-500"
                        onAnimationComplete={() => {
                          setHoverHearts((prev) => prev.filter((id) => id !== heartId));
                        }}
                      >
                        <Heart className="w-4.5 h-4.5 fill-current text-rose-500" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
