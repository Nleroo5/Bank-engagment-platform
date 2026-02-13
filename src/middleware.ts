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

      const role = token.role as string;

      // SUPER_ADMIN has full access
      if (role === 'SUPER_ADMIN') {
        return NextResponse.next();
      }

      // ORG_ADMIN restrictions - cannot access user management
      if (role === 'ORG_ADMIN') {
        if (path.startsWith('/admin/users') || path === '/api/users') {
          if (path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.next();
      }

      // VIEWER restrictions - read-only access (GET requests only)
      if (role === 'VIEWER') {
        if (req.method !== 'GET') {
          return NextResponse.json(
            { error: 'Forbidden: Viewers have read-only access' },
            { status: 403 }
          );
        }
        return NextResponse.next();
      }

      // RESPONDENT role should not access admin or API routes
      if (role === 'RESPONDENT') {
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
