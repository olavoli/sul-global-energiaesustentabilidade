/** Test-only synthetic hash anchors. Never imported by the experiment CLI. */
import fixture from "./history.fixture.json";
import { legacyPins } from "./campaigns";
import { hash } from "../i18n-simulation/pipeline";
// Production pins remain unchanged on disk. Tests exercise the same hash checks
// against invented records rather than copying private financial history.
for (const name of Object.keys(legacyPins)) delete legacyPins[name];
for (const [name, raw] of Object.entries(fixture))
  legacyPins[name.startsWith("execution-") ? "execution-*.json" : name] = hash(raw);
export default fixture;
