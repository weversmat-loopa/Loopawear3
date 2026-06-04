import { followCreator, unfollowCreator } from "@/app/creators/follow-actions";

interface FollowButtonProps {
  creatorId: string;
  isFollowing: boolean;
}

/**
 * Server-action–powered follow/unfollow button.
 * Rendered only on OTHER people's profiles (the page hides it for the owner).
 */
export default function FollowButton({ creatorId, isFollowing }: FollowButtonProps) {
  return (
    <form action={isFollowing ? unfollowCreator : followCreator}>
      <input type="hidden" name="following_id" value={creatorId} />
      <button
        type="submit"
        className={
          isFollowing
            ? "sticker rounded-full bg-paper px-5 py-2 text-sm font-extrabold text-ink"
            : "sticker rounded-full bg-ink px-5 py-2 text-sm font-extrabold text-paper"
        }
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </form>
  );
}
