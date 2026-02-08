'use client';

import { Menu, User } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

// Mock user for demo mode (login disabled)
const mockUser = {
  name: 'Demo Admin',
  email: 'admin@demo.com',
  role: 'SUPER_ADMIN',
};

export function TopBar({ onMenuClick }: TopBarProps) {
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
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <User className="h-4 w-4 text-gray-500" />
          <div className="text-right">
            <p className="font-medium text-gray-900">{mockUser.name}</p>
            <p className="text-xs text-gray-500">{mockUser.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
