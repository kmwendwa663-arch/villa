import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Phone, 
  Video, 
  MoreVertical, 
  Camera, 
  Mic, 
  Send, 
  CheckCheck,
  MapPin,
  Smile,
  Loader2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSocket } from '../lib/SocketContext';
import { cn, formatShortName, isUserOnline, formatLastSeen } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc } from '../lib/firebase';
import { UserProfile, Message } from '../types';
import { format, isToday, isYesterday } from 'date-fns';

export function ChatRoom() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const socket = useSocket();
  
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch recipient profile details dynamically from the DB in real-time
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setRecipient(docSnap.data() as UserProfile);
      } else {
        // Fallback user state
        setRecipient({
          uid: userId,
          displayName: 'Explorer',
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          email: '',
          createdAt: null
        });
      }
    }, (err) => {
      console.error("Could not load dynamic user profile in real-time:", err);
      setRecipient({
        uid: userId,
        displayName: 'Meso Explorer',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        email: '',
        createdAt: null
      });
    });

    return unsubscribe;
  }, [userId]);

  // Compute standard Chat ID
  const chatId = profile && userId 
    ? [profile.uid, userId].sort().join('_')
    : '';

  // 2. Query/Listen real-time messages for this conversational thread
  useEffect(() => {
    if (!profile || !userId || !chatId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || 
                            (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null) || 
                            (typeof data.createdAt === 'string' || typeof data.createdAt === 'number' ? new Date(data.createdAt) : null);
          return { id: doc.id, ...data, createdAt } as Message;
        })
        .filter(m => {
          return m.participants.includes(userId);
        });

      // Sort messages chronologically
      const sorted = filtered.sort((a, b) => {
        const timeA = a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.getTime?.() || 0;
        return timeA - timeB;
      });

      // Mark received messages as seen
      filtered.forEach((m) => {
        if (m.receiverId === profile.uid && m.seen === false && m.id) {
          try {
            updateDoc(doc(db, 'messages', m.id), { seen: true });
          } catch (e) {
            console.error("Error setting message seen:", e);
          }
        }
      });

      setMessages(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Real-time conversational loading error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile, userId, chatId]);

  // Real-time peer typing socket state (optional enhancement)
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleTyping = (data: { chatId: string; isTyping: boolean }) => {
      if (data.chatId === chatId) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on('typing-status', handleTyping);
    return () => {
      socket.off('typing-status', handleTyping);
    };
  }, [socket, chatId]);

  // Scroll to bottom on load/new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!profile || !userId || !trimmed) return;

    const msgData = {
      senderId: profile.uid,
      receiverId: userId,
      participants: [profile.uid, userId],
      content: trimmed,
      chatId,
      createdAt: serverTimestamp(),
      seen: false
    };

    setInputText('');

    try {
      await addDoc(collection(db, 'messages'), msgData);
      socket?.emit('send-message', {
        ...msgData,
        createdAt: new Date().toISOString()
      });
      // Trigger typing status update to original state
      socket?.emit('typing-status', { chatId, isTyping: false });
    } catch (error) {
      console.error('Failed to dispatch message to Firestore:', error);
    }
  };

  const handleInputWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Broadcast soft typing heartbeat
    if (socket && chatId) {
      socket.emit('typing-status', { chatId, isTyping: e.target.value.length > 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-white/40 uppercase tracking-widest text-[10px]">Loading Frequency Link...</p>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-white/40 uppercase tracking-widest text-[10px]">No recipient profile linked</p>
        <button 
          onClick={() => navigate('/chat')}
          className="px-6 py-2.5 bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl text-white/70 hover:bg-white/10"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-80px)] overflow-hidden pb-10">
      
      {/* Top Navigation Bar Header */}
      <div className="flex items-center justify-between py-4 border-b border-white/5 bg-[#070707]/90 z-20 top-0 backdrop-blur-3xl px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="Back to inbox"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* Real user avatar from Firestore profile */}
            <img 
              src={recipient.photoURL} 
              alt={formatShortName(recipient.displayName)} 
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
            />

            <div>
              <h1 className="text-xs font-display font-black text-white uppercase tracking-wider">
                {formatShortName(recipient.displayName)}
              </h1>
              {isUserOnline(recipient) ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black tracking-widest text-emerald-400 uppercase">Active Now</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                  <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">
                    Offline • {recipient.lastSeen ? formatLastSeen(recipient.lastSeen) : 'recently'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white cursor-pointer active:scale-95 transition-all">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white cursor-pointer active:scale-95 transition-all">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white cursor-pointer active:scale-95 transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List area with customized scroll bubbles */}
      <div className="flex-1 overflow-y-auto py-6 px-1 space-y-6 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 my-auto py-20">
            <Smile className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">No transmissions yet</p>
            <p className="text-[8px] uppercase tracking-widest text-white/25 mt-1">Be the first to say hello</p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMine = m.senderId === profile?.uid;
            
            // Format nice grouped timestamps
            let groupTimestamp = 'Recently';
            if (m.createdAt) {
              const dateObj = m.createdAt;
              if (isToday(dateObj)) {
                groupTimestamp = format(dateObj, 'h:mm a');
              } else if (isYesterday(dateObj)) {
                groupTimestamp = 'Yesterday';
              } else {
                groupTimestamp = format(dateObj, 'MMM d, h:mm a');
              }
            }

            const showTimestamp = index === 0 || (() => {
              const prev = messages[index - 1];
              if (!prev.createdAt || !m.createdAt) return true;
              // Difference of more than 5 minutes shows new timestamp group
              return Math.abs(m.createdAt.getTime() - prev.createdAt.getTime()) > 5 * 60 * 1000;
            })();

            const isLastMessage = index === messages.length - 1;

            return (
              <div key={m.id} className="space-y-2">
                
                {/* Centered Group Timestamp Label */}
                {showTimestamp && (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-full">
                      {groupTimestamp}
                    </span>
                  </div>
                )}

                {/* Message alignment row */}
                <div className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
                  <div 
                    className={cn(
                      "max-w-[75%] px-5 py-3.5 text-xs font-semibold leading-relaxed shadow-sm break-words",
                      isMine 
                        ? "bg-purple-600 text-white rounded-[20px] rounded-br-none shadow-[0_12px_24px_-8px_rgba(139,92,246,0.25)]" 
                        : "bg-[#121212] border border-white/5 text-white/90 rounded-[20px] rounded-tl-none"
                    )}
                  >
                    {(m as any).postId ? (
                      <div 
                        onClick={() => navigate(`/post/${(m as any).postId}`)}
                        className="w-48 sm:w-56 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-lg cursor-pointer group hover:border-gold-500/30 transition-all text-left mb-2.5 active:scale-[0.98] select-none"
                      >
                        {(m as any).postImage && (
                          <div className="w-full h-32 overflow-hidden bg-black/40 border-b border-white/5">
                            <img 
                              src={(m as any).postImage} 
                              alt="Post attach" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                          </div>
                        )}
                        <div className="p-3 space-y-1.5">
                          <p className="text-[10px] text-white/70 line-clamp-2 uppercase font-mono italic">
                            {(m as any).postContent ? `"${(m as any).postContent}"` : 'Attached inspiration'}
                          </p>
                          <div className="flex items-center gap-1 pt-1.5 border-t border-white/5">
                            <span className="text-[8px] font-black uppercase text-gold-500 tracking-wider">
                              View original wave
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>

                {/* Read receipt checkmark label on user's last message */}
                {isMine && isLastMessage && (
                  <div className="flex justify-end pr-1 text-[8px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
                    <CheckCheck className="w-3 h-3 text-purple-400" />
                    <span>Transmitted</span>
                  </div>
                )}

              </div>
            );
          })
        )}

        {/* Streaming Typographic visual cursor animation */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#121212] border border-white/5 py-3 px-5 rounded-[20px] rounded-tl-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-purple-400/80 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-purple-400/80 rounded-full animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 bg-purple-400/80 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips panel - displays below last received message */}
      {messages.length > 0 && messages[messages.length - 1].senderId !== profile?.uid && !isTyping && (
        <div className="pb-3 pt-1 flex gap-2 overflow-x-auto no-scrollbar mask-gradient-x px-1 flex-shrink-0">
          <button 
            type="button"
            onClick={() => handleSendMessage("Send location")}
            className="flex items-center gap-1 px-3 py-2 rounded-full border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 active:scale-95 text-[9px] font-black uppercase text-purple-400 tracking-wider transition-all flex-shrink-0 cursor-pointer"
          >
            <MapPin className="w-3 h-3" />
            <span>Send Location</span>
          </button>
          
          <button 
            type="button"
            onClick={() => handleSendMessage("React with approval 👍")}
            className="flex items-center gap-1 px-3 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 active:scale-95 text-[9px] font-black uppercase text-white/50 tracking-wider transition-all flex-shrink-0 cursor-pointer"
          >
            <Smile className="w-3 h-3" />
            <span>React</span>
          </button>

          <button 
            type="button"
            onClick={() => handleSendMessage("Let's align soon.")}
            className="px-3 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 active:scale-95 text-[9px] font-black uppercase text-white/50 tracking-wider transition-all flex-shrink-0 cursor-pointer"
          >
            Let's align soon
          </button>

          <button 
            type="button"
            onClick={() => handleSendMessage("Spectacular.")}
            className="px-3 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 active:scale-95 text-[9px] font-black uppercase text-white/50 tracking-wider transition-all flex-shrink-0 cursor-pointer"
          >
            Spectacular
          </button>
        </div>
      )}

      {/* Footer Reply Action panel bar layout */}
      <div className="pt-2 pb-6 border-t border-white/5 bg-[#070707] flex-shrink-0 px-1">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }} 
          className="flex items-center gap-2"
        >
          {/* Camera trigger */}
          <button 
            type="button"
            className="p-3 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors text-white/40 hover:text-white cursor-pointer flex-shrink-0 active:scale-95"
            title="Attach visual"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Text message entry */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputWordChange}
            placeholder="Message..."
            className="flex-1 bg-white/[0.02] border border-white/5 rounded-full px-5 py-3.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
          />

          {/* Microphone trigger */}
          <button 
            type="button"
            className="p-3 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors text-white/40 hover:text-white cursor-pointer flex-shrink-0 active:scale-95"
            title="Attach voice waveform"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send submission button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-none cursor-pointer",
              inputText.trim() 
                ? "bg-purple-600 hover:bg-purple-500 text-white scale-100 shadow-md shadow-purple-600/35 active:scale-95" 
                : "bg-white/5 text-white/20 opacity-40 scale-95"
            )}
            title="Send stream"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
