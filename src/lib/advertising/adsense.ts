import { environmentConfig } from "../../config/environment";

export const ADSENSE_PUBLISHER_ID = "ca-pub-2626435516434249";
export const ADSENSE_SCRIPT_ORIGIN = "https://pagead2.googlesyndication.com";
export const ADSENSE_GOOGLE_FRAME_ORIGIN = "https://www.google.com";
export const ADSENSE_FRAME_ORIGIN = "https://googleads.g.doubleclick.net";
export const ADSENSE_MEASUREMENT_SCRIPT_ORIGIN = "https://ep2.adtrafficquality.google";
export const ADSENSE_CONNECT_ORIGIN = "https://ep1.adtrafficquality.google";
export const ADSENSE_SCRIPT_URL = `${ADSENSE_SCRIPT_ORIGIN}/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

/** Domain identification only. No ad units, queue pushes or automatic-ad configuration. */
export function adsenseHeadScripts(officialProduction = environmentConfig.isOfficialProduction) {
  return officialProduction
    ? [{ src: ADSENSE_SCRIPT_URL, async: true, crossOrigin: "anonymous" as const }]
    : [];
}
