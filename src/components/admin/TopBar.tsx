'use client';

import { Menu, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-primary-200 bg-primary-500 px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-3 text-white hover:bg-primary-600 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo-red.png"
            alt="Bank Engagement Survey Platform"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <div className="hidden border-l border-primary-400 pl-3 lg:block">
            <h2 className="text-lg font-semibold text-white">
              Admin Dashboard
            </h2>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <User className="h-4 w-4 text-primary-100" />
          <div className="text-right">
            <p className="font-medium text-white">{mockUser.name}</p>
            <p className="text-xs text-primary-100">{mockUser.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
