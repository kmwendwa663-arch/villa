import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SocketProvider } from './lib/SocketContext';
import { Navbar } from './components/Navbar';
import { Feed } from './pages/Feed';
import { HomeScreen } from './pages/HomeScreen';
import { PostDetailScreen } from './pages/PostDetailScreen';
import { CreatePostPage } from './pages/CreatePostPage';
import { ChatInbox } from './pages/ChatInbox';
import { ChatRoom } from './pages/ChatRoom';
import { NewMessageScreen } from './pages/NewMessageScreen';
import { Profile } from './pages/Profile';
import { EditProfileScreen } from './pages/EditProfileScreen';
import { FollowersListScreen } from './pages/FollowersListScreen';
import { UserSearch } from './pages/UserSearch';
import { Settings } from './pages/Settings';
import { TagFeedScreen } from './pages/TagFeedScreen';
import { PlaceFeedScreen } from './pages/PlaceFeedScreen';
import { NotificationsScreen } from './pages/NotificationsScreen';
import { FollowRequestsScreen } from './pages/FollowRequestsScreen';
import { Loader2, MessageSquare, X, Sparkles, Check } from 'lucide-react';
import { db, query, collection, where, onSnapshot, doc, getDoc } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

import { Villa3D } from './components/Villa3D';
import { WallpaperEngine } from './components/WallpaperEngine';
import { ClockWidget } from './components/ClockWidget';
import { AIAssistant } from './components/AIAssistant';
import { WallpaperProvider } from './lib/WallpaperContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

function LoginPage() {
  const { signIn, user, loading, authActionLoading } = useAuth();
  
  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-y-auto bg-black font-sans py-20 px-4">
      <WallpaperEngine />
      
      {/* Dynamic Background Noise/Glow */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-gold-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150 mix-blend-overlay" />
      </div>

      <div className="relative z-20 w-full max-w-lg px-8 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full flex justify-center mb-0"
        >
          <Villa3D />
        </motion.div>
        
        <div className="text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <h2 className="text-gold-500/40 text-[10px] uppercase tracking-[0.8em] font-black mb-12 gold-glow">
              Elevated Social
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <button 
              onClick={signIn}
              disabled={authActionLoading}
              className="btn-gold w-full group relative overflow-hidden"
            >
              <div className="flex items-center justify-center gap-4 py-1">
                {authActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 invert contrast-200 group-hover:scale-125 transition-transform duration-500" alt="Google" />
                )}
                <span className="font-black text-sm tracking-[0.25em]">
                  {authActionLoading ? 'Unlocking...' : 'Join the Collective'}
                </span>
              </div>
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5, duration: 2 }}
            className="mt-20"
          >
            <p className="text-[9px] uppercase tracking-[0.6em] font-medium text-white/50">
              Discretion • Connection • Culture
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeToast, setActiveToast] = useState<{
    id: string;
    senderName: string;
    senderPhoto: string;
    content: string;
    senderId: string;
  } | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Check for successful creations
  useEffect(() => {
    const cachedToast = localStorage.getItem('success_toast');
    if (cachedToast) {
      setSuccessToast(cachedToast);
      localStorage.removeItem('success_toast');

      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    );

    let isInitial = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial) {
        // Skip existing database history on page loads
        isInitial = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          // Verify it is sent to the logged-in user and not by them
          if (msg.senderId !== user.uid && msg.receiverId === user.uid) {
            const chatPath = `/chat/${msg.senderId}`;
            const isInActiveChat = window.location.pathname === chatPath;
            if (!isInActiveChat) {
              // Retrieve accurate sender name and photo dynamically
              getDoc(doc(db, 'users', msg.senderId)).then((uDoc) => {
                const sData = uDoc.exists() ? uDoc.data() : null;
                const senderName = sData?.displayName || 'Meso Member';
                const senderPhoto = sData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`;

                setActiveToast({
                  id: change.doc.id,
                  senderName,
                  senderPhoto,
                  content: msg.content,
                  senderId: msg.senderId
                });

                // Play the timeless luxurious digital notification pluck sound
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const now = audioCtx.currentTime;

                  // High-Society Arpeggio Chime: Soft Pluck (E5 -> B5)
                  const osc1 = audioCtx.createOscillator();
                  const gain1 = audioCtx.createGain();
                  osc1.connect(gain1);
                  gain1.connect(audioCtx.destination);
                  osc1.type = 'sine';
                  osc1.frequency.setValueAtTime(659.25, now);
                  gain1.gain.setValueAtTime(0, now);
                  gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
                  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                  osc1.start(now);
                  osc1.stop(now + 0.4);

                  const osc2 = audioCtx.createOscillator();
                  const gain2 = audioCtx.createGain();
                  osc2.connect(gain2);
                  gain2.connect(audioCtx.destination);
                  osc2.type = 'sine';
                  osc2.frequency.setValueAtTime(987.77, now + 0.08);
                  gain2.gain.setValueAtTime(0, now + 0.08);
                  gain2.gain.linearRampToValueAtTime(0.08, now + 0.12);
                  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
                  osc2.start(now + 0.08);
                  osc2.stop(now + 0.6);
                } catch (audioErr) {
                  console.warn("Chime playback was blocked or unsupported:", audioErr);
                }
              }).catch((e) => {
                console.error("Error setting up sender details for message toast:", e);
              });
            }
          }
        }
      });
    }, (error) => {
      console.error("Real-time notifications socket filter error:", error);
    });

    return unsubscribe;
  }, [user]);

  // Handle automatic timeout dismiss
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <WallpaperEngine />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login-screen"
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto no-scrollbar"
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col h-screen relative z-10"
          >
            {location.pathname === '/' && <ClockWidget />}
            <Navbar />
            <main className="mx-auto relative z-0 flex-1 w-full pb-32 sm:pb-32 flex flex-col min-h-0 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <Routes location={location}>
                    <Route path="/" element={<HomeScreen />} />
                    <Route path="/post/:postId" element={<PostDetailScreen />} />
                    <Route 
                      path="/create" 
                      element={
                        <ProtectedRoute>
                          <CreatePostPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/search" element={<UserSearch />} />
                    <Route path="/tag/:tagId" element={<TagFeedScreen />} />
                    <Route path="/place/:placeId" element={<PlaceFeedScreen />} />
                    <Route path="/profile/:userId" element={<Profile />} />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile/:userId/connections/:type" 
                      element={
                        <ProtectedRoute>
                          <FollowersListScreen />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/edit-profile" 
                      element={
                        <ProtectedRoute>
                          <EditProfileScreen />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/settings" element={<Settings />} />
                    <Route 
                      path="/notifications" 
                      element={
                        <ProtectedRoute>
                          <NotificationsScreen />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/follow-requests" 
                      element={
                        <ProtectedRoute>
                          <FollowRequestsScreen />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/chat" 
                      element={
                        <ProtectedRoute>
                          <ChatInbox />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/chat/:userId" 
                      element={
                        <ProtectedRoute>
                          <ChatRoom />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/new-message" 
                      element={
                        <ProtectedRoute>
                          <NewMessageScreen />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </main>
            <AIAssistant />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Real-Time Premium Message Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div 
              onClick={() => {
                navigate(`/chat/${activeToast.senderId}`);
                setActiveToast(null);
              }}
              className="glass p-4 rounded-2xl border border-gold-500/20 shadow-[0_12px_40px_-12px_rgba(212,175,55,0.25)] flex items-center justify-between gap-3 cursor-pointer select-none hover:border-gold-500/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={activeToast.senderPhoto} 
                  alt={activeToast.senderName} 
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-gold-500/30 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-gold-400 leading-none">New transmission received</span>
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide mt-1.5 truncate">
                    {activeToast.senderName}
                  </h4>
                  <p className="text-[11px] text-white/60 truncate mt-0.5 max-w-[220px]">
                    {activeToast.content}
                  </p>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveToast(null);
                }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Success Confirmation Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none"
          >
            <div className="glass p-4 rounded-2xl border border-gold-500/30 shadow-[0_12px_42px_rgba(212,175,55,0.2)] flex items-center justify-between gap-3 pointer-events-auto select-none bg-black/95">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-gold-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gold-400 block leading-none">Transmission Completed</span>
                  <p className="text-[11px] text-white/90 mt-1.5 font-medium leading-normal">{successToast}</p>
                </div>
              </div>
              <button 
                onClick={() => setSuccessToast(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <WallpaperProvider>
          <Router>
            <AppContent />
          </Router>
        </WallpaperProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
