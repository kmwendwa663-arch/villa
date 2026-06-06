export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  createdAt: any;
  bannerUrl?: string;
  followersCount?: number;
  followingCount?: number;
  username?: string;
  bio?: string;
  website?: string;
  location?: string;
  isPrivate?: boolean;
  coverColor?: string;
  status?: 'online' | 'offline';
  lastSeen?: any;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
  likesCount: number;
  commentsCount: number;
  category?: string;
  hasLiked?: boolean;
  imageUrl?: string;
}

export const POST_CATEGORIES = ["General", "Architecture", "Lifestyle", "Events", "Luxury"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[];
  content: string;
  createdAt: any;
  chatId: string;
  seen?: boolean;
}

export interface Follow {
  followerId: string;
  followedId: string;
  createdAt: any;
}

export interface Wallpaper {
  id: string;
  url: string;
  category: string;
  name: string;
}

export type WallpaperInterval = 5 | 10 | 30;

export interface WallpaperState {
  currentWallpaper: Wallpaper | null;
  solidColor: string | null;
  isSlideshowActive: boolean;
  slideshowInterval: WallpaperInterval;
  favorites: string[]; // IDs
  recent: Wallpaper[]; // Objects
}
