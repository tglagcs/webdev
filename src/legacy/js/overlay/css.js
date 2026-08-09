import { WebDeveloper } from "../../globals";

WebDeveloper.Overlay     = WebDeveloper.Overlay || {};
WebDeveloper.Overlay.CSS = WebDeveloper.Overlay.CSS || {};

// Adds a feature on a tab
WebDeveloper.Overlay.CSS.addFeatureOnTab = function(featureItem, tab, scriptCode)
{
  WebDeveloper.Overlay.addFeatureOnTab(featureItem, tab, "/feature-css.js", scriptCode);
};

// Disables all styles
WebDeveloper.Overlay.CSS.disableAllStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleAllStyles(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Disables the browser default styles
WebDeveloper.Overlay.CSS.disableBrowserDefaultStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.CSS.toggleBrowserDefaultStyles([document]); });
    }
  });
};

// Disables embedded styles
WebDeveloper.Overlay.CSS.disableEmbeddedStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleEmbeddedStyles(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Disables inline styles
WebDeveloper.Overlay.CSS.disableInlineStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleInlineStyles(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Disables linked style sheets
WebDeveloper.Overlay.CSS.disableLinkedStyleSheets = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleLinkedStyleSheets(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Disables print styles
WebDeveloper.Overlay.CSS.disablePrintStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.togglePrintStyles(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Displays handheld styles
WebDeveloper.Overlay.CSS.displayHandheldStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(displayHandheldStylesEnabled)
      {
        WebDeveloper.Storage.isFeatureOnTab("display-print-styles", tab, function(displayPrintStylesEnabled)
        {
          // If about to display handheld styles and print styles are being displayed
          if(!displayHandheldStylesEnabled && displayPrintStylesEnabled)
          {
            WebDeveloper.Overlay.CSS.toggleFeatureOnTab(document.getElementById("display-print-styles"), tab, function(){ globalThis.WebDeveloper.CSS.toggleMediaTypeStyles("print", false, [document]); });
          }

          WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleMediaTypeStyles("handheld", !featureEnabled, [document]); }, [displayHandheldStylesEnabled]);
        });
      });
    }
  });
};

// Displays print styles
WebDeveloper.Overlay.CSS.displayPrintStyles = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(displayPrintStylesEnabled)
      {
        WebDeveloper.Storage.isFeatureOnTab("display-handheld-styles", tab, function(displayHandheldStylesEnabled)
        {
          // If about to display print styles and handheld styles are being displayed
          if(!displayPrintStylesEnabled && displayHandheldStylesEnabled)
          {
            WebDeveloper.Overlay.CSS.toggleFeatureOnTab(document.getElementById("display-handheld-styles"), tab, function(){ globalThis.WebDeveloper.CSS.toggleMediaTypeStyles("handheld", false, [document]); });
          }

          WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.CSS.toggleMediaTypeStyles("print", !featureEnabled, [document]); }, [displayPrintStylesEnabled]);
        });
      });
    }
  });
};

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

// Reloads the linked style sheets of the page
WebDeveloper.Overlay.CSS.reloadLinkedStyleSheets = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.CSS.addFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.CSS.reloadLinkedStyleSheets([document]); });
    }
  });
};

// Toggles a feature on a tab
WebDeveloper.Overlay.CSS.toggleFeatureOnTab = function(featureItem, tab, scriptCode, args)
{
  WebDeveloper.Overlay.toggleFeatureOnTab(featureItem, tab, "/feature-css.js", scriptCode, args);
};

// Displays alt attributes for all images
WebDeveloper.Overlay.CSS.useBorderBoxModel = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.CSS.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.CSS.useBorderBoxModel([document]); });
    }
  });
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
