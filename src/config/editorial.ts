import { environmentConfig } from "@/config/environment";

/** Demo content is always available locally and requires explicit opt-in in production. */
export const demoContentEnabled = environmentConfig.demoContentEnabled;
