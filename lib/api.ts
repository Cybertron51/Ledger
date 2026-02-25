/**
 * TASH — Frontend API Client
 *
 * Thin wrapper around fetch() that automatically attaches
 * the user's Supabase access token for authenticated routes.
 *
 * Usage:
 *   const res = await api("/api/vault/holdings");
 *   const data = await res.json();
 */

import { supabase } from "@/lib/supabase";

/**
 * Make an authenticated API call to our Next.js backend.
 * Automatically injects the current user's JWT.
 */
export async function api(
    path: string,
    options?: RequestInit & { skipAuth?: boolean }
): Promise<Response> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
    };

    // Attach JWT if user is logged in
    if (!options?.skipAuth && supabase) {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
        }
    }

    return fetch(path, {
        ...options,
        headers,
    });
}

/**
 * Convenience: GET with auto-auth.
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
    const res = await api(path);
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
}

/**
 * Convenience: POST with auto-auth.
 */
export async function apiPost<T = unknown>(
    path: string,
    body: unknown
): Promise<T> {
    const res = await api(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
}

/**
 * Convenience: PATCH with auto-auth.
 */
export async function apiPatch<T = unknown>(
    path: string,
    body: unknown
): Promise<T> {
    const res = await api(path, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
}
