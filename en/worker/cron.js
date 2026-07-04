export async function cleanupExpiredSessions(env) {

    await env.DB.prepare(`
        DELETE FROM sessions
        WHERE expires_at < CURRENT_TIMESTAMP
    `).run();

}
