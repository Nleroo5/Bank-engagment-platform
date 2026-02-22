'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  X,
  ListChecks,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Surveys', href: '/admin/surveys', icon: ListChecks },
  { name: 'Campaigns', href: '/admin/campaigns', icon: FileText },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-blue-900 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Title */}
          <div className="flex h-16 items-center justify-between px-6 lg:justify-center">
            <button
              onClick={onClose}
              className="rounded-md p-3 text-blue-200 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <footer className="border-t border-blue-800 p-4">
            <p className="text-xs text-blue-300">
              Bank Engagement Survey Platform
            </p>
            <p className="text-xs text-blue-400">v0.1.0</p>
          </footer>
        </div>
      </div>
    </>
  );
}
