export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Serve Gravi-Plat
        if (url.pathname === "/game/Gravi-Plat") {
            const object = await env.GAMES.get(
                "Website Games/Gravi-Plat index.html"
            );

            if (!object) {
                return new Response("Game not found.", {
                    status: 404
                });
            }

            return new Response(object.body, {
                headers: {
                    "Content-Type": "text/html; charset=UTF-8",
                    "Cache-Control": "public, max-age=604800, immutable"
                }
            });
        }

        // Everything else goes to the GameSwapHQ website
        return env.ASSETS.fetch(request);
    }
};
