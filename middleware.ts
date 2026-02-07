import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/admin/login');

    // If user is on auth page and is authenticated, redirect to dashboard
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    // If user is not authenticated and trying to access admin routes
    if (!isAuthPage && !isAuth) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Check role-based access
    if (token && req.nextUrl.pathname.startsWith('/admin')) {
      const userRole = token.role as string;

      // Only allow admin roles to access admin routes
      if (userRole === 'RESPONDENT') {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all /admin routes except /admin/login
export const config = {
  matcher: ['/admin/:path*'],
};
