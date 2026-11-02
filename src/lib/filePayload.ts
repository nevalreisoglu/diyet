export type FilePayload = { fileBase64: string; mimeType: string } | { text: string };

export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.docx,.txt';
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const INLINE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const extensionOf = (file: File) => file.name.split('.').pop()?.toLowerCase() ?? '';

export async function prepareFilePayload(file: File): Promise<FilePayload> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Dosya 8 MB sınırını aşıyor.');
  }

  const ext = extensionOf(file);

  if (INLINE_MIME_TYPES.includes(file.type)) {
    return { fileBase64: await readAsBase64(file), mimeType: file.type };
  }

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const text = workbook.SheetNames
      .map((name) => `# ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`)
      .join('\n\n');
    return { text };
  }

  if (ext === 'docx') {
    const { extractDocxText } = await import('@/lib/docx');
    return { text: await extractDocxText(await file.arrayBuffer()) };
  }

  if (ext === 'txt' || file.type.startsWith('text/')) {
    return { text: await file.text() };
  }

  if (ext === 'doc') {
    throw new Error('Eski Word (.doc) biçimi desteklenmiyor. Dosyayı .docx veya PDF olarak kaydedin.');
  }

  throw new Error('Desteklenmeyen dosya türü. PDF, fotoğraf, Excel, Word veya metin dosyası yükleyin.');
}
