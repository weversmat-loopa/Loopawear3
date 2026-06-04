interface StatTile {
  label: string;
  value: number;
}

interface ProfileStatTilesProps {
  designCount: number;
  salesCount: number;
  followerCount: number;
  followingCount: number;
  likesCount: number;
}

/**
 * Stat tiles shown on the public creator profile.
 */
export default function ProfileStatTiles({
  designCount,
  salesCount,
  followerCount,
  followingCount,
  likesCount,
}: ProfileStatTilesProps) {
  const stats: StatTile[] = [
    { label: "Designs",    value: designCount   },
    { label: "Likes",      value: likesCount    },
    { label: "Sales",      value: salesCount    },
    { label: "Followers",  value: followerCount  },
    { label: "Following",  value: followingCount },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-zinc-200 bg-paper px-4 py-3 text-center dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="font-display text-xl text-ink">{value}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      ))}
    </div>
  );
}
