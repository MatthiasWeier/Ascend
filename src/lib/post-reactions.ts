// Fixed reaction set (like most chat apps) - zero server imports, safe for
// both server and client components.
export const REACTION_EMOJIS = ["👍", "❤️", "💪", "🔥"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
