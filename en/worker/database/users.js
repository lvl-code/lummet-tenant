export async function createSession(
    db,
    token,
    userId,
    expiresAt
) {

    return db
        .prepare(`
            INSERT INTO sessions (
                id,
                user_id,
                expires_at
            )
            VALUES (?, ?, ?)
        `)
        .bind(
            token,
            userId,
            expiresAt
        )
        .run();
}

export async function getSession(
    db,
    token
) {

    return db
        .prepare(`
            SELECT
                sessions.*,
                users.email,
                users.role
            FROM sessions
            JOIN users
                ON users.id = sessions.user_id
            WHERE sessions.id = ?
            LIMIT 1
        `)
        .bind(token)
        .first();
}

export async function deleteSession(
    db,
    token
) {

    return db
        .prepare(`
            DELETE FROM sessions
            WHERE id = ?
        `)
        .bind(token)
        .run();
}

export async function getUserByEmail(
 db,
 email
){
 return db.prepare(`
 SELECT *
 FROM users
 WHERE email=?
 LIMIT 1
 `)
 .bind(email)
 .first();
}
