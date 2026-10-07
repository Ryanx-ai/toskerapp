import { APP_VERSION_LABEL } from "@/config/app";
import { SettingsSection } from "./settings-shell";
import styles from "./room-map-workspace.module.css";
export function MapAbout() {
  return <SettingsSection title="Version info / About" description="Tosker founder-review build">
    <div className={styles.aboutCopy}>
    <p>{APP_VERSION_LABEL} · FP6</p>
    <p>Map rendering: <a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">MapLibre GL JS 6.11.2</a> · <a href="/maplibre/6.11.2/LICENSE.txt" target="_blank" rel="noopener noreferrer">BSD 3-Clause license</a>.</p>
    <p>Maps, search and routing: <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> Free, bounded Development evaluation. Not a permanent production-provider commitment.</p>
    <p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors · ODbL</a>. Map design/data: <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · <a href="https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md" target="_blank" rel="noopener noreferrer">BSD / CC-BY</a>. Individual place source/license appears in its Info.</p>
    <p>Required credits remain on the Map. Drive/Walk are planning estimates, not live navigation, traffic, toll or border-wait information.</p>
    <p><a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Geoapify privacy policy</a> · <a href="https://www.geoapify.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer">Terms</a>. Locate is private; routing from your location requires separate consent.</p>
    </div>
  </SettingsSection>;
}
