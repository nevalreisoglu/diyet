// Minimal .docx text extractor: a .docx is a zip whose word/document.xml holds the text.
// Uses the browser's native DecompressionStream, so no dependency is needed.
const textDecoder = new TextDecoder();
const DOCUMENT_XML = 'word/document.xml';

export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Geçersiz Word (.docx) dosyası.');

  const entryCount = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);

  for (let n = 0; n < entryCount; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = textDecoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    p += 46 + nameLength + extraLength + commentLength;

    if (name !== DOCUMENT_XML) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method !== 0 && method !== 8) throw new Error('Desteklenmeyen Word sıkıştırma biçimi.');
    const xml = textDecoder.decode(method === 0 ? data : await inflateRaw(data));
    return documentXmlToText(xml);
  }

  throw new Error('Word belgesinde metin bulunamadı.');
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');

function documentXmlToText(xml: string): string {
  const parts: string[] = [];
  const tokens = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<\/w:p>\s*<\/w:tc>|<\/w:tr>|<\/w:p>|<w:tab\/>|<w:br\/>/g;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(xml))) {
    const token = match[0];
    if (match[1] !== undefined) parts.push(decodeEntities(match[1]));
    else if (token === '<w:tab/>' || token.endsWith('</w:tc>')) parts.push('\t');
    else parts.push('\n');
  }
  return parts
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
