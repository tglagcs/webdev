import { WebDeveloper } from "../../globals";

WebDeveloper.Overlay         = WebDeveloper.Overlay || {};
WebDeveloper.Overlay.Outline = WebDeveloper.Overlay.Outline || {};

// Initializes the outline overlay
WebDeveloper.Overlay.Outline.initialize = function()
{

  WebDeveloper.Storage.getItem("outline.show.element.tag.names", function(showElementTagNames)
  {
    // If the outline show element tag names preference is set to true
    if(showElementTagNames)
    {
    }
  });
};

// Outlines all absolute positioned elements
WebDeveloper.Overlay.Outline.outlineAbsolutePositionedElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.Outline.outlinePositionedElements("absolute", !featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Outlines all block level elements
WebDeveloper.Overlay.Outline.outlineBlockLevelElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.getItem("outline.show.element.tag.names", function(showElementTagNamesStorage)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(showElementTagNames){ globalThis.WebDeveloper.Outline.outlineBlockLevelElements([document], showElementTagNames); }, [showElementTagNamesStorage]);
      });
    }
  });
};

// Outlines all deprecated elements
WebDeveloper.Overlay.Outline.outlineDeprecatedElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.getItem("outline.show.element.tag.names", function(showElementTagNamesStorage)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(showElementTagNames){ globalThis.WebDeveloper.Outline.outlineDeprecatedElements([document], showElementTagNames); }, [showElementTagNamesStorage]);
      });
    }
  });
};

// Outlines all external links
WebDeveloper.Overlay.Outline.outlineExternalLinks = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.Outline.outlineExternalLinks(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Outlines all fixed positioned elements
WebDeveloper.Overlay.Outline.outlineFixedPositionedElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.Outline.outlinePositionedElements("fixed", !featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Outlines all floated elements
WebDeveloper.Overlay.Outline.outlineFloatedElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.Outline.outlineFloatedElements(!featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Outlines all frames
WebDeveloper.Overlay.Outline.outlineFrames = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.Outline.outlineFrames([document]); });
    }
  });
};

// Outlines all headings
WebDeveloper.Overlay.Outline.outlineHeadings = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.getItem("outline.show.element.tag.names", function(showElementTagNamesStorage)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(showElementTagNames){ globalThis.WebDeveloper.Outline.outlineHeadings([document], showElementTagNames); }, [showElementTagNamesStorage]);
      });
    }
  });
};

// Outlines all non-secure elements
WebDeveloper.Overlay.Outline.outlineNonSecureElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.Outline.outlineNonSecureElements([document]); });
    }
  });
};

// Outlines all relative positioned elements
WebDeveloper.Overlay.Outline.outlineRelativePositionedElements = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.isFeatureOnTab(featureItem.getAttribute("id"), tab, function(enabled)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(featureEnabled){ globalThis.WebDeveloper.Outline.outlinePositionedElements("relative", !featureEnabled, [document]); }, [enabled]);
      });
    }
  });
};

// Outlines all table captions
WebDeveloper.Overlay.Outline.outlineTableCaptions = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.Outline.outlineTableCaptions([document]); });
    }
  });
};

// Outlines all table cells
WebDeveloper.Overlay.Outline.outlineTableCells = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Storage.getItem("outline.show.element.tag.names", function(showElementTagNamesStorage)
      {
        WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(showElementTagNames){ globalThis.WebDeveloper.Outline.outlineTableCells([document], showElementTagNames); }, [showElementTagNamesStorage]);
      });
    }
  });
};

// Outlines all tables
WebDeveloper.Overlay.Outline.outlineTables = function()
{
  var featureItem = this;

  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    // If the tab is valid
    if(WebDeveloper.Overlay.isValidTab(tab))
    {
      WebDeveloper.Overlay.Outline.toggleFeatureOnTab(featureItem, tab, function(){ globalThis.WebDeveloper.Outline.outlineTables([document]); });
    }
  });
};

// Toggles a feature on a tab
WebDeveloper.Overlay.Outline.toggleFeatureOnTab = function(featureItem, tab, scriptCode, args)
{
  WebDeveloper.Overlay.toggleFeatureOnTab(featureItem, tab, "/feature-outline.js", scriptCode, args);
};

// Toggles whether to show element tag names when outlining
WebDeveloper.Overlay.Outline.toggleShowElementTagNames = function()
{
  var featureItem = this;

  featureItem.classList.toggle("active");
  WebDeveloper.Storage.setItem("outline.show.element.tag.names", featureItem.classList.contains("active"));
};

// If the document is still loading
if(document.readyState === "loading")
{
  document.addEventListener("DOMContentLoaded", WebDeveloper.Overlay.Outline.initialize);
}
else
{
  WebDeveloper.Overlay.Outline.initialize();
}
