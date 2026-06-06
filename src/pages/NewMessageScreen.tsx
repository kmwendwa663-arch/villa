import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  X, 
  Check, 
  Search,
  Loader2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { formatShortName } from '../lib/utils';
import { motion } from 'motion/react';
import { db, collection, getDocs } from '../lib/firebase';
import { UserProfile } from '../types';

export function NewMessageScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Load database users
  useEffect(() => {
    if (!profile) return;

    let active = true;
    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (active) {
          const list = snap.docs
            .map(doc => doc.data() as UserProfile)
            .filter(u => u.uid !== profile.uid);
          setUsers(list);
        }
      } catch (err) {
        console.error("Error fetching users for messaging:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();
    return () => { active = false; };
  }, [profile]);

  // Toggle selection state for recipient
  const handleSelectToggle = (uid: string) => {
    if (selectedIds.includes(uid)) {
      setSelectedIds(selectedIds.filter(id => id !== uid));
    } else {
      setSelectedIds([...selectedIds, uid]);
    }
  };

  // Remove recipient via chip click
  const handleRemoveRecipient = (uid: string) => {
    setSelectedIds(selectedIds.filter(id => id !== uid));
  };

  // Click Next handler: navigates to the first selected recipient's conversation
  const handleNextClick = () => {
    if (selectedIds.length === 0) return;
    const targetId = selectedIds[0];
    navigate(`/chat/${targetId}`);
  };

  const selectedUsers = users.filter(u => selectedIds.includes(u.uid));

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const name = u.displayName.toLowerCase();
    const email = u.email.toLowerCase();
    const username = (u.username || '').toLowerCase();
    return name.includes(term) || email.includes(term) || username.includes(term);
  });

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      
      {/* Top Header / Navigation Bar */}
      <div className="flex items-center justify-between py-5 border-b border-white/5 bg-[#070707]/90 sticky top-0 z-30 backdrop-blur-3xl px-1 mb-6">
        <button
          onClick={() => navigate('/chat')}
          className="p-2 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Cancel and return"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-xs font-display font-black text-white uppercase tracking-[0.25em]">
          New Message
        </h1>

        <button
          onClick={handleNextClick}
          disabled={selectedIds.length === 0}
          className="text-xs font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
        >
          Next
        </button>
      </div>

      {/* "To:" input field list with scrollable active pills */}
      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/45 select-none mr-1">
            To:
          </span>
          
          {selectedUsers.map((user) => (
            <motion.div 
              key={user.uid}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-semibold"
            >
              <span>{formatShortName(user.displayName)}</span>
              <button 
                onClick={() => handleRemoveRecipient(user.uid)}
                className="p-0.5 rounded-full hover:bg-purple-500/20 text-purple-400/80 hover:text-purple-300 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}

          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={selectedIds.length === 0 ? "Search members..." : "Add more..."}
            className="flex-1 min-w-[120px] bg-transparent border-none text-xs text-white/90 placeholder-white/20 focus:outline-none p-1"
          />
        </div>
      </div>

      {/* Contacts List Header */}
      <div className="mb-4">
        <h2 className="text-[10px] font-black uppercase text-white/40 tracking-wider px-1">
          Registered Members
        </h2>
      </div>

      {/* Scrollable List of Registered Members */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            <p className="text-[8px] font-black uppercase tracking-widest text-white/25">Querying Membership...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-xs uppercase tracking-widest">
            No active connections found
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedIds.includes(user.uid);
            
            return (
              <div
                key={user.uid}
                onClick={() => handleSelectToggle(user.uid)}
                className="p-4 rounded-2xl glass border border-white/[0.03] hover:border-purple-500/15 hover:bg-white/[0.01] transition-all flex items-center justify-between gap-4 bg-black/40 cursor-pointer active:scale-[0.995]"
              >
                <div className="flex items-center gap-4">
                  {/* Real avatar image from DB */}
                  <img 
                    src={user.photoURL} 
                    alt={formatShortName(user.displayName)} 
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10" 
                  />

                  <div>
                    <h3 className="font-display font-bold text-white text-xs uppercase tracking-wider">
                      {formatShortName(user.displayName)}
                    </h3>
                    <p className="text-[9px] text-white/30 tracking-wider uppercase mt-1">
                      @{user.username || user.displayName.toLowerCase().replace(/\s+/g, '')}
                    </p>
                  </div>
                </div>

                {/* Selection Checkmark icon */}
                <div className="flex-shrink-0 pr-1">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/10">
                      <Check className="w-4 h-4 text-white font-bold" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-white/10" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
