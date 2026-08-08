/**
 * WebDeveloper.Locales, backed by lib/i18n.
 *
 * 465 legacy call sites pass a plain string, so this side of the boundary
 * stays unchecked -- typing it would only move the cast, since the argument
 * is not a literal at most of them. New code imports t() from lib/i18n and
 * gets the key checked, and the substitution required where the message needs
 * one.
 *
 * This file disappears with the last legacy consumer.
 */

import { WebDeveloper } from "../globals";
import { generatedLocale, tUnchecked } from "@/lib/i18n";

WebDeveloper.Locales = WebDeveloper.Locales || {};

WebDeveloper.Locales.getString = function (name: string): string {
  return tUnchecked(name);
};

WebDeveloper.Locales.getFormattedString = function (
  name: string,
  parameters: string | string[],
): string {
  return tUnchecked(name, parameters);
};

WebDeveloper.Locales.setupGeneratedLocale = generatedLocale;
