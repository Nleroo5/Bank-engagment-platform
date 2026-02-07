import Link from 'next/link';
import { LayoutDashboard, FileText, Users, BarChart3 } from 'lucide-react';

const adminLinks = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    description: 'View overview and statistics',
    icon: LayoutDashboard,
  },
  {
    name: 'Campaigns',
    href: '/admin/campaigns',
    description: 'Manage survey campaigns',
    icon: FileText,
  },
  {
    name: 'Users',
    href: '/admin/users',
    description: 'Manage users and invitations',
    icon: Users,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    description: 'View and export reports',
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bank Engagement Survey Platform
          </h1>
          <p className="text-xl text-gray-600">
            Production-ready survey platform for banking institutions
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-md transition-all hover:shadow-xl hover:scale-105"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary-100 p-3 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {link.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {link.description}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary-500 to-primary-600 transform scale-x-0 transition-transform group-hover:scale-x-100" />
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Platform Version 0.1.0
          </p>
        </div>
      </div>
    </main>
  );
}
