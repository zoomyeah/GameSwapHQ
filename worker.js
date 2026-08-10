export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Game URL:
        // /game/Gravi-Plat
        if (url.pathname === "/game/Gravi-Plat") {

            const object = await env.GAMES.get(
                "Website Games/Gravi-Plat index.html"
            );

            if (!object) {
                return new Response("Game not found.", {
                    status: 404
                });
            }

            const headers = new Headers();

            headers.set(
                "Content-Type",
                "text/html; charset=UTF-8"
            );

            headers.set(
                "Cache-Control",
                "public, max-age=604800, immutable"
            );

            return new Response(
                object.body,
                {
                    headers
                }
            );
        }

        return new Response("Not Found", {
            status: 404
        });
    }
};
