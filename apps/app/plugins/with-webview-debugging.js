/**
 * Internal demo-only plugin: enable Android WebView remote debugging so the
 * packaged avatar WebView can be inspected from a desktop Chrome during
 * demos/debugging.
 *
 * Injects `android.webkit.WebView.setWebContentsDebuggingEnabled(true)` into
 * `MainApplication.onCreate` (both Java and Kotlin templates). Reversible:
 * remove this plugin entry from `app.json` to take it out.
 */
const { withMainApplication } = require("expo/config-plugins");

const JAVA_CALL = "android.webkit.WebView.setWebContentsDebuggingEnabled(true);";
const KOTLIN_CALL = "android.webkit.WebView.setWebContentsDebuggingEnabled(true)";

function injectIntoOnCreate(contents, language) {
  // Idempotent: do not inject a second copy on repeated prebuild runs.
  if (contents.includes("setWebContentsDebuggingEnabled")) {
    return contents;
  }
  if (language === "java") {
    const needle = "super.onCreate();";
    if (!contents.includes(needle)) return contents;
    return contents.replace(needle, `${needle}\n    ${JAVA_CALL}`);
  }
  // Kotlin statements carry no trailing semicolon.
  const needle = "super.onCreate()";
  if (!contents.includes(needle)) return contents;
  return contents.replace(needle, `${needle}\n    ${KOTLIN_CALL}`);
}

const withWebViewDebugging = (config) => {
  return withMainApplication(config, (config) => {
    const modResults = config.modResults;
    modResults.contents = injectIntoOnCreate(modResults.contents, modResults.language);
    // modRunner contract: return the (possibly modified) config/props.
    return config;
  });
};

module.exports = withWebViewDebugging;
