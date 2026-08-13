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

        /*
         * Create the statistics table
         * the first time this Durable Object
         * is used.
         */

        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                views INTEGER NOT NULL DEFAULT 0,
                likes INTEGER NOT NULL DEFAULT 0
            )
        `);

        /*
         * Make sure the single statistics
         * row exists.
         */

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
 * MAIN WORKER
 * ============================================================
 */

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);


        /*
         * ========================================================
         * ONLINE GAME STATISTICS
         * ========================================================
         *
         * GET:
         * /api/stats/Gravi-Plat
         *
         * POST:
         * /api/stats/Gravi-Plat/view
         * /api/stats/Gravi-Plat/like
         * /api/stats/Gravi-Plat/unlike
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


            /*
             * Get one Durable Object
             * specifically for this game.
             *
             * Therefore:
             *
             * Gravi-Plat
             *      ↓
             * one GameStats object
             *
             * Painterz
             *      ↓
             * another GameStats object
             */

            const id =
                env.GAME_STATS.idFromName(
                    gameID
                );


            const stats =
                env.GAME_STATS.get(id);


            /*
             * GET STATISTICS
             */

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


            /*
             * Only POST requests can
             * change statistics.
             */

            if (request.method !== "POST") {

                return new Response(
                    "Method not allowed.",
                    {
                        status: 405
                    }
                );

            }


            /*
             * Check for a valid action.
             */

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


            /*
             * Send the action to the
             * game's Durable Object.
             */

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
         *
         * /game/Gravi-Plat
         * /game/Cool-Game
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
         *
         * /game-thumbnail/Gravi-Plat
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
         *
         * → GameSwapHQ website
         */

        return env.ASSETS.fetch(request);

    }

};
