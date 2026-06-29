import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Do not redirect root if it is meant to be a landing page.

    // Check Admin routes
    if (path.startsWith('/admin') && !path.startsWith('/admin/login') && !path.startsWith('/admin/recovery')) {
        const token = request.cookies.get('admin_accessToken')?.value;
        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // Check Developer routes
    if (path.startsWith('/developer') && !path.startsWith('/developer/login')) {
        const devToken = request.cookies.get('developer_accessToken')?.value;
        const adminToken = request.cookies.get('admin_accessToken')?.value;
        if (!devToken && !adminToken) {
            return NextResponse.redirect(new URL('/developer/login', request.url));
        }
    }

    // Check Viewer routes
    if (path.startsWith('/viewer') && !path.startsWith('/viewer/login')) {
        const token = request.cookies.get('viewer_accessToken')?.value;
        if (!token) {
            return NextResponse.redirect(new URL('/viewer/login', request.url));
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public images
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
    ],
};
