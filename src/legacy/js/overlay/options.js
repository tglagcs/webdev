import { WebDeveloper } from "../../globals";

WebDeveloper.Overlay         = WebDeveloper.Overlay || {};
WebDeveloper.Overlay.Options = WebDeveloper.Overlay.Options || {};

// Opens the about page
WebDeveloper.Overlay.Options.about = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    chrome.tabs.create({ index: tab.index + 1, url: chrome.runtime.getURL("/about.html") });
    WebDeveloper.Overlay.close();
  });
};

// Initializes the options overlay
// Opens the options
WebDeveloper.Overlay.Options.options = function()
{
  chrome.runtime.openOptionsPage();
  WebDeveloper.Overlay.close();
};

// Resets the page
WebDeveloper.Overlay.Options.resetPage = function()
{
  WebDeveloper.Overlay.getSelectedTab(function(tab)
  {
    WebDeveloper.Overlay.addScriptToTab(tab, function() { window.location.reload(); }, function()
    {
      WebDeveloper.Overlay.close();
    });
  });
};

