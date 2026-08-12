export default {
    async fetch(request, env) {

        const url = new URL(request.url);


        /*
         * ============================================================
         * ONLINE GAME STATISTICS
         * ============================================================
         */

        if (url.pathname.startsWith("/api/stats/")) {

            const parts =
                url.pathname
                    .substring("/api/stats/".length)
                    .split("/");

            const gameID =
                decodeURIComponent(parts[0]);

            const action =
                parts[1] || "";


            if (!gameID) {

                return new Response(
                    JSON.stringify({
                        error: "Game not specified."
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

            }


            const key =
                `game:${gameID}`;


            /*
             * GET STATS
             *
             * /api/stats/Gravi-Plat
             */

            if (
                request.method === "GET" &&
                !action
            ) {

                const stored =
                    await env.GAME_STATS.get(
                        key,
                        "json"
                    );


                const stats =
                    stored || {
                        views: 0,
                        likes: 0
                    };


                return new Response(
                    JSON.stringify(stats),
                    {
                        headers: {
                            "Content-Type":
                                "application/json",

                            "Cache-Control":
                                "no-store"
                        }
                    }
                );

            }


            /*
             * RECORD VIEW
             *
             * POST /api/stats/Gravi-Plat/view
             */

            if (
                request.method === "POST" &&
                action === "view"
            ) {

                const stored =
                    await env.GAME_STATS.get(
                        key,
                        "json"
                    );


                const stats =
                    stored || {
                        views: 0,
                        likes: 0
                    };


                stats.views =
                    Number(stats.views || 0) + 1;


                await env.GAME_STATS.put(
                    key,
                    JSON.stringify(stats)
                );


                return new Response(
                    JSON.stringify(stats),
                    {
                        headers: {
                            "Content-Type":
                                "application/json",

                            "Cache-Control":
                                "no-store"
                        }
                    }
                );

            }


            /*
             * LIKE
             *
             * POST /api/stats/Gravi-Plat/like
             */

            if (
                request.method === "POST" &&
                action === "like"
            ) {

                const stored =
                    await env.GAME_STATS.get(
                        key,
                        "json"
                    );


                const stats =
                    stored || {
                        views: 0,
                        likes: 0
                    };


                stats.likes =
                    Number(stats.likes || 0) + 1;


                await env.GAME_STATS.put(
                    key,
                    JSON.stringify(stats)
                );


                return new Response(
                    JSON.stringify(stats),
                    {
                        headers: {
                            "Content-Type":
                                "application/json",

                            "Cache-Control":
                                "no-store"
                        }
                    }
                );

            }


            /*
             * UNLIKE
             *
             * POST /api/stats/Gravi-Plat/unlike
             */

            if (
                request.method === "POST" &&
                action === "unlike"
            ) {

                const stored =
                    await env.GAME_STATS.get(
                        key,
                        "json"
                    );


                const stats =
                    stored || {
                        views: 0,
                        likes: 0
                    };


                stats.likes =
                    Math.max(
                        0,
                        Number(stats.likes || 0) - 1
                    );


                await env.GAME_STATS.put(
                    key,
                    JSON.stringify(stats)
                );


                return new Response(
                    JSON.stringify(stats),
                    {
                        headers: {
                            "Content-Type":
                                "application/json",

                            "Cache-Control":
                                "no-store"
                        }
                    }
                );

            }


            return new Response(
                JSON.stringify({
                    error: "Invalid statistics request."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
         * ============================================================
         * GAME
         * ============================================================
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
         * → GameSwapHQ website
         * ============================================================
         */

        return env.ASSETS.fetch(request);

    }
};
