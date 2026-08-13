import { DurableObject } from "cloudflare:workers";


/*
 * ============================================================
 * GAME STATISTICS DURABLE OBJECT
 * ============================================================
 */

export class GameStats extends DurableObject {

    constructor(ctx, env) {

        super(ctx, env);

        this.sql =
            ctx.storage.sql;

        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                views INTEGER NOT NULL DEFAULT 0,
                likes INTEGER NOT NULL DEFAULT 0
            )
        `);

        this.sql.exec(`
            INSERT OR IGNORE INTO stats
                (id, views, likes)
            VALUES
                (1, 0, 0)
        `);

    }


    /*
     * ========================================================
     * GET STATISTICS
     * ========================================================
     */

    async getStats() {

        const row =
            this.sql
                .exec(`
                    SELECT
                        views,
                        likes
                    FROM stats
                    WHERE id = 1
                `)
                .one();

        return {
            views: Number(row.views),
            likes: Number(row.likes)
        };

    }


    /*
     * ========================================================
     * RECORD VIEW
     * ========================================================
     */

    async recordView() {

        this.sql.exec(`
            UPDATE stats
            SET views = views + 1
            WHERE id = 1
        `);

        return this.getStats();

    }


    /*
     * ========================================================
     * LIKE
     * ========================================================
     */

    async like() {

        this.sql.exec(`
            UPDATE stats
            SET likes = likes + 1
            WHERE id = 1
        `);

        return this.getStats();

    }


    /*
     * ========================================================
     * UNLIKE
     * ========================================================
     */

    async unlike() {

        this.sql.exec(`
            UPDATE stats
            SET likes =
                CASE
                    WHEN likes > 0
                    THEN likes - 1
                    ELSE 0
                END
            WHERE id = 1
        `);

        return this.getStats();

    }


    /*
     * ========================================================
     * DURABLE OBJECT FETCH
     * ========================================================
     */

    async fetch(request) {

        const url =
            new URL(request.url);

        const action =
            url.pathname.substring(1);


        if (request.method === "GET") {

            return Response.json(
                await this.getStats()
            );

        }


        if (
            request.method === "POST" &&
            action === "view"
        ) {

            return Response.json(
                await this.recordView()
            );

        }


        if (
            request.method === "POST" &&
            action === "like"
        ) {

            return Response.json(
                await this.like()
            );

        }


        if (
            request.method === "POST" &&
            action === "unlike"
        ) {

            return Response.json(
                await this.unlike()
            );

        }


        return new Response(
            "Method not allowed.",
            {
                status: 405
            }
        );

    }

}


/*
 * ============================================================
 * PASSWORD HASHING
 * ============================================================
 *
 * Passwords are NEVER stored directly.
 *
 * PBKDF2 is used to derive a secure password hash.
 * ============================================================
 */

async function hashPassword(password) {

    const encoder =
        new TextEncoder();

    const salt =
        crypto.getRandomValues(
            new Uint8Array(16)
        );

    const key =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            {
                name: "PBKDF2"
            },
            false,
            [
                "deriveBits"
            ]
        );

    const hash =
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            key,
            256
        );

    return (
        "pbkdf2$100000$" +
        bytesToHex(salt) +
        "$" +
        bytesToHex(
            new Uint8Array(hash)
        )
    );

}


/*
 * ============================================================
 * PASSWORD VERIFICATION
 * ============================================================
 */

async function verifyPassword(
    password,
    storedHash
) {

    const parts =
        storedHash.split("$");

    if (
        parts.length !== 4 ||
        parts[0] !== "pbkdf2"
    ) {

        return false;

    }

    const iterations =
        Number(parts[1]);

    const salt =
        hexToBytes(parts[2]);

    const expectedHash =
        hexToBytes(parts[3]);

    const encoder =
        new TextEncoder();

    const key =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            {
                name: "PBKDF2"
            },
            false,
            [
                "deriveBits"
            ]
        );

    const hash =
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: "SHA-256"
            },
            key,
            256
        );

    return constantTimeEqual(
        new Uint8Array(hash),
        expectedHash
    );

}


/*
 * ============================================================
 * HEX HELPERS
 * ============================================================
 */

function bytesToHex(bytes) {

    return Array.from(bytes)
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


function hexToBytes(hex) {

    const bytes =
        new Uint8Array(
            hex.length / 2
        );

    for (
        let i = 0;
        i < hex.length;
        i += 2
    ) {

        bytes[i / 2] =
            parseInt(
                hex.substring(i, i + 2),
                16
            );

    }

    return bytes;

}


/*
 * ============================================================
 * CONSTANT-TIME COMPARISON
 * ============================================================
 */

function constantTimeEqual(a, b) {

    if (a.length !== b.length) {

        return false;

    }

    let result = 0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {

        result |=
            a[i] ^ b[i];

    }

    return result === 0;

}


/*
 * ============================================================
 * MAIN WORKER
 * ============================================================
 */

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);


        /*
         * ========================================================
         * ACCOUNT API
         * ========================================================
         *
         * POST:
         * /api/auth/register
         * /api/auth/login
         */


        /*
         * ========================================================
         * REGISTER
         * ========================================================
         */

        if (
            request.method === "POST" &&
            url.pathname === "/api/auth/register"
        ) {

            try {

                const body =
                    await request.json();

                const username =
                    typeof body.username === "string"
                        ? body.username.trim()
                        : "";

                const password =
                    typeof body.password === "string"
                        ? body.password
                        : "";


                /*
                 * Basic validation
                 */

                if (
                    !username ||
                    !password
                ) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Username and password are required."
                        },
                        {
                            status: 400
                        }
                    );

                }


                if (
                    username.length < 3 ||
                    username.length > 30
                ) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Username must be between 3 and 30 characters."
                        },
                        {
                            status: 400
                        }
                    );

                }


                if (
                    !/^[a-zA-Z0-9_-]+$/.test(
                        username
                    )
                ) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Username can only contain letters, numbers, underscores, and hyphens."
                        },
                        {
                            status: 400
                        }
                    );

                }


                if (password.length < 8) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Password must be at least 8 characters."
                        },
                        {
                            status: 400
                        }
                    );

                }


                /*
                 * Check whether username
                 * already exists.
                 */

                const existing =
                    await env.USERS
                        .prepare(`
                            SELECT id
                            FROM users
                            WHERE username = ?
                            LIMIT 1
                        `)
                        .bind(username)
                        .first();


                if (existing) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "That username is already taken."
                        },
                        {
                            status: 409
                        }
                    );

                }


                /*
                 * Hash password
                 */

                const passwordHash =
                    await hashPassword(
                        password
                    );


                /*
                 * Create account
                 */

                const result =
                    await env.USERS
                        .prepare(`
                            INSERT INTO users
                                (
                                    username,
                                    password_hash
                                )
                            VALUES
                                (?, ?)
                        `)
                        .bind(
                            username,
                            passwordHash
                        )
                        .run();


                if (!result.success) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Could not create account."
                        },
                        {
                            status: 500
                        }
                    );

                }


                return Response.json(
                    {
                        success: true,
                        message:
                            "Account created successfully.",
                        username: username
                    }
                );

            }
            catch (error) {

                console.error(
                    "Registration error:",
                    error
                );

                return Response.json(
                    {
                        success: false,
                        error:
                            "Something went wrong while creating the account."
                    },
                    {
                        status: 500
                    }
                );

            }

        }


        /*
         * ========================================================
         * LOGIN
         * ========================================================
         */

        if (
            request.method === "POST" &&
            url.pathname === "/api/auth/login"
        ) {

            try {

                const body =
                    await request.json();

                const username =
                    typeof body.username === "string"
                        ? body.username.trim()
                        : "";

                const password =
                    typeof body.password === "string"
                        ? body.password
                        : "";


                if (
                    !username ||
                    !password
                ) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Username and password are required."
                        },
                        {
                            status: 400
                        }
                    );

                }


                /*
                 * Find account
                 */

                const user =
                    await env.USERS
                        .prepare(`
                            SELECT
                                id,
                                username,
                                password_hash
                            FROM users
                            WHERE username = ?
                            LIMIT 1
                        `)
                        .bind(username)
                        .first();


                /*
                 * Don't reveal whether
                 * the username exists.
                 */

                if (!user) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Invalid username or password."
                        },
                        {
                            status: 401
                        }
                    );

                }


                /*
                 * Verify password
                 */

                const valid =
                    await verifyPassword(
                        password,
                        user.password_hash
                    );


                if (!valid) {

                    return Response.json(
                        {
                            success: false,
                            error:
                                "Invalid username or password."
                        },
                        {
                            status: 401
                        }
                    );

                }


                return Response.json(
                    {
                        success: true,
                        message:
                            "Signed in successfully.",
                        username:
                            user.username
                    }
                );

            }
            catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                return Response.json(
                    {
                        success: false,
                        error:
                            "Something went wrong while signing in."
                    },
                    {
                        status: 500
                    }
                );

            }

        }


        /*
         * ========================================================
         * ONLINE GAME STATISTICS
         * ========================================================
         */

        if (
            url.pathname.startsWith(
                "/api/stats/"
            )
        ) {

            const parts =
                url.pathname
                    .substring(
                        "/api/stats/".length
                    )
                    .split("/");


            const gameID =
                decodeURIComponent(
                    parts[0]
                );


            const action =
                parts[1] || null;


            if (!gameID) {

                return new Response(
                    "Game not specified.",
                    {
                        status: 400
                    }
                );

            }


            const id =
                env.GAME_STATS.idFromName(
                    gameID
                );


            const stats =
                env.GAME_STATS.get(id);


            if (
                request.method === "GET" &&
                !action
            ) {

                return stats.fetch(
                    new Request(
                        "https://stats/"
                    )
                );

            }


            if (request.method !== "POST") {

                return new Response(
                    "Method not allowed.",
                    {
                        status: 405
                    }
                );

            }


            if (
                action !== "view" &&
                action !== "like" &&
                action !== "unlike"
            ) {

                return new Response(
                    "Unknown statistics action.",
                    {
                        status: 400
                    }
                );

            }


            return stats.fetch(
                new Request(
                    "https://stats/" +
                    action,
                    {
                        method: "POST"
                    }
                )
            );

        }


        /*
         * ============================================================
         * GAME
         * ============================================================
         */

        if (
            url.pathname.startsWith(
                "/game/"
            )
        ) {

            const gameID =
                decodeURIComponent(
                    url.pathname.substring(
                        "/game/".length
                    )
                );


            if (!gameID) {

                return new Response(
                    "Game not specified.",
                    {
                        status: 400
                    }
                );

            }


            const object =
                await env.GAMES.get(
                    `Website Games/${gameID} index.html`
                );


            if (!object) {

                return new Response(
                    "Game not found.",
                    {
                        status: 404
                    }
                );

            }


            return new Response(
                object.body,
                {
                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8",

                        "Cache-Control":
                            "public, max-age=604800"
                    }
                }
            );

        }


        /*
         * ============================================================
         * THUMBNAIL
         * ============================================================
         */

        if (
            url.pathname.startsWith(
                "/game-thumbnail/"
            )
        ) {

            const gameID =
                decodeURIComponent(
                    url.pathname.substring(
                        "/game-thumbnail/".length
                    )
                );


            if (!gameID) {

                return new Response(
                    "Game not specified.",
                    {
                        status: 400
                    }
                );

            }


            const object =
                await env.GAMES.get(
                    `Website Games/${gameID}.png`
                );


            if (!object) {

                return new Response(
                    "Thumbnail not found.",
                    {
                        status: 404
                    }
                );

            }


            return new Response(
                object.body,
                {
                    headers: {
                        "Content-Type":
                            "image/png",

                        "Cache-Control":
                            "public, max-age=604800"
                    }
                }
            );

        }


        /*
         * ============================================================
         * EVERYTHING ELSE
         * ============================================================
         */

        return env.ASSETS.fetch(request);

    }

};
