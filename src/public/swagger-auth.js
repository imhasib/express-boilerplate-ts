(function () {
    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (response) => {
            if (response.url.endsWith('/login') && response.ok) {
                const clone = response.clone();
                try {
                    const body = await clone.json();
                    const token = body.tokens?.accessToken;
                    if (token && window.ui) {
                        window.ui.authActions.authorize({
                            bearerAuth: {
                                name: "bearerAuth",
                                schema: { type: "apiKey", in: "header", name: "Authorization", description: "" },
                                value: token
                            }
                        });
                    }
                } catch (e) { console.error("Auto-auth failed", e); }
            }
            return response;
        });
    };
})();
