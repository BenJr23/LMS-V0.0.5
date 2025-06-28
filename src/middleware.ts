import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = req.nextUrl;

  // Get user role from private metadata if user is authenticated
  let userRole: string | undefined;
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      userRole = user.privateMetadata?.role as string;
    } catch (error) {
      console.error('Error fetching user in middleware:', error);
    }
  }

  // Public routes that don't require authentication or role checks
  const publicRoutes = ['/', '/faculty-login', '/student-login'];
  if (publicRoutes.includes(url.pathname)) {
    // If user is authenticated, redirect them to their appropriate dashboard
    if (userId && userRole) {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      } else if (userRole === 'faculty') {
        return NextResponse.redirect(new URL('/faculty/dashboard', req.url));
      } else if (userRole === 'student') {
        return NextResponse.redirect(new URL('/student/dashboard', req.url));
      }
    }
    // If not authenticated, allow access to public routes
    return NextResponse.next();
  }

  // Restrict /admin/ routes to admin users only
  if (url.pathname.startsWith('/admin')) {
    if (!userId || userRole !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Restrict /faculty/ routes to faculty users only
  if (url.pathname.startsWith('/faculty')) {
    if (!userId || userRole !== 'faculty') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Restrict /student/ routes to student users only
  if (url.pathname.startsWith('/student')) {
    if (!userId || userRole !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Allow all other requests
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
