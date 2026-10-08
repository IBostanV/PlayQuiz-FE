// Signing in or out: like a slide change, the page under the header fades away first and only then does home load
// and fade up (components/layout picks it up from there, main in _page-transitions.scss).
// `work` (signing out) runs under the fade, so the page emptying as the session ends is never seen;
// home comes once both are done, whether the work succeeded or not.
export const FADE_MS = 600;

export const fadeToHome = (router, method = 'push', work = null) => {
    const root = document.documentElement;
    // The fade is done: components/layout puts a signed-out header up now, not once home has loaded.
    const go = () => {
        window.dispatchEvent(new Event('pq:faded'));
        return router[method]('/home');
    };
    // Only opacity changes, nothing moves, so the system's reduce-motion setting does not stop it;
    // a player who switched motion off (Appearance) still goes straight there.
    if (root.getAttribute('data-motion') === 'off') return Promise.allSettled([work]).then(go);

    root.setAttribute('data-slide', 'out');
    return Promise.allSettled([work, new Promise(resolve => setTimeout(resolve, FADE_MS))]).then(go);
};
