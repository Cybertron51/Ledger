function parseAdminEmails(raw: string | undefined): Set<string> {
    if (!raw) return new Set();
    return new Set(
        raw
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

function getConfiguredAdminEmails(): Set<string> {
    const fromServer =
        process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL;
    const fromPublic =
        process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    return parseAdminEmails(fromServer || fromPublic);
}

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return getConfiguredAdminEmails().has(email.toLowerCase());
}
