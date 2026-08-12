export default {
    async fetch(request, env) {

        const url = new URL(request.url);


        /*
         * ============================================================
         * ONLINE GAME STATISTICS
         * ============================================================
         *
         * GET:
         * /api/stats/Gravi-Plat
         *
         * POST:
         * /api/stats/Gravi-Plat/view
         * /api/stats/Gravi-Plat/like
         * /api/stats/Gravi-Plat/unlike
         */


        if (url.pathname.startsWith("/api/stats/")) {

            const parts =
                url.pathname
                    .substring("/api/stats/".length)
                    .split("/");

            const gameID =
                decodeURIComponent(parts[0]);

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
             * Get existing statistics.
             */

            const key =
                "stats:" + gameID;

            let stats =
                await env.GAME_STATS.get(
                    key,
                    "json"
                );


            /*
             * If this game has never been
             * accessed before, create it.
             */

            if (!stats) {

                stats = {
                    views: 0,
                    likes: 0
                };

            }


            /*
             * GET STATISTICS
             */

            if (
                request.method === "GET" &&
                !action
            ) {

                return Response.json(
                    stats,
                    {
                        headers: {
                            "Cache-Control": "no-store"
                        }
                    }
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
             * RECORD VIEW
             */

            if (action === "view") {

                stats.views++;

            }


            /*
             * LIKE GAME
             */

            else if (action === "like") {

                stats.likes++;

            }


            /*
             * UNLIKE GAME
             */

            else if (action === "unlike") {

                stats.likes =
                    Math.max(
                        0,
                        stats.likes - 1
                    );

            }


            /*
             * Unknown action.
             */

            else {

                return new Response(
                    "Unknown statistics action.",
                    {
                        status: 400
                    }
                );

            }


            /*
             * Save updated statistics
             * to Cloudflare KV.
             */

            await env.GAME_STATS.put(
                key,
                JSON.stringify(stats)
            );


            /*
             * Return the new statistics
             * to the website.
             */

            return Response.json(
                stats,
                {
                    headers: {
                        "Cache-Control": "no-store"
                    }
                }
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


        if (url.pathname.startsWith("/game/")) {

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
