'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MIN_PLAYERS_FOR_TEAMS } from '@/lib/utils';
import { Users, Star, Trophy, LogOut, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface NavbarProps {
  playerCount: number;
}

const LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
];

export default function Navbar({ playerCount }: NavbarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1];
  const currentTab = pathname.split('/')[2] || 'leaderboard';
  const teamsUnlocked = playerCount >= MIN_PLAYERS_FOR_TEAMS;

  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(`/${locale}/auth`);
    router.refresh();
  }

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  const tabs = [
    { key: 'rate', label: t('rate'), icon: Star, href: `/${locale}/rate` },
    { key: 'leaderboard', label: t('leaderboard'), icon: Trophy, href: `/${locale}/leaderboard` },
    {
      key: 'teams',
      label: t('teams'),
      icon: Users,
      href: `/${locale}/teams`,
      locked: !teamsUnlocked,
    },
  ];

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <Link href={`/${locale}/leaderboard`} className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-white text-lg">MyPlayers</span>
        </Link>

        <nav className="flex items-center gap-1">
          {tabs.map(tab => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                currentTab === tab.key
                  ? 'bg-green-500 text-white'
                  : tab.locked
                  ? 'text-gray-600 cursor-not-allowed pointer-events-none'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.locked && <span className="text-xs">🔒</span>}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-800 rounded-xl p-1">
            <Globe size={14} className="text-gray-400 ml-1" />
            {LOCALES.map(l => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                  locale === l.code ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-gray-800"
          >
            <LogOut size={16} />
            {t('signOut')}
          </button>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 flex">
        {tabs.map(tab => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
              currentTab === tab.key
                ? 'text-green-400'
                : tab.locked
                ? 'text-gray-700 pointer-events-none'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <tab.icon size={20} />
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="flex-none px-4 flex flex-col items-center justify-center py-3 gap-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-xs font-medium">{t('signOut')}</span>
        </button>
      </nav>

      {/* Mobile top lang switcher */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <Link href={`/${locale}/leaderboard`} className="flex items-center gap-2">
          <span>⚽</span>
          <span className="font-bold text-white">MyPlayers</span>
        </Link>
        <div className="flex items-center gap-1 bg-gray-800 rounded-xl p-1">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                locale === l.code ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
