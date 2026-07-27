/**
 * Zerlegt einen Vorlagentext in einen Syntaxbaum.
 *
 * Unterstuetzte Konstrukte:
 *   {{ feld }}                       Platzhalter
 *   {{ feld | date }}                Platzhalter mit Filterkette
 *   {{ feld | num:2 }}               Filter mit Argument
 *   {{#if ausdruck}} … {{/if}}
 *   {{#if a}} … {{#elseif b}} … {{#else}} … {{/if}}
 *   {{#unless ausdruck}} … {{/unless}}
 *   {{#each liste}} … {{/each}}      Kontext: this, @index, @number, @first, @last
 *   {{#each liste as eintrag}} … {{/each}}
 *   {{! Kommentar }}                 erscheint nicht in der Ausgabe
 *
 * Der Parser ist tolerant: Ein unbekanntes oder unvollstaendiges Konstrukt
 * wird als Fehler gemeldet, der restliche Text aber weiter verarbeitet.
 */

const TAG_PATTERN = /\{\{([\s\S]*?)\}\}/g;

/**
 * Zeilen, die ausschliesslich Block- oder Kommentar-Tags enthalten
 * ({{#if}}, {{#else}}, {{/if}}, {{#each}}, {{!…}}), sind reine Struktur und
 * duerfen keinen Zeilenumbruch erzeugen. Ohne diese Regel hinterlaesst jeder
 * nicht erfuellte optionale Absatz eine Leerzeile im Brief.
 *
 * Platzhalter wie {{p2y12}} sind davon ausgenommen – sie erzeugen Inhalt.
 */
const STANDALONE_BLOCK_LINE = /^[ \t]*((?:\{\{[#/!][^{}]*\}\}[ \t]*)+)\r?\n/gm;

function stripStandaloneBlockLines(source) {
  return source.replace(STANDALONE_BLOCK_LINE, '$1');
}

class TemplateSyntaxError extends Error {}

/**
 * @returns {{ nodes: Array, errors: Array<string> }}
 */
export function parseTemplate(source) {
  const text = stripStandaloneBlockLines(String(source ?? '').replace(/\r\n?/g, '\n'));
  const errors = [];
  const root = { type: 'root', children: [] };
  const stack = [root];
  let lastIndex = 0;
  let match;

  const currentChildren = () => stack[stack.length - 1].children;

  const pushText = (value) => {
    if (value === '') return;
    const children = currentChildren();
    const previous = children[children.length - 1];
    if (previous && previous.type === 'text') previous.value += value;
    else children.push({ type: 'text', value });
  };

  TAG_PATTERN.lastIndex = 0;
  while ((match = TAG_PATTERN.exec(text)) !== null) {
    pushText(text.slice(lastIndex, match.index));
    lastIndex = TAG_PATTERN.lastIndex;

    const raw = match[1].trim();
    if (raw === '') continue;

    try {
      handleTag(raw, stack, errors);
    } catch (error) {
      errors.push(error.message);
      // Unverstandenes Tag bleibt sichtbar, damit der Fehler im Brief auffaellt
      // statt still Inhalt zu verschlucken.
      pushText(match[0]);
    }
  }
  pushText(text.slice(lastIndex));

  while (stack.length > 1) {
    const unclosed = stack.pop();
    errors.push(`Nicht geschlossener Block {{#${unclosed.type}}}`);
  }

  return { nodes: root.children, errors };
}

function handleTag(raw, stack, errors) {
  const currentChildren = () => stack[stack.length - 1].children;

  if (raw.startsWith('!')) return; // Kommentar

  if (raw.startsWith('/')) {
    const name = raw.slice(1).trim().toLowerCase();
    const open = stack[stack.length - 1];
    if (stack.length === 1) throw new TemplateSyntaxError(`Schliessendes {{/${name}}} ohne oeffnenden Block`);
    if (open.type !== name) {
      throw new TemplateSyntaxError(`{{/${name}}} schliesst nicht den offenen Block {{#${open.type}}}`);
    }
    stack.pop();
    return;
  }

  if (raw.startsWith('#')) {
    const body = raw.slice(1).trim();
    const [keywordRaw, ...restParts] = body.split(/\s+/);
    const keyword = keywordRaw.toLowerCase();
    const rest = restParts.join(' ').trim();

    if (keyword === 'if') {
      if (!rest) throw new TemplateSyntaxError('{{#if}} ohne Bedingung');
      const node = { type: 'if', branches: [{ condition: rest, children: [] }], children: null };
      currentChildren().push(node);
      stack.push(makeBranchFrame(node));
      return;
    }

    if (keyword === 'elseif' || keyword === 'elsif') {
      const frame = stack[stack.length - 1];
      if (!frame.owner || frame.owner.type !== 'if') throw new TemplateSyntaxError('{{#elseif}} ausserhalb von {{#if}}');
      if (!rest) throw new TemplateSyntaxError('{{#elseif}} ohne Bedingung');
      frame.owner.branches.push({ condition: rest, children: [] });
      frame.children = frame.owner.branches[frame.owner.branches.length - 1].children;
      return;
    }

    if (keyword === 'else') {
      const frame = stack[stack.length - 1];
      if (!frame.owner || frame.owner.type !== 'if') throw new TemplateSyntaxError('{{#else}} ausserhalb von {{#if}}');
      frame.owner.branches.push({ condition: null, children: [] });
      frame.children = frame.owner.branches[frame.owner.branches.length - 1].children;
      return;
    }

    if (keyword === 'unless') {
      if (!rest) throw new TemplateSyntaxError('{{#unless}} ohne Bedingung');
      const node = { type: 'unless', condition: rest, children: [] };
      currentChildren().push(node);
      stack.push(node);
      return;
    }

    if (keyword === 'each') {
      if (!rest) throw new TemplateSyntaxError('{{#each}} ohne Liste');
      const aliasMatch = /^(.*?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(rest);
      const node = {
        type: 'each',
        path: (aliasMatch ? aliasMatch[1] : rest).trim(),
        alias: aliasMatch ? aliasMatch[2] : null,
        children: [],
      };
      currentChildren().push(node);
      stack.push(node);
      return;
    }

    throw new TemplateSyntaxError(`Unbekannter Block {{#${keyword}}}`);
  }

  currentChildren().push(parseVariable(raw));
}

/**
 * Das if-Element speichert seine Zweige separat; der Stack braucht trotzdem
 * ein Objekt mit `children`. Der Rahmen zeigt jeweils auf den gerade offenen
 * Zweig und wird von {{#elseif}}/{{#else}} umgehaengt.
 */
function makeBranchFrame(ifNode) {
  return { type: 'if', owner: ifNode, children: ifNode.branches[0].children };
}

function parseVariable(raw) {
  const parts = splitTopLevel(raw, '|');
  const path = parts.shift().trim();
  if (!path) throw new TemplateSyntaxError('Platzhalter ohne Feldnamen');
  if (!/^[@A-Za-z_][A-Za-z0-9_.[\]]*$/.test(path)) {
    throw new TemplateSyntaxError(`Ungueltiger Feldname "${path}"`);
  }
  const filters = parts.map((part) => {
    const trimmed = part.trim();
    const colon = trimmed.indexOf(':');
    if (colon === -1) return { name: trimmed, args: [] };
    const name = trimmed.slice(0, colon).trim();
    const args = splitTopLevel(trimmed.slice(colon + 1), ',').map((argument) => stripQuotes(argument.trim()));
    return { name, args };
  });
  return { type: 'var', path, filters };
}

/** Trennt an `separator`, ignoriert dabei Anfuehrungszeichen. */
function splitTopLevel(source, separator) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === separator) { parts.push(current); current = ''; continue; }
    current += char;
  }
  parts.push(current);
  return parts;
}

function stripQuotes(value) {
  if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function rootSegment(path) {
  return String(path).split('.')[0].split('[')[0];
}

/**
 * Alle im Vorlagentext referenzierten Feldnamen (Wurzelsegment).
 * Schleifenvariablen (`this`, `@index`, `{{#each … as eintrag}}`) zaehlen
 * nicht als Feld, damit die Validierung sie nicht als unbekannt meldet.
 */
export function collectTemplatePaths(nodes, collected = new Set(), scopeAliases = new Set()) {
  const isLocal = (root) => root.startsWith('@') || root === 'this' || scopeAliases.has(root);

  for (const node of nodes || []) {
    if (node.type === 'var') {
      const root = rootSegment(node.path);
      if (!isLocal(root)) collected.add(root);
    } else if (node.type === 'if') {
      // Bedingungen werden von collectConditions/collectExpressionPaths geprueft.
      for (const branch of node.branches) collectTemplatePaths(branch.children, collected, scopeAliases);
    } else if (node.type === 'each') {
      const root = rootSegment(node.path);
      if (!isLocal(root)) collected.add(root);
      const nestedAliases = new Set(scopeAliases);
      if (node.alias) nestedAliases.add(node.alias);
      collectTemplatePaths(node.children, collected, nestedAliases);
    } else if (node.children) {
      collectTemplatePaths(node.children, collected, scopeAliases);
    }
  }
  return collected;
}

/** Alle Bedingungsausdruecke eines Baums, samt der jeweils gueltigen Aliasse. */
export function collectConditions(nodes, found = [], scopeAliases = new Set()) {
  for (const node of nodes || []) {
    if (node.type === 'if') {
      for (const branch of node.branches) {
        if (branch.condition) found.push({ expression: branch.condition, aliases: new Set(scopeAliases) });
        collectConditions(branch.children, found, scopeAliases);
      }
    } else if (node.type === 'unless') {
      found.push({ expression: node.condition, aliases: new Set(scopeAliases) });
      collectConditions(node.children, found, scopeAliases);
    } else if (node.type === 'each') {
      const nestedAliases = new Set(scopeAliases);
      if (node.alias) nestedAliases.add(node.alias);
      collectConditions(node.children, found, nestedAliases);
    } else if (node.children) {
      collectConditions(node.children, found, scopeAliases);
    }
  }
  return found;
}

export { TemplateSyntaxError };
