'use client';

import { useMemo } from 'react';

// Tajweed rules with their colors
const TAJWEED_RULES = {
  // Noon Sakinah & Tanween
  IDGHAM: { color: '#D4A017', name: 'إدغام', nameEn: 'Idgham' },
  IDHAR: { color: '#00AA00', name: 'إظهار', nameEn: 'Idhar' },
  IQHAB: { color: '#808080', name: 'إخفاء', nameEn: 'Ikhfa' },
  IQLAB: { color: '#FF6B6B', name: 'إقلاب', nameEn: 'Iqlab' },
  
  // Meem Sakinah
  MEEM_IDGHAM: { color: '#9B59B6', name: 'إدغام الميم', nameEn: 'Meem Idgham' },
  MEEM_IDHAR: { color: '#27AE60', name: 'إظهار الميم', nameEn: 'Meem Idhar' },
  MEEM_IKHFA: { color: '#7F8C8D', name: 'إخفاء الميم', nameEn: 'Meem Ikhfa' },
  
  // Noon & Meem Mushaddad
  GHANNA: { color: '#E74C3C', name: 'غنة', nameEn: 'Ghunnah' },
  
  // Qalqalah
  QALQALAH: { color: '#3498DB', name: 'قلقة', nameEn: 'Qalqalah' },
  
  // Madd
  MADD_WAJIB: { color: '#8E44AD', name: 'مد واجب', nameEn: 'Obligatory Madd' },
  MADD_JAIZ: { color: '#9B59B6', name: 'مد جائز', nameEn: 'Permissible Madd' },
  MADD_ARID: { color: '#A569BD', name: 'مد عارض', nameEn: 'Arid Madd' },
  MADD_LAZIM: { color: '#6C3483', name: 'مد لازم', nameEn: 'Necessary Madd' },
  
  // Other rules
  MADD: { color: '#A569BD', name: 'مد', nameEn: 'Madd' },
  HAMZA: { color: '#F39C12', name: 'همزة', nameEn: 'Hamza' },
  SAKTA: { color: '#1ABC9C', name: 'سكتة', nameEn: 'Saktah' },
};

interface TajweedToken {
  text: string;
  rule: keyof typeof TAJWEED_RULES | null;
}

// Parse tajweed notation from text
// Format: [rule:text] or plain text
function parseTajweedText(text: string): TajweedToken[] {
  const tokens: TajweedToken[] = [];
  const regex = /\[([A-Z_]+):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText) {
        tokens.push({ text: plainText, rule: null });
      }
    }

    // Add the tajweed marked text
    const ruleKey = match[1] as keyof typeof TAJWEED_RULES;
    tokens.push({
      text: match[2],
      rule: TAJWEED_RULES[ruleKey] ? ruleKey : null,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining plain text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      tokens.push({ text: remainingText, rule: null });
    }
  }

  // If no tajweed markers found, return the whole text
  if (tokens.length === 0 && text) {
    tokens.push({ text, rule: null });
  }

  return tokens;
}

interface TajweedVerseProps {
  text: string;
  showTajweed?: boolean;
  verseNumber?: number;
}

// Arabic numeral converter
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

export function TajweedVerse({ text, showTajweed = false, verseNumber }: TajweedVerseProps) {
  const tokens = useMemo(() => parseTajweedText(text), [text]);

  if (!showTajweed) {
    return (
      <span>
        {text}
        {verseNumber !== undefined && (
          <span className="inline-flex items-center justify-center mx-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            {toArabicNumber(verseNumber)}
          </span>
        )}
      </span>
    );
  }

  return (
    <span>
      {tokens.map((token, index) => {
        if (token.rule && TAJWEED_RULES[token.rule]) {
          const rule = TAJWEED_RULES[token.rule];
          return (
            <span
              key={index}
              style={{ color: rule.color }}
              title={`${rule.name} - ${rule.nameEn}`}
              className="cursor-help"
            >
              {token.text}
            </span>
          );
        }
        return <span key={index}>{token.text}</span>;
      })}
      {verseNumber !== undefined && (
        <span className="inline-flex items-center justify-center mx-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          {toArabicNumber(verseNumber)}
        </span>
      )}
    </span>
  );
}

// Tajweed Legend Component
export function TajweedLegend() {
  const rules = [
    { key: 'GHANNA', label: 'غنة', color: TAJWEED_RULES.GHANNA.color },
    { key: 'QALQALAH', label: 'قلقة', color: TAJWEED_RULES.QALQALAH.color },
    { key: 'IDGHAM', label: 'إدغام', color: TAJWEED_RULES.IDGHAM.color },
    { key: 'IDHAR', label: 'إظهار', color: TAJWEED_RULES.IDHAR.color },
    { key: 'IQHAB', label: 'إخفاء', color: TAJWEED_RULES.IQHAB.color },
    { key: 'IQLAB', label: 'إقلاب', color: TAJWEED_RULES.IQLAB.color },
    { key: 'MADD', label: 'مد', color: TAJWEED_RULES.MADD.color },
    { key: 'MADD_WAJIB', label: 'مد واجب', color: TAJWEED_RULES.MADD_WAJIB.color },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {rules.map((rule) => (
        <div
          key={rule.key}
          className="flex items-center gap-2 px-2 py-1 rounded bg-muted"
        >
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: rule.color }}
          />
          <span className="text-xs">{rule.label}</span>
        </div>
      ))}
    </div>
  );
}

export default TajweedVerse;
