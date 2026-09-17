import packageJson from "../../package.json";

// package.json is the single source of truth for the version - nothing
// else (Docker labels, UI, changelog) should hardcode it separately.
// Follows SemVer: 0.x.y means "still moving, no API/schema stability
// guarantees yet"; bump to 1.0.0 once you'd call it stable.
export const APP_VERSION: string = packageJson.version;
