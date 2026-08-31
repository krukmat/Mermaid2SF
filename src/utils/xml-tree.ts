export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function findTagEnd(xml: string, start: number): number {
  let quote: string | undefined;
  for (let index = start; index < xml.length; index += 1) {
    const char = xml[index];
    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '>') return index;
  }
  throw new Error('Malformed XML: unterminated tag');
}

function parseOpenTag(source: string): { name: string; attributes: Record<string, string>; selfClosing: boolean } {
  const trimmed = source.trim();
  const selfClosing = trimmed.endsWith('/');
  const body = selfClosing ? trimmed.slice(0, -1).trim() : trimmed;
  const nameMatch = body.match(/^([^\s/>]+)/);
  if (!nameMatch) throw new Error(`Malformed XML tag: <${source}>`);
  const name = nameMatch[1];
  const attributes: Record<string, string> = {};
  const remainder = body.slice(name.length);
  const attributePattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(remainder)) !== null) {
    attributes[match[1]] = decodeXml(match[3] ?? match[4] ?? '');
  }
  return { name, attributes, selfClosing };
}

export function parseXmlTree(xml: string): XmlNode {
  const stack: XmlNode[] = [];
  let root: XmlNode | undefined;
  let index = 0;

  while (index < xml.length) {
    const open = xml.indexOf('<', index);
    if (open < 0) {
      if (stack.length > 0) stack[stack.length - 1].text += decodeXml(xml.slice(index));
      break;
    }

    if (open > index && stack.length > 0) {
      stack[stack.length - 1].text += decodeXml(xml.slice(index, open));
    }

    if (xml.startsWith('<!--', open)) {
      const close = xml.indexOf('-->', open + 4);
      if (close < 0) throw new Error('Malformed XML: unterminated comment');
      index = close + 3;
      continue;
    }
    if (xml.startsWith('<?', open)) {
      const close = xml.indexOf('?>', open + 2);
      if (close < 0) throw new Error('Malformed XML: unterminated processing instruction');
      index = close + 2;
      continue;
    }
    if (xml.startsWith('<![CDATA[', open)) {
      const close = xml.indexOf(']]>', open + 9);
      if (close < 0) throw new Error('Malformed XML: unterminated CDATA');
      if (stack.length > 0) stack[stack.length - 1].text += xml.slice(open + 9, close);
      index = close + 3;
      continue;
    }
    if (xml.startsWith('<!', open)) {
      const close = findTagEnd(xml, open + 2);
      index = close + 1;
      continue;
    }

    const close = findTagEnd(xml, open + 1);
    const tag = xml.slice(open + 1, close);
    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      const node = stack.pop();
      if (!node || node.name !== name) {
        throw new Error(`Malformed XML: expected closing </${node?.name || '?'}> but found </${name}>`);
      }
    } else {
      const parsed = parseOpenTag(tag);
      const node: XmlNode = {
        name: parsed.name,
        attributes: parsed.attributes,
        children: [],
        text: '',
      };
      if (stack.length > 0) stack[stack.length - 1].children.push(node);
      else if (!root) root = node;
      else throw new Error('Malformed XML: multiple root elements');
      if (!parsed.selfClosing) stack.push(node);
    }
    index = close + 1;
  }

  if (stack.length > 0) throw new Error(`Malformed XML: unclosed <${stack[stack.length - 1].name}>`);
  if (!root) throw new Error('Malformed XML: missing root element');
  return root;
}

export function xmlChildren(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((child) => child.name === name);
}

export function xmlChild(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((child) => child.name === name);
}

export function xmlText(node: XmlNode | undefined): string | undefined {
  if (!node) return undefined;
  const value = node.text.trim();
  return value.length > 0 ? value : undefined;
}

export function xmlChildText(node: XmlNode, name: string): string | undefined {
  return xmlText(xmlChild(node, name));
}

export interface CanonicalXmlNode {
  name: string;
  attributes?: Record<string, string>;
  text?: string;
  children?: CanonicalXmlNode[];
}

export function canonicalizeXmlNode(node: XmlNode): CanonicalXmlNode {
  const attributes = Object.keys(node.attributes)
    .sort()
    .reduce<Record<string, string>>((result, key) => {
      result[key] = node.attributes[key];
      return result;
    }, {});
  const text = node.text.trim();
  return {
    name: node.name,
    ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    ...(text ? { text } : {}),
    ...(node.children.length > 0 ? { children: node.children.map(canonicalizeXmlNode) } : {}),
  };
}

export function canonicalizeXml(xml: string): CanonicalXmlNode {
  return canonicalizeXmlNode(parseXmlTree(xml));
}
