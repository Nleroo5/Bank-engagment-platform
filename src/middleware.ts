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

      const role = token.role as string;

      // Only SUPER_ADMIN can access admin panel and APIs
      if (role !== 'SUPER_ADMIN') {
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/admin/login', req.url));
        }
        return NextResponse.json(
          { error: 'Forbidden: Super admin access required' },
          { status: 403 }
        );
      }

      // SUPER_ADMIN has full access
      return NextResponse.next();
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
