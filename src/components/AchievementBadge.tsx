'use client';

export type AchievementTier = {
  min: number;
  name: string;
  badge: string;
  badgeClasses: string;
  nameClasses: string;
};

export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  {
    min: 400,
    name: 'Onsterfelijk',
    badge: '400+',
    badgeClasses: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    nameClasses: 'text-yellow-500 dark:text-yellow-300 font-bold',
  },
  {
    min: 300,
    name: 'Mythisch',
    badge: '300+',
    badgeClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    nameClasses: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  },
  {
    min: 200,
    name: 'Legende',
    badge: '200+',
    badgeClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    nameClasses: 'text-blue-600 dark:text-blue-400 font-semibold',
  },
  {
    min: 150,
    name: 'Veteraan',
    badge: '150+',
    badgeClasses: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    nameClasses: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    min: 100,
    name: 'Centurion',
    badge: '100+',
    badgeClasses: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    nameClasses: 'text-purple-600 dark:text-purple-400',
  },
  {
    min: 75,
    name: 'Driekwart',
    badge: '75+',
    badgeClasses: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
    nameClasses: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    min: 67,
    name: 'AOW-er',
    badge: '67+',
    badgeClasses: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    nameClasses: 'text-rose-600 dark:text-rose-400',
  },
  {
    min: 50,
    name: 'Halfhonderd',
    badge: '50+',
    badgeClasses: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    nameClasses: 'text-red-600 dark:text-red-400',
  },
  {
    min: 25,
    name: 'Stamgast',
    badge: '25+',
    badgeClasses: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    nameClasses: 'text-orange-600 dark:text-orange-400',
  },
  {
    min: 10,
    name: 'Rookie',
    badge: '10+',
    badgeClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    nameClasses: 'text-amber-700 dark:text-amber-400',
  },
];

export function getAchievementTier(totalReceived: number): AchievementTier | null {
  return ACHIEVEMENT_TIERS.find(t => totalReceived >= t.min) ?? null;
}

export function AchievementBadge({ tier }: { tier: AchievementTier | null }) {
  if (!tier) return null;
  return (
    <span
      className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${tier.badgeClasses}`}
      title={tier.name}
    >
      {tier.badge}
    </span>
  );
}
