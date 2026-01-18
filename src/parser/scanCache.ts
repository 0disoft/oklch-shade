import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { scanDocument, type Candidate, type ScanOptions } from './cssScanner';

type CacheEntry = {
  version: number;
  candidates: Candidate[];
  customPropertyMap?: Map<string, Candidate>;
};

const cache = new Map<string, Map<string, CacheEntry>>();

const normalizeScanOptions = (options?: ScanOptions) => ({
  respectColorDirectives: options?.respectColorDirectives ?? true,
  respectConvertDirectives: options?.respectConvertDirectives ?? false
});

const buildOptionsKey = (
  document: vscode.TextDocument,
  config: ExtensionConfig,
  options?: ScanOptions
): string => {
  const normalized = normalizeScanOptions(options);
  return [
    document.languageId,
    config.scanScope,
    `color:${String(normalized.respectColorDirectives)}`,
    `convert:${String(normalized.respectConvertDirectives)}`
  ].join('|');
};

const getCacheEntry = (
  document: vscode.TextDocument,
  config: ExtensionConfig,
  options?: ScanOptions
): CacheEntry => {
  const uriKey = document.uri.toString();
  const optionsKey = buildOptionsKey(document, config, options);
  const normalized = normalizeScanOptions(options);

  let docCache = cache.get(uriKey);
  if (!docCache) {
    docCache = new Map<string, CacheEntry>();
    cache.set(uriKey, docCache);
  }

  const cached = docCache.get(optionsKey);
  if (cached && cached.version === document.version) {
    return cached;
  }

  const candidates = scanDocument(document, config, normalized);
  const entry: CacheEntry = { version: document.version, candidates };
  docCache.set(optionsKey, entry);
  return entry;
};

export const getScanCandidates = (
  document: vscode.TextDocument,
  config: ExtensionConfig,
  options?: ScanOptions
): Candidate[] => {
  return getCacheEntry(document, config, options).candidates;
};

export const getCustomPropertyMap = (
  document: vscode.TextDocument,
  config: ExtensionConfig,
  options?: ScanOptions
): Map<string, Candidate> => {
  const entry = getCacheEntry(document, config, options);
  if (entry.customPropertyMap) {
    return entry.customPropertyMap;
  }

  const map = new Map<string, Candidate>();
  for (const candidate of entry.candidates) {
    if (candidate.propertyName.startsWith('--')) {
      map.set(candidate.propertyName, candidate);
    }
  }

  entry.customPropertyMap = map;
  return map;
};

export const clearScanCache = (): void => {
  cache.clear();
};

export const clearScanCacheForUri = (uri: vscode.Uri): void => {
  cache.delete(uri.toString());
};
