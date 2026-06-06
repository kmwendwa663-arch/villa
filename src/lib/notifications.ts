import { db, collection, addDoc } from './firebase';

export interface NotificationPayload {
  userId: string; // Receiver of the notification
  type: 'like' | 'comment' | 'follow' | 'mention' | 'follow_request' | 'follow_accepted' | 'system';
  username: string; // Creator of the event (sender)
  avatarInitials?: string;
  avatarColor?: string;
  text: string;
  postId?: string;
  postThumb?: string;
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const notifRef = collection(db, 'notifications');
    await addDoc(notifRef, {
      ...payload,
      timestamp: new Date().toISOString(),
      isRead: false
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
