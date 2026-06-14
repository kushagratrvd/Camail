import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthUrl } from 'corsair/oauth';
import { corsair } from '@/server/corsair';

export async function GET(req: NextRequest) {
    const plugin = req.nextUrl.searchParams.get('plugin');
    const tenantId = req.nextUrl.searchParams.get('tenantId');

    if (!plugin || !tenantId) {
        return NextResponse.json(
            { error: 'Missing plugin or tenantId parameter' }, 
            { status: 400 }
        );
    }

    // This matches your Authorized Redirect URI in Google Cloud
    const REDIRECT_URI = new URL('/api/auth', req.nextUrl.origin).toString();

    const { url, state } = await generateOAuthUrl(corsair, plugin, {
        tenantId,
        redirectUri: REDIRECT_URI,
    });

    // Create a redirect response to the Google OAuth login page
    const response = NextResponse.redirect(url);
    
    // Set a cookie to verify the state on the callback (CSRF protection)
    response.cookies.set('oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60, // 10 minutes in seconds
    });

    return response;
}
