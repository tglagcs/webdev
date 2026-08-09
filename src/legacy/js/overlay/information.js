import { WebDeveloper } from "../../globals";

WebDeveloper.Overlay             = WebDeveloper.Overlay || {};
WebDeveloper.Overlay.Information = WebDeveloper.Overlay.Information || {};

// Displays information about an element
WebDeveloper.Overlay.Information.displayElementInformation = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      var locale = {};

      locale.ancestors                         = WebDeveloper.Locales.getString("ancestors");
      locale.children                          = WebDeveloper.Locales.getString("children");
      locale.dashboardTitle                    = WebDeveloper.Locales.getString("extensionName") + " " + WebDeveloper.Locales.getString("dashboard");
      locale.dom                               = WebDeveloper.Locales.getString("dom");
      locale.elementInformation                = WebDeveloper.Locales.getString("elementInformation");
      locale.layout                            = WebDeveloper.Locales.getString("layout");
      locale.position                          = WebDeveloper.Locales.getString("position");
      locale.selectAnElementDisplayInformation = WebDeveloper.Locales.getString("selectAnElementDisplayInformation");
      locale.text                              = WebDeveloper.Locales.getString("text");

      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.toggleFeatureOnTab(featureItem, tab, ["/embedded-dashboard.js", "/embedded-element-information.js"], function(featureEnabled, featureLocale){ globalThis.WebDeveloper.ElementInformation.initialize(!featureEnabled, document, featureLocale); }, [enabled, locale], true);
      });
    }
  });
};

// Finds all the duplicate ids on a page
WebDeveloper.Overlay.Information.findDuplicateIds = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-duplicate-ids" }, function(data)
      {
        var locale = WebDeveloper.Locales.setupGeneratedLocale();

        locale.duplicateId  = WebDeveloper.Locales.getString("duplicateId");
        locale.duplicateIds = WebDeveloper.Locales.getString("duplicateIds");

        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/find-duplicate-ids.html"), tab.index, data, locale);
      });
    }
  });
};

// Returns the locale for the view anchor information feature
WebDeveloper.Overlay.Information.getViewAnchorInformationLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.anchor            = WebDeveloper.Locales.getString("anchor");
  locale.anchorInformation = WebDeveloper.Locales.getString("anchorInformation");
  locale.anchors           = WebDeveloper.Locales.getString("anchors");

  return locale;
};

// Returns the locale for the view color information feature
WebDeveloper.Overlay.Information.getViewColorInformationLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.color            = WebDeveloper.Locales.getString("color");
  locale.colorInformation = WebDeveloper.Locales.getString("colorInformation");
  locale.colors           = WebDeveloper.Locales.getString("colors");

  return locale;
};

// Returns the locale for the view document outline feature
WebDeveloper.Overlay.Information.getViewDocumentOutlineLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.documentOutline = WebDeveloper.Locales.getString("documentOutline");
  locale.heading         = WebDeveloper.Locales.getString("heading");
  locale.headings        = WebDeveloper.Locales.getString("headings");
  locale.missingHeading  = WebDeveloper.Locales.getString("missingHeading");
  locale.noHeadingText   = WebDeveloper.Locales.getString("noHeadingText");

  return locale;
};

// Returns the locale for the view JavaScript feature
WebDeveloper.Overlay.Information.getViewJavaScriptLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.beautifyJavaScript     = WebDeveloper.Locales.getString("beautifyJavaScript");
  locale.couldNotLoadJavaScript = WebDeveloper.Locales.getString("couldNotLoadJavaScript");
  locale.dark                   = WebDeveloper.Locales.getString("dark");
  locale.embeddedJavaScriptFrom = WebDeveloper.Locales.getString("embeddedJavaScriptFrom");
  locale.javaScript             = WebDeveloper.Locales.getString("javaScript");
  locale.light                  = WebDeveloper.Locales.getString("light");
  locale.none                   = WebDeveloper.Locales.getString("none");
  locale.syntaxHighlighting     = WebDeveloper.Locales.getString("syntaxHighlighting");
  locale.undoBeautifyJavaScript = WebDeveloper.Locales.getString("undoBeautifyJavaScript");

  return locale;
};

// Returns the locale for the view link information feature
WebDeveloper.Overlay.Information.getViewLinkInformationLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.link            = WebDeveloper.Locales.getString("link");
  locale.linkInformation = WebDeveloper.Locales.getString("linkInformation");
  locale.links           = WebDeveloper.Locales.getString("links");

  return locale;
};

// Returns the locale for the view meta tag information feature
WebDeveloper.Overlay.Information.getViewMetaTagInformationLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.content  = WebDeveloper.Locales.getString("content");
  locale.metaTag  = WebDeveloper.Locales.getString("metaTag");
  locale.metaTags = WebDeveloper.Locales.getString("metaTags");
  locale.name     = WebDeveloper.Locales.getString("name");

  return locale;
};

// Returns the locale for the view response headers feature
WebDeveloper.Overlay.Information.getViewResponseHeadersLocale = function()
{
  var locale = WebDeveloper.Locales.setupGeneratedLocale();

  locale.couldNotLoadResponseHeaders = WebDeveloper.Locales.getString("couldNotLoadResponseHeaders");
  locale.responseHeaders             = WebDeveloper.Locales.getString("responseHeaders");

  return locale;
};

// Initializes the information overlay
WebDeveloper.Overlay.Information.initialize = function()
{

};

// Displays the anchor information for a page
WebDeveloper.Overlay.Information.viewAnchorInformation = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-anchors" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-anchor-information.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewAnchorInformationLocale());
      });
    }
  });
};

// Displays the color information for a page
WebDeveloper.Overlay.Information.viewColorInformation = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-colors" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-color-information.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewColorInformationLocale());
      });
    }
  });
};

// Displays the document outline
WebDeveloper.Overlay.Information.viewDocumentOutline = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-document-outline" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-document-outline.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewDocumentOutlineLocale());
      });
    }
  });
};

// Displays the JavaScript
WebDeveloper.Overlay.Information.viewJavaScript = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-javascript" }, function(data)
      {
        WebDeveloper.Storage.getItem("syntax_highlight_theme", function(item)
        {
          data.theme = item;

          WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-javascript.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewJavaScriptLocale());
        });
      });
    }
  });
};

// Displays the link information for a page
WebDeveloper.Overlay.Information.viewLinkInformation = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-links" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-link-information.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewLinkInformationLocale());
      });
    }
  });
};

// Displays the meta tag information for a page
WebDeveloper.Overlay.Information.viewMetaTagInformation = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-meta-tags" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-meta-tag-information.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewMetaTagInformationLocale());
      });
    }
  });
};

// Displays the response headers
WebDeveloper.Overlay.Information.viewResponseHeaders = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      chrome.tabs.sendMessage(tab.id, { type: "get-document-details" }, function(data)
      {
        WebDeveloper.Overlay.openGeneratedTab(chrome.runtime.getURL("/view-response-headers.html"), tab.index, data, WebDeveloper.Overlay.Information.getViewResponseHeadersLocale());
      });
    }
  });
};

// If the document is still loading
if(document.readyState === "loading")
{
  document.addEventListener("DOMContentLoaded", WebDeveloper.Overlay.Information.initialize);
}
else
{
  WebDeveloper.Overlay.Information.initialize();
}
