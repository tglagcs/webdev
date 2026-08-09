import { WebDeveloper } from "../../globals";

WebDeveloper.Overlay     = WebDeveloper.Overlay || {};
WebDeveloper.Overlay.CSS = WebDeveloper.Overlay.CSS || {};

// Edits the CSS of the page
WebDeveloper.Overlay.CSS.editCSS = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      var locale = {};

      locale.couldNotLoadCSS = WebDeveloper.Locales.getString("couldNotLoadCSS");
      locale.dashboardTitle  = WebDeveloper.Locales.getString("extensionName") + " " + WebDeveloper.Locales.getString("dashboard");
      locale.editCSS         = WebDeveloper.Locales.getString("editCSS");
      locale.embeddedStyles  = WebDeveloper.Locales.getString("embeddedStyles");

      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.toggleFeatureOnTab(featureItem, tab, ["/embedded-dashboard.js", "/embedded-edit-css.js"], function(featureEnabled, cssLocale){ globalThis.WebDeveloper.EditCSS.editCSS(!featureEnabled, document, cssLocale); }, [enabled, locale], true);
      });
    }
  });
};

// Returns the locale for the view CSS feature
WebDeveloper.Overlay.CSS.getViewCSSLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.couldNotLoadCSS    = WebDeveloper.Locales.getString("couldNotLoadCSS");
  locale.css                = WebDeveloper.Locales.getString("css");
  locale.dark               = WebDeveloper.Locales.getString("dark");
  locale.embeddedCSSFrom    = WebDeveloper.Locales.getString("embeddedCSSFrom");
  locale.light              = WebDeveloper.Locales.getString("light");
  locale.none               = WebDeveloper.Locales.getString("none");
  locale.styleSheet         = WebDeveloper.Locales.getString("styleSheet");
  locale.styleSheets        = WebDeveloper.Locales.getString("styleSheets");
  locale.syntaxHighlighting = WebDeveloper.Locales.getString("syntaxHighlighting");

  return locale;
};

// Initializes the CSS overlay
WebDeveloper.Overlay.CSS.initialize = function()
{

};

// Displays the CSS
WebDeveloper.Overlay.CSS.viewCSS = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-css" }, function(data)
      {
        WebDeveloper.Storage.getItem("syntax_highlight_theme", function(item)
        {
          data.theme = item;

          WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-css.html"), tab.index, data, WebDeveloper.Overlay.CSS.getViewCSSLocale());
        });
      });
    }
  });
};

// If the document is still loading
if(document.readyState === "loading")
{
  document.addEventListener("DOMContentLoaded", WebDeveloper.Overlay.CSS.initialize);
}
else
{
  WebDeveloper.Overlay.CSS.initialize();
}
