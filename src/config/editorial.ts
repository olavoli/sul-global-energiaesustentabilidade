const demoOptIn = import.meta.env.VITE_ALLOW_DEMO_CONTENT === "true";

/** Demo content is always available locally and requires explicit opt-in in production. */
export const demoContentEnabled = import.meta.env.DEV || demoOptIn;
