export default {
    async fetch(request, env) {
        const url = new URL(request.url);

// Serve Gravi-Plat thumbnail
if (url.pathname === "/game-thumbnail/Gravi-Plat") {
    const object = await env.GAMES.get(
        "Website Games/Gravity Platformer TN.png"
    );

    if (!object) {
        return new Response("Thumbnail not found.", {
            status: 404
        });
    }

    return new Response(object.body, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800, immutable"
        }
    });
}
        }

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

        // Serve the main GameSwapHQ website
        return env.ASSETS.fetch(request);
    }
};
