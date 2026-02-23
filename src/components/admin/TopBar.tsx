'use client';

import { Menu, User, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession();
  // session.user is augmented in next-auth.d.ts to include role, but we cast
  // here because the duplicate augmentation in config.ts confuses tsc.
  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string }
    | undefined;
  const userName = user?.name ?? user?.email ?? 'Admin';
  const userRole = user?.role ?? '';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-accent-600 bg-accent-500 px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-3 text-white hover:bg-accent-600 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <Image
            src="/dashboard-logo.png"
            alt="Bank Engagement Survey Platform"
            width={160}
            height={53}
            className="h-10 w-auto sm:h-12 md:h-14"
            priority
          />
          <div className="hidden border-l border-accent-400 pl-3 lg:block">
            <h2 className="text-lg font-semibold text-white">
              Admin Dashboard
            </h2>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <User className="h-4 w-4 text-accent-100" />
          <div className="text-right">
            <p className="font-medium text-white">{userName}</p>
            {userRole && <p className="text-xs text-accent-100">{userRole}</p>}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-accent-100 hover:bg-accent-600 hover:text-white"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
