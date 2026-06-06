import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  Search, 
  Edit, 
  MessageSquare, 
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { db, collection, getDocs, query, where, onSnapshot } from '../lib/firebase';
import { UserProfile, Message } from '../types';
import { cn, formatShortName, isUserOnline, formatLastSeen } from '../lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

interface RealConversation {
  id: string; // Chat ID
  otherUser: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDate: Date;
  isMyMessage: boolean;
  unreadCount: number;
}

export function ChatInbox() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<RealConversation[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch details of all users registered on the platform in real-time
  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userMap: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => {
        const u = doc.data() as UserProfile;
        if (u.uid !== profile.uid) {
          userMap[u.uid] = u;
        }
      });
      setAllUsers(userMap);
    }, (error) => {
      console.error("Error loading real-time users list:", error);
    });

    return unsubscribe;
  }, [profile]);

  // 2. Query in real-time all messages relating to this signed-in user
  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || 
                          (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null) || 
                          (typeof data.createdAt === 'string' || typeof data.createdAt === 'number' ? new Date(data.createdAt) : null);
        return { id: doc.id, ...data, createdAt } as Message;
      });

      // Group messages by chatId or other User UID
      const groupedByOther: Record<string, Message[]> = {};
      
      messagesList.forEach(m => {
        const otherUserUid = m.participants.find(p => p !== profile.uid);
        if (!otherUserUid) return;

        if (!groupedByOther[otherUserUid]) {
          groupedByOther[otherUserUid] = [];
        }
        groupedByOther[otherUserUid].push(m);
      });

      // Map group keys to stateful Conversational rows
      const computedConversations: RealConversation[] = [];

      Object.entries(groupedByOther).forEach(([otherUid, msgs]) => {
        // Sort ascending to get chronological last message
        const sortedMsgs = msgs.sort((a, b) => {
          const timeA = a.createdAt?.getTime?.() || 0;
          const timeB = b.createdAt?.getTime?.() || 0;
          return timeA - timeB;
        });

        const lastM = sortedMsgs[sortedMsgs.length - 1];
        const otherUserProfile = allUsers[otherUid] || {
          uid: otherUid,
          displayName: 'Explorer',
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUid}`,
          email: '',
          createdAt: null
        };

        // Format conversational display timestamp
        let displayTime = 'Recently';
        let lastDate = new Date();
        if (lastM.createdAt) {
          lastDate = lastM.createdAt;
          if (isToday(lastDate)) {
            displayTime = format(lastDate, 'h:mm a');
          } else if (isYesterday(lastDate)) {
            displayTime = 'Yesterday';
          } else {
            displayTime = format(lastDate, 'MMM d');
          }
        }

        // Calculate direct unread indicator flags (simplified simulation or seen checks)
        // If message is NOT from me and seen matches false, trigger badge
        const unreads = sortedMsgs.filter(m => m.senderId !== profile.uid && (m as any).seen === false).length;

        computedConversations.push({
          id: lastM.chatId || [profile.uid, otherUid].sort().join('_'),
          otherUser: otherUserProfile,
          lastMessage: lastM.content || '',
          lastMessageTime: displayTime,
          lastMessageDate: lastDate,
          isMyMessage: lastM.senderId === profile.uid,
          unreadCount: unreads > 0 ? unreads : 0,
        });
      });

      // Sort conversations by newest first
      const sortedConversations = computedConversations.sort((a, b) => {
        return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
      });

      setConversations(sortedConversations);
      setLoading(false);
    }, (error) => {
      console.error("Real-time Inbox retrieval error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile, allUsers]);

  // Filter conversations by search term
  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    const name = c.otherUser.displayName.toLowerCase();
    const handle = (c.otherUser.username || '').toLowerCase();
    const text = c.lastMessage.toLowerCase();
    return name.includes(q) || handle.includes(q) || text.includes(q);
  });

  // Calculate active suggestions from database members
  const suggestedActiveUsers = (Object.values(allUsers) as UserProfile[]).slice(0, 10);

  const handleRowClick = (otherUserId: string) => {
    navigate(`/chat/${otherUserId}`);
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      
      {/* Top Nav Header */}
      <div className="flex items-center justify-between py-5 border-b border-white/5 bg-[#070707]/90 sticky top-0 z-30 backdrop-blur-3xl px-1 mb-4">
        <h1 className="text-lg font-display font-black text-white uppercase tracking-widest">
          Messages
        </h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {}} 
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white cursor-pointer active:scale-95 transition-all"
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate('/new-message')}
            className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 cursor-pointer active:scale-95 transition-all"
            title="Compose New Message"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rounded Search Bar Below Navbar */}
      <div className="relative flex items-center mb-6">
        <Search className="w-4 h-4 text-white/30 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full bg-white/[0.02] border border-white/5 rounded-full pl-11 pr-5 py-3.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
        />
      </div>

      {/* "Active now" Horizontal Scrollable Section (lists real database user profiles) */}
      <div className="mb-8">
        <h2 className="text-[10px] font-black uppercase text-white/40 tracking-wider mb-4 px-1">
          Active Now
        </h2>
        
        {suggestedActiveUsers.length === 0 ? (
          <div className="px-1 py-1 text-[9px] uppercase tracking-widest text-white/20">
            No active frequencies listed
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
            {suggestedActiveUsers.map((user) => {
              const online = isUserOnline(user);
              return (
                <div 
                  key={user.uid} 
                  onClick={() => handleRowClick(user.uid)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform flex-shrink-0 group"
                >
                  {/* Real User Avatar wrapper with glowing active indicator */}
                  <div className="relative">
                    {online && (
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500/40 to-teal-400/20 blur-sm opacity-70 animate-pulse" />
                    )}
                    
                    <img 
                      src={user.photoURL} 
                      alt={formatShortName(user.displayName)} 
                      className={cn(
                        "relative w-12 h-12 rounded-full object-cover shadow-md transition-all duration-300",
                        online ? "ring-2 ring-emerald-500/50 grayscale-0" : "ring-1 ring-white/10 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100"
                      )}
                    />
                    
                    {/* Miniature presence node badge */}
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black",
                      online ? "bg-emerald-500 shadow-sm" : "bg-neutral-600"
                    )} />
                  </div>
                  
                  <span className={cn(
                    "text-[9px] font-semibold tracking-wider truncate max-w-[64px] transition-colors",
                    online ? "text-emerald-400" : "text-white/70 group-hover:text-white"
                  )}>
                    {formatShortName(user.displayName)}
                  </span>
                  <span className="text-[6.5px] font-black uppercase text-white/25 tracking-wider -mt-1 text-center">
                    {online ? 'online' : formatLastSeen(user.lastSeen)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* "All messages" Vertical List Section */}
      <div>
        <h2 className="text-[10px] font-black uppercase text-white/40 tracking-wider mb-4 px-1">
          All Messages
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Scanning Resonance...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="glass-card text-center p-12 border border-white/5 bg-black/40">
            <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">The silence is absolute</p>
            <p className="text-[8px] text-white/15 uppercase tracking-widest mt-1">Start a conversation from composing a transmission</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((thread) => {
              const online = isUserOnline(thread.otherUser);
              return (
                <div
                  key={thread.id}
                  onClick={() => handleRowClick(thread.otherUser.uid)}
                  className={cn(
                    "p-4 rounded-2xl glass border transition-all flex items-center justify-between gap-4 cursor-pointer group active:scale-99",
                    online 
                      ? "border-emerald-500/10 bg-[#0d1f11]/30 hover:border-emerald-500/20" 
                      : "border-white/[0.03] bg-black/40 hover:border-white/10 hover:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Real User Avatar from DB */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={thread.otherUser.photoURL} 
                        alt={formatShortName(thread.otherUser.displayName)} 
                        className={cn(
                          "w-12 h-12 rounded-2xl object-cover ring-1 transition-all duration-300",
                          online ? "ring-emerald-500/40 grayscale-0" : "ring-white/10 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100"
                        )}
                      />
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black",
                        online ? "bg-emerald-500 shadow-md shadow-emerald-500/20 animate-pulse" : "bg-neutral-600"
                      )} />
                    </div>

                    {/* Message details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={cn(
                          "font-display font-bold text-xs uppercase tracking-wider transition-colors truncate pr-2-5",
                          online ? "text-emerald-400 group-hover:text-emerald-300" : "text-white/80 group-hover:text-white"
                        )}>
                          {formatShortName(thread.otherUser.displayName)}
                        </h3>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 flex-shrink-0.5">
                          {thread.lastMessageTime}
                        </span>
                      </div>
                      
                      <p className="text-xs text-white/40 truncate leading-relaxed">
                        {thread.isMyMessage && <span className="text-purple-400/80 font-black tracking-wider uppercase text-[9px] mr-1">You:</span>}
                        {thread.lastMessage}
                      </p>
                    </div>
                  </div>

                  {/* Right side: unread indicator badge */}
                  {thread.unreadCount > 0 && (
                    <div className="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <span className="text-[9px] font-black text-white">
                        {thread.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
