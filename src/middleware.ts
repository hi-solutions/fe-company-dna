import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Add paths that require authentication
const protectedPaths = [
    '/app',
]

// Add paths that should redirect to dashboard if already authenticated
const authPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
]

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if the path needs protection
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    const isAuthPath = authPaths.some(path => pathname.startsWith(path))

    const token = request.cookies.get('access_token')?.value

    if (isProtectedPath && !token) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    if (isAuthPath && token) {
        const dashboardUrl = new URL('/app/dashboard', request.url)
        return NextResponse.redirect(dashboardUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
