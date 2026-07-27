/**
 * Sammelstelle aller mitgelieferten Vorlagen.
 *
 * Die Vorlagen werden hier normalisiert und als `readOnly` markiert: Sie
 * lassen sich im Editor duplizieren und ueberschreiben, das Original bleibt
 * jedoch jederzeit wiederherstellbar.
 */

import { normaliseTemplate } from '../../core/schema.js';
import koronar from './koronar.js';
import rhythmologie from './rhythmologie.js';
import devices from './devices.js';
import klappen from './klappen.js';
import herzkreislauf from './herzkreislauf.js';
import pneumologie from './pneumologie.js';
import allgemein from './allgemein.js';

const RAW_TEMPLATES = [
  ...koronar,
  ...rhythmologie,
  ...devices,
  ...klappen,
  ...herzkreislauf,
  ...pneumologie,
  ...allgemein,
];

export const BUILTIN_TEMPLATES = RAW_TEMPLATES.map((template) => normaliseTemplate({ ...template, readOnly: true }));

export const BUILTIN_IDS = new Set(BUILTIN_TEMPLATES.map((template) => template.id));

export default BUILTIN_TEMPLATES;
