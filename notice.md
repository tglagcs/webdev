Notice
======

WebDev is a modified version of the **Web Developer** browser extension by
Chris Pederick.

* Original work: https://github.com/chrispederick/web-developer
* Original author: Chris Pederick — https://chrispederick.com/
* Original license: GNU General Public License v3.0

This fork began from upstream version 3.0.1 (released July 2024), which is
preserved as the first commit in this repository so that every change made
here is diffable against the original.

Modifications
-------------

WebDev is not endorsed by or affiliated with Chris Pederick. It is
distributed under a different name and with different artwork; the "Web
Developer" name and the original logo are not used.

Significant changes from upstream:

* Renamed to WebDev, with new logo and extension IDs
* Removed the upstream donation links and related assets
* Opera support dropped
* Build system replaced (Gulp 3.9.1 → WXT/Vite)
* Source ported to TypeScript
* Interface rebuilt with Svelte and Tailwind, and given a dark theme
* Automated tests and CI added

Per section 5 of the GPL, this notice records that the work has been modified
and the date of those modifications is recorded in this repository's history.

License
-------

WebDev remains licensed under the GNU General Public License v3.0. The full
text is in [license.txt](license.txt).

Third-party components
----------------------

The vendored libraries in `common/lib/` (Bootstrap, CodeMirror, DOMPurify,
Eric Meyer's Reset CSS, JS Beautifier, mustache.js) and the Nucleo interface
icons in `common/svg/` retain their own licenses and are not covered by the
GPL grant above.
