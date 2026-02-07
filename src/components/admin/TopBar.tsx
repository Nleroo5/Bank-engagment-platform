'use client';

import { signOut, useSession } from 'next-auth/react';
import { Menu, LogOut, User } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="hidden lg:block">
          <h2 className="text-xl font-semibold text-gray-900">
            Admin Dashboard
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <User className="h-4 w-4 text-gray-500" />
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500">{session.user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
