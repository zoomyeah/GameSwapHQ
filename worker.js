export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        /*
         * GAME
         * /game/Gravi-Plat
         * /game/Cool-Game
         * etc.
         */
        if (url.pathname.startsWith("/game/")) {

            const gameID =
                decodeURIComponent(
                    url.pathname.substring("/game/".length)
                );

            if (!gameID) {
                return new Response("Game not specified.", {
                    status: 400
                });
            }

            const object = await env.GAMES.get(
                `Website Games/${gameID} index.html`
            );

            if (!object) {
                return new Response("Game not found.", {
                    status: 404
                });
            }

            return new Response(object.body, {
                headers: {
                    "Content-Type": "text/html; charset=UTF-8",
                    "Cache-Control": "public, max-age=604800"
                }
            });
        }


        /*
         * THUMBNAIL
         * /game-thumbnail/Gravi-Plat
         * /game-thumbnail/Cool-Game
         * etc.
         */
        if (url.pathname.startsWith("/game-thumbnail/")) {

            const gameID =
                decodeURIComponent(
                    url.pathname.substring("/game-thumbnail/".length)
                );

            if (!gameID) {
                return new Response("Game not specified.", {
                    status: 400
                });
            }

            const object = await env.GAMES.get(
                `Website Games/${gameID}.png`
            );

            if (!object) {
                return new Response("Thumbnail not found.", {
                    status: 404
                });
            }

            return new Response(object.body, {
                headers: {
                    "Content-Type": "image/png",
                    "Cache-Control": "public, max-age=604800"
                }
            });
        }


        /*
         * EVERYTHING ELSE
         * → GameSwapHQ website
         */
        return env.ASSETS.fetch(request);
    }
};
