export const colorDirectivePatterns = {
  offFile: /@color\s+off:file\b/i,
  off: /@color\s+off\b/i,
  on: /@color\s+on\b/i
};

export const convertDirectivePatterns = {
  offFile: /@convert\s+off:file\b/i,
  off: /@convert\s+off\b/i,
  on: /@convert\s+on\b/i
};

const spaceHint = /@space\s+([a-z0-9-]+)\b/i;

export const hasColorOffFile = (lineText: string): boolean =>
  colorDirectivePatterns.offFile.test(lineText);

export const hasColorOff = (lineText: string): boolean => colorDirectivePatterns.off.test(lineText);

export const hasColorOn = (lineText: string): boolean => colorDirectivePatterns.on.test(lineText);

export const hasConvertOffFile = (lineText: string): boolean =>
  convertDirectivePatterns.offFile.test(lineText);

export const hasConvertOff = (lineText: string): boolean => convertDirectivePatterns.off.test(lineText);

export const hasConvertOn = (lineText: string): boolean => convertDirectivePatterns.on.test(lineText);

export const extractSpaceHint = (lineText: string): string | null => {
  const match = spaceHint.exec(lineText);
  return match ? match[1].toLowerCase() : null;
};

export const isCommentOnlyLine = (lineText: string): boolean => {
  const trimmed = lineText.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) return true;
  if (trimmed.startsWith('//')) return true;
  return false;
};
