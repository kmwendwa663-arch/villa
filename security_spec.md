# Security Spec - SocialConnect

## Data Invariants
1. A post must have a valid authorId matching the authenticated user.
2. A like must have a userId matching the authenticated user.
3. A message must have a senderId matching the authenticated user and a chatId derived from sender/receiver.
4. Comments must match the authenticated user's authorId.
5. User profile can only be updated by the owner.

## The Dirty Dozen Payloads
1. Attempt to create a post as another user.
2. Attempt to update a post's likesCount directly from client.
3. Attempt to delete someone else's post.
4. Attempt to edit someone else's profile.
5. Attempt to send a message as someone else.
6. Attempt to read someone else's messages.
7. Attempt to create a comment on a non-existent post.
8. Attempt to like a post multiple times as the same user.
9. Attempt to inject a massive string into a post content.
10. Attempt to spoof email_verified status in internal logic.
11. Attempt to read ALL users' emails via listing users collection.
12. Attempt to update the createdAt timestamp of a post.

## Test Runner (Draft)
- verify(unauthenticated).read('/posts/1') -> ALLOW
- verify(user_a).create('/posts/2', { authorId: 'user_b' }) -> DENY
- verify(user_a).update('/posts/1', { content: 'hacked' }) -> DENY (if not owner)
- verify(user_a).list('/messages') -> DENY (unless filtered by userId)
