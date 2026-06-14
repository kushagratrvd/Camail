import { NextRequest, NextResponse } from 'next/server';
import { processOAuthCallback } from 'corsair/oauth';
import { corsair } from '@/server/corsair';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    // Get the expected state from the cookie set during /api/connect
    const expectedState = req.cookies.get('oauth_state')?.value;

    if (error) {
        return new NextResponse(
            `<html><body><h2>Authorization failed</h2><p>${escapeHtml(error)}</p></body></html>`, 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code || !state) {
        return new NextResponse(
            '<p>Missing code or state parameter.</p>', 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (state !== expectedState) {
        return new NextResponse(
            '<p>Invalid state. Possible CSRF attempt.</p>', 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    const REDIRECT_URI = new URL('/api/auth', req.nextUrl.origin).toString();

    try {
        const result = await processOAuthCallback(corsair, {
            code,
            state,
            redirectUri: REDIRECT_URI,
        });

        const response = new NextResponse(
            `<html><body><h2>Connected!</h2>` +
            `<p>Plugin <strong>${escapeHtml(result.plugin)}</strong> ` +
            `authorized for tenant <strong>${escapeHtml(result.tenantId)}</strong>.</p>` +
            `<p><a href="/">Back to home</a></p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
        
        // Clear the state cookie after successful authorization
        response.cookies.delete('oauth_state');
        return response;
        
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new NextResponse(
            `<html><body><h2>OAuth error</h2><p>${escapeHtml(message)}</p></body></html>`, 
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
}
