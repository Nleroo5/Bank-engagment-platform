import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Public paths - allow unauthenticated access
    if (
      path.startsWith('/s/') || // Survey token URLs
      path.startsWith('/a/') || // Anonymous access code URLs
      path.startsWith('/api/anonymous/') || // Anonymous API endpoints
      path.startsWith('/api/sanity/') || // Sanity CMS data (surveys, questions) - needed for survey rendering
      path.startsWith('/api/responses') || // Public response submission (uses token validation)
      path === '/' || // Home page
      path === '/admin/login' // Login page
    ) {
      return NextResponse.next();
    }

    // Protected paths require authentication
    if (path.startsWith('/admin') || path.startsWith('/api/')) {
      // Check if user is authenticated
      if (!token) {
        // Redirect to login for browser requests
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/admin/login', req.url));
        }
        // Return 401 for API requests
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const role = token.role as string | undefined;
      const method = req.method;

      // Ensure role exists
      if (!role) {
        console.error('Token exists but role is missing:', { path, email: token.email });
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/admin/login', req.url));
        }
        return NextResponse.json(
          { error: 'Unauthorized: Invalid session' },
          { status: 401 }
        );
      }

      // Role-based access control
      // SUPER_ADMIN: Full access to everything
      // ORG_ADMIN: Cannot access /api/users or /admin/users
      // VIEWER: GET requests only (no POST/PUT/DELETE)
      // RESPONDENT: Should not access admin/API routes

      if (role === 'SUPER_ADMIN') {
        return NextResponse.next(); // Full access
      }

      if (role === 'ORG_ADMIN') {
        // Block access to user management
        if (path.startsWith('/api/users') || path === '/admin/users') {
          return NextResponse.json(
            { error: 'Forbidden: User management requires super admin access' },
            { status: 403 }
          );
        }
        // Allow other admin and API access
        return NextResponse.next();
      }

      if (role === 'VIEWER') {
        // Viewers can only make GET requests
        if (method !== 'GET') {
          return NextResponse.json(
            { error: 'Forbidden: Viewers can only perform read operations' },
            { status: 403 }
          );
        }
        // Allow GET requests to admin and API
        return NextResponse.next();
      }

      // RESPONDENT or unknown role - block access to admin/API
      console.warn('User with insufficient role attempted access:', { role, path });
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => {
        // Allow requests to proceed to middleware function for granular control
        // The middleware function will handle authorization logic
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    // Match all paths except static files, images, and favicons
    '/((?!_next/static|_next/image|favicon|.*\\.png$|.*\\.jpg$|.*\\.ico$|.*\\.svg$).*)',
  ],
};
