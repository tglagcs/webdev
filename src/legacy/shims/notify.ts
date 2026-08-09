/**
 * WebDeveloper.Common.displayNotification, for the injected bundles.
 *
 * The namespace slot means two different things depending on where the code
 * is running, and always has: in the popup it *renders* a notification, and in
 * an injected script it *sends* one to the popup to render. Upstream expressed
 * that by defining it twice, in overlay/overlay.js and features/common.js,
 * and never loading both.
 *
 * So this file is for the feature bundles only. Loading it in the popup would
 * replace the renderer with a sender, and the popup would message itself.
 */

import { WebDeveloper } from "../globals";
import { displayNotification } from "@/features/notify";

WebDeveloper.Common = WebDeveloper.Common || {};
WebDeveloper.Common.displayNotification = displayNotification;
