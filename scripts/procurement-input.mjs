import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

export const DEFAULT_MIN_CHARS = 20;
export function effectiveLength(text = '') {
  return (text.normalize('NFKC').match(/[\p{L}\p{N}]/gu) || []).length;
}
export function runDirectory(root, run) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(run || '')) throw new Error('RUN-ID must contain lowercase letters, numbers and hyphens.');
  return path.join(root, 'data', run);
}
function readable(file, image) {
  try {
    if (!fs.statSync(file).isFile() || fs.statSync(file).size === 0) return false;
    const fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(12);
    try { fs.readSync(fd, header, 0, 12, 0); } finally { fs.closeSync(fd); }
    if (image) return header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
      (header[0] === 255 && header[1] === 216 && header[2] === 255) ||
      /^GIF8[79]a/.test(header.toString('ascii')) ||
      (header.toString('ascii',0,4) === 'RIFF' && header.toString('ascii',8,12) === 'WEBP');
    return ['.pdf','.xlsx','.xls','.docx','.txt','.csv','.md'].includes(path.extname(file).toLowerCase());
  } catch { return false; }
}
export function validateInput(request = {}) {
  const minChars = request.minChars ?? DEFAULT_MIN_CHARS;
  if (!Number.isInteger(minChars) || minChars < 1) throw new Error('minChars must be a positive integer.');
  const description = request.description ?? '';
  const summary = request.attachmentSummary ?? '';
  const images = request.images ?? [], files = request.files ?? [];
  if (typeof description !== 'string' || typeof summary !== 'string' || !Array.isArray(images) || !Array.isArray(files) ||
      [...images,...files].some(f => typeof f !== 'string')) throw new Error('Invalid request field types.');
  const invalidFiles = [...images.filter(f => !readable(f,true)), ...files.filter(f => !readable(f,false))];
  const chars = effectiveLength(description);
  const hasText = chars >= minChars;
  const hasImage = images.length > 0 && images.every(f => readable(f,true));
  const hasFile = files.length > 0 && files.every(f => readable(f,false));
  const reviewedFile = hasFile && effectiveLength(summary) >= minChars;
  const ready = invalidFiles.length === 0 && (hasText || hasImage || reviewedFile);
  const needsReview = !ready && invalidFiles.length === 0 && hasFile;
  const status = ready ? 'ready' : needsReview ? 'needs_attachment_review' : 'needs_input';
  const prompt = invalidFiles.length ? '附件無法讀取、為空或格式不支援。請重新上傳圖片或產品規格檔案。' :
    needsReview ? '已收到附件，請先讀取並整理產品描述或擷取參考圖，再開始搜尋。' :
    ready ? null : `請上傳至少一張產品參考圖或規格檔案，或輸入至少 ${minChars} 個有效字元的產品描述（不計空白、標點與表情符號；目前 ${chars} 字）。可描述產品類型、用途、材質、尺寸或預算；未知項目可省略。`;
  return {status, ready, mode: hasImage ? (hasText || reviewedFile ? 'image_and_text' : 'image_only') : reviewedFile ? 'attachment' : hasText ? 'text_only' : null,
    descriptionChars: chars, minChars, invalidFiles, prompt};
}
function main() {
  const {values, positionals} = parseArgs({allowPositionals:true, options:{
    description:{type:'string'}, image:{type:'string',multiple:true}, file:{type:'string',multiple:true},
    'attachment-summary':{type:'string'}, 'min-chars':{type:'string'}, help:{type:'boolean'}
  }});
  if (values.help) { console.log('node scripts/procurement-input.mjs RUN-ID [--description TEXT] [--image PATH] [--file PATH] [--attachment-summary TEXT] [--min-chars 20]'); return; }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dest = runDirectory(root, positionals[0]);
  const request = {description:values.description || '', images:(values.image || []).map(p=>path.resolve(p)),
    files:(values.file || []).map(p=>path.resolve(p)), attachmentSummary:values['attachment-summary'] || '',
    minChars:values['min-chars'] === undefined ? DEFAULT_MIN_CHARS : Number(values['min-chars'])};
  const assessment = validateInput(request);
  fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'intake.json'),JSON.stringify({request,assessment},null,2));
  console.log(JSON.stringify(assessment,null,2));
  if (!assessment.ready) process.exitCode = 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode=1; }
}
