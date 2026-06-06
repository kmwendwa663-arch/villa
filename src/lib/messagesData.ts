import { UserProfile } from '../types';

export interface MockConversation {
  id: string;
  userId: string;
  username: string;
  avatarInitials: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isMyMessage: boolean;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  text: string;
  senderId: string; // "me" or userId
  timestamp: string;
  seen: boolean;
}

export interface SuggestRecipient {
  uid: string;
  displayName: string;
  username: string;
  avatarInitials: string;
  avatarColor: string;
}

const INITIAL_CONVERSATIONS: MockConversation[] = [
  {
    id: "conv_aiden",
    userId: "aiden_uid",
    username: "Aiden",
    avatarInitials: "AD",
    avatarColor: "#8B5CF6",
    lastMessage: "The new design gallery looks absolutely spectacular.",
    lastMessageTime: "12:35 PM",
    unreadCount: 2,
    isOnline: true,
    isMyMessage: false,
  },
  {
    id: "conv_bianca",
    userId: "bianca_uid",
    username: "Bianca",
    avatarInitials: "BN",
    avatarColor: "#EC4899",
    lastMessage: "Are we still aligned for the design review tonight?",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: true,
    isMyMessage: false,
  },
  {
    id: "conv_liam",
    userId: "liam_uid",
    username: "Liam",
    avatarInitials: "LM",
    avatarColor: "#3B82F6",
    lastMessage: "Let's capture the wave resonance under the bridge.",
    lastMessageTime: "2 days ago",
    unreadCount: 0,
    isOnline: false,
    isMyMessage: true,
  },
  {
    id: "conv_charles",
    userId: "charles_uid",
    username: "Charles",
    avatarInitials: "CH",
    avatarColor: "#10B981",
    lastMessage: "Check out this typographic alignment.",
    lastMessageTime: "3 days ago",
    unreadCount: 0,
    isOnline: true,
    isMyMessage: false,
  },
];

const INITIAL_MESSAGES: MockMessage[] = [
  // Aiden
  {
    id: "m01",
    conversationId: "conv_aiden",
    text: "Hey! Did you check out the new design gallery updates?",
    senderId: "aiden_uid",
    timestamp: "12:30 PM",
    seen: true,
  },
  {
    id: "m02",
    conversationId: "conv_aiden",
    text: "Yes, I am looking at them now.",
    senderId: "me",
    timestamp: "12:32 PM",
    seen: true,
  },
  {
    id: "m03",
    conversationId: "conv_aiden",
    text: "The new design gallery looks absolutely spectacular.",
    senderId: "aiden_uid",
    timestamp: "12:35 PM",
    seen: false,
  },

  // Bianca
  {
    id: "m04",
    conversationId: "conv_bianca",
    text: "Hi! How is the research going on the new audio synthesizer?",
    senderId: "me",
    timestamp: "Yesterday 9:00 AM",
    seen: true,
  },
  {
    id: "m05",
    conversationId: "conv_bianca",
    text: "Are we still aligned for the design review tonight?",
    senderId: "bianca_uid",
    timestamp: "Yesterday 9:15 AM",
    seen: true,
  },

  // Liam
  {
    id: "m06",
    conversationId: "conv_liam",
    text: "Sounds like a solid plan. I am heading over to Berlin now.",
    senderId: "liam_uid",
    timestamp: "2 days ago",
    seen: true,
  },
  {
    id: "m07",
    conversationId: "conv_liam",
    text: "Let's capture the wave resonance under the bridge.",
    senderId: "me",
    timestamp: "2 days ago",
    seen: true,
  },

  // Charles
  {
    id: "m08",
    conversationId: "conv_charles",
    text: "I found this Swiss typography book and it changed my mind.",
    senderId: "charles_uid",
    timestamp: "3 days ago",
    seen: true,
  },
  {
    id: "m09",
    conversationId: "conv_charles",
    text: "Check out this typographic alignment.",
    senderId: "charles_uid",
    timestamp: "3 days ago",
    seen: true,
  },
];

const INITIAL_SUGGESTED: SuggestRecipient[] = [
  {
    uid: "aiden_uid",
    displayName: "Aiden Mercer",
    username: "aiden",
    avatarInitials: "AD",
    avatarColor: "#8B5CF6",
  },
  {
    uid: "bianca_uid",
    displayName: "Bianca Rossi",
    username: "bianca",
    avatarInitials: "BN",
    avatarColor: "#EC4899",
  },
  {
    uid: "liam_uid",
    displayName: "Liam Vance",
    username: "liam",
    avatarInitials: "LM",
    avatarColor: "#3B82F6",
  },
  {
    uid: "charles_uid",
    displayName: "Charles Eames",
    username: "charles",
    avatarInitials: "CH",
    avatarColor: "#10B981",
  },
  {
    uid: "sophia_uid",
    displayName: "Sophia Loren",
    username: "sophia",
    avatarInitials: "SP",
    avatarColor: "#F59E0B",
  },
  {
    uid: "noah_uid",
    displayName: "Noah Miller",
    username: "noah",
    avatarInitials: "NH",
    avatarColor: "#EF4444",
  },
  {
    uid: "ava_uid",
    displayName: "Ava Lovelace",
    username: "ava",
    avatarInitials: "AV",
    avatarColor: "#6366F1",
  },
];

// Helper to load/save JSON from localStorage
export const getStoredConversations = (): MockConversation[] => {
  const data = localStorage.getItem('meso_conversations');
  if (!data) {
    localStorage.setItem('meso_conversations', JSON.stringify(INITIAL_CONVERSATIONS));
    return INITIAL_CONVERSATIONS;
  }
  return JSON.parse(data);
};

export const getStoredMessages = (): MockMessage[] => {
  const data = localStorage.getItem('meso_conv_messages');
  if (!data) {
    localStorage.setItem('meso_conv_messages', JSON.stringify(INITIAL_MESSAGES));
    return INITIAL_MESSAGES;
  }
  return JSON.parse(data);
};

export const saveStoredConversations = (convs: MockConversation[]) => {
  localStorage.setItem('meso_conversations', JSON.stringify(convs));
};

export const saveStoredMessages = (msgs: MockMessage[]) => {
  localStorage.setItem('meso_conv_messages', JSON.stringify(msgs));
};

export const getSuggestedRecipients = (): SuggestRecipient[] => {
  return INITIAL_SUGGESTED;
};

// Start a new conversation or return existing
export const getOrCreateConversation = (targetUser: SuggestRecipient): MockConversation => {
  const convs = getStoredConversations();
  const existing = convs.find(c => c.userId === targetUser.uid);
  if (existing) return existing;

  const newConv: MockConversation = {
    id: `conv_${targetUser.uid}_${Date.now()}`,
    userId: targetUser.uid,
    username: targetUser.username,
    avatarInitials: targetUser.avatarInitials,
    avatarColor: targetUser.avatarColor,
    lastMessage: 'Conversation started',
    lastMessageTime: 'Just now',
    unreadCount: 0,
    isOnline: true,
    isMyMessage: true,
  };

  const updatedConvs = [newConv, ...convs];
  saveStoredConversations(updatedConvs);
  return newConv;
};

// Send message
export const addMockMessage = (conversationId: string, text: string): MockMessage => {
  const msgs = getStoredMessages();
  const convs = getStoredConversations();

  const newMsg: MockMessage = {
    id: `m_${Date.now()}`,
    conversationId,
    text,
    senderId: 'me',
    timestamp: 'Just now',
    seen: false, // Set to false, can transition to seen via a double check simulation
  };

  const updatedMsgs = [...msgs, newMsg];
  saveStoredMessages(updatedMsgs);

  // Update conversation last message info
  const updatedConvs = convs.map(c => {
    if (c.id === conversationId) {
      return {
        ...c,
        lastMessage: text,
        lastMessageTime: 'Just now',
        unreadCount: 0,
        isMyMessage: true,
      };
    }
    return c;
  });
  saveStoredConversations(updatedConvs);

  return newMsg;
};

// Simulate other user typing and responding after 1.5 seconds
export const runMockReply = (
  conversationId: string, 
  userText: string, 
  onReplyAdded: () => void
) => {
  setTimeout(() => {
    const convs = getStoredConversations();
    const targetConv = convs.find(c => c.id === conversationId);
    if (!targetConv) return;

    const botReplies = [
      "Amazing alignment. Let's expand on this further.",
      "Indeed! The aesthetics feel incredibly consistent.",
      "Understood. Splendid, I will process the stream update shortly.",
      "Let's sync up within the collective soon.",
      "A fascinating frequency. Keep broadcasting!",
    ];

    let replyText = botReplies[Math.floor(Math.random() * botReplies.length)];
    if (userText.toLowerCase().includes('location') || userText.toLowerCase().includes('send location')) {
      replyText = "📍 Broadcast coordinates updated block: 52.5200° N, 13.4050° E (Berlin Mitte).";
    } else if (userText.toLowerCase().includes('react')) {
      replyText = "👍 Loved your latest creation in the general feed.";
    }

    const msgs = getStoredMessages();
    const newMsg: MockMessage = {
      id: `m_rep_${Date.now()}`,
      conversationId,
      text: replyText,
      senderId: targetConv.userId,
      timestamp: 'Just now',
      seen: false,
    };

    saveStoredMessages([...msgs, newMsg]);

    const updatedConvs = getStoredConversations().map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: replyText,
          lastMessageTime: 'Just now',
          unreadCount: 1,
          isMyMessage: false,
        };
      }
      return c;
    });
    saveStoredConversations(updatedConvs);

    onReplyAdded();
  }, 1500);
};

// Clear unread count for conversation
export const clearUnreadCount = (conversationId: string) => {
  const convs = getStoredConversations();
  const updated = convs.map(c => {
    if (c.id === conversationId) {
      return { ...c, unreadCount: 0 };
    }
    return c;
  });
  saveStoredConversations(updated);
};
