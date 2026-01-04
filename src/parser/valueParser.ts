export type Unit = '%' | 'deg' | 'rad' | 'turn' | null;

export interface Token {
  raw: string;
  value: number;
  unit: Unit;
}

export interface ParsedValue {
  channels: Token[];
  alpha?: Token;
  hasSlashAlpha: boolean;
}

const tokenPattern = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*(%|deg|rad|turn))?$/i;

const tokenize = (text: string): string[] => {
  return text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
};

const parseToken = (raw: string): Token | null => {
  const match = tokenPattern.exec(raw.trim());
  if (!match) return null;

  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;

  const unit = (match[2]?.toLowerCase() as Unit) ?? null;
  return { raw, value, unit };
};

export const parseRawValue = (value: string): ParsedValue | null => {
  const parts = value.split('/');
  if (parts.length > 2) return null;

  const channelText = parts[0] ?? '';
  const channelTokens = tokenize(channelText).map(parseToken);
  if (channelTokens.some((t) => t === null)) return null;

  const channels = channelTokens as Token[];
  if (channels.length < 3) return null;

  let alpha: Token | undefined;
  let hasSlashAlpha = false;

  if (parts.length === 2) {
    hasSlashAlpha = true;
    const alphaTokens = tokenize(parts[1] ?? '').map(parseToken);
    if (alphaTokens.length !== 1 || alphaTokens.some((t) => t === null)) return null;
    alpha = alphaTokens[0] as Token;
  } else if (channels.length === 4) {
    alpha = channels.pop();
  }

  if (channels.length !== 3) return null;

  return {
    channels,
    alpha,
    hasSlashAlpha
  };
};
