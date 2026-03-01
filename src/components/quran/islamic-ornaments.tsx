'use client';

import { cn } from '@/lib/utils';

// Islamic Ornament Patterns
export const IslamicOrnament = ({ className, color = 'gold' }: { className?: string; color?: 'gold' | 'emerald' | 'white' }) => {
  const colors = {
    gold: 'text-amber-500',
    emerald: 'text-emerald-600',
    white: 'text-white',
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('w-full h-full', colors[color], className)}
      fill="currentColor"
    >
      <defs>
        <pattern id="islamic-pattern" patternUnits="userSpaceOnUse" width="100" height="100">
          <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M25 25 L75 25 L75 75 L25 75 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#islamic-pattern)" />
    </svg>
  );
};

// Corner Ornament for Page Frame
export const CornerOrnament = ({ position, isDark }: { position: 'tl' | 'tr' | 'bl' | 'br'; isDark: boolean }) => {
  const rotations = {
    tl: 'rotate-0',
    tr: 'scale-x-[-1]',
    bl: 'scale-y-[-1]',
    br: 'scale-[-1]',
  };

  return (
    <div className={cn('absolute w-24 h-24 pointer-events-none', 
      position === 'tl' && 'top-0 left-0',
      position === 'tr' && 'top-0 right-0',
      position === 'bl' && 'bottom-0 left-0',
      position === 'br' && 'bottom-0 right-0',
      rotations[position],
      isDark ? 'text-amber-500/30' : 'text-emerald-700/20'
    )}>
      <svg viewBox="0 0 100 100" fill="currentColor">
        <path d="M0 0 L100 0 L100 20 Q60 20 40 40 Q20 60 20 100 L0 100 Z" />
        <circle cx="50" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M30 10 Q50 25 70 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

// Decorative Frame for Quran Page
export const QuranFrame = ({ children, isDark }: { children: React.ReactNode; isDark: boolean }) => {
  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden',
      isDark 
        ? 'bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900' 
        : 'bg-gradient-to-br from-amber-50 via-white to-amber-50'
    )}
    style={{
      boxShadow: isDark
        ? '0 0 80px rgba(217, 119, 6, 0.15), inset 0 0 100px rgba(0,0,0,0.3)'
        : '0 0 80px rgba(209, 169, 84, 0.15), inset 0 0 100px rgba(255,255,255,0.5), 0 20px 60px rgba(0,0,0,0.1)',
      border: isDark 
        ? '3px solid rgba(217, 119, 6, 0.3)'
        : '3px solid rgba(209, 169, 84, 0.4)',
    }}
    >
      {/* Corner Ornaments */}
      <CornerOrnament position="tl" isDark={isDark} />
      <CornerOrnament position="tr" isDark={isDark} />
      <CornerOrnament position="bl" isDark={isDark} />
      <CornerOrnament position="br" isDark={isDark} />

      {/* Top Border Ornament */}
      <div className={cn(
        'absolute top-0 left-1/2 -translate-x-1/2 w-48 h-8',
        isDark ? 'text-amber-500/40' : 'text-emerald-700/30'
      )}>
        <svg viewBox="0 0 200 30" fill="currentColor" className="w-full h-full">
          <path d="M0 15 Q25 5 50 15 T100 15 T150 15 T200 15" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="15" r="5" />
          <circle cx="50" cy="15" r="3" />
          <circle cx="150" cy="15" r="3" />
          <path d="M70 15 Q85 5 100 15 Q115 25 130 15" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Bottom Border Ornament */}
      <div className={cn(
        'absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 rotate-180',
        isDark ? 'text-amber-500/40' : 'text-emerald-700/30'
      )}>
        <svg viewBox="0 0 200 30" fill="currentColor" className="w-full h-full">
          <path d="M0 15 Q25 5 50 15 T100 15 T150 15 T200 15" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="15" r="5" />
          <circle cx="50" cy="15" r="3" />
          <circle cx="150" cy="15" r="3" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8">
        {children}
      </div>
    </div>
  );
};

// Surah Header with Ornament
export const LuxuriousSurahHeader = ({ 
  surahName, 
  surahNumber, 
  totalAyahs, 
  revelationType,
  isDark 
}: { 
  surahName: string; 
  surahNumber: number; 
  totalAyahs: number;
  revelationType: string;
  isDark: boolean;
}) => {
  const toArabicNumber = (num: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
  };

  return (
    <div className="text-center py-8">
      {/* Top Ornament */}
      <div className={cn(
        'flex items-center justify-center gap-4 mb-6',
        isDark ? 'text-amber-400' : 'text-emerald-700'
      )}>
        <svg width="120" height="40" viewBox="0 0 120 40" className="opacity-70">
          <defs>
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDark ? '#92400e' : '#065f46'} />
              <stop offset="50%" stopColor={isDark ? '#d97706' : '#059669'} />
              <stop offset="100%" stopColor={isDark ? '#92400e' : '#065f46'} />
            </linearGradient>
          </defs>
          <path d="M0 20 Q30 5 60 20 Q90 35 120 20" fill="none" stroke="url(#gold-gradient)" strokeWidth="2" />
          <circle cx="60" cy="20" r="6" fill="url(#gold-gradient)" />
          <circle cx="30" cy="15" r="3" fill="url(#gold-gradient)" />
          <circle cx="90" cy="15" r="3" fill="url(#gold-gradient)" />
          <path d="M40 20 L50 15 L60 20 L50 25 Z" fill="url(#gold-gradient)" opacity="0.5" />
          <path d="M60 20 L70 15 L80 20 L70 25 Z" fill="url(#gold-gradient)" opacity="0.5" />
        </svg>
        <div className={cn(
          'w-3 h-3 rotate-45',
          isDark ? 'bg-amber-400' : 'bg-emerald-600'
        )} />
        <svg width="120" height="40" viewBox="0 0 120 40" className="opacity-70 scale-x-[-1]">
          <path d="M0 20 Q30 5 60 20 Q90 35 120 20" fill="none" stroke="url(#gold-gradient)" strokeWidth="2" />
          <circle cx="60" cy="20" r="6" fill="url(#gold-gradient)" />
          <circle cx="30" cy="15" r="3" fill="url(#gold-gradient)" />
          <circle cx="90" cy="15" r="3" fill="url(#gold-gradient)" />
          <path d="M40 20 L50 15 L60 20 L50 25 Z" fill="url(#gold-gradient)" opacity="0.5" />
          <path d="M60 20 L70 15 L80 20 L70 25 Z" fill="url(#gold-gradient)" opacity="0.5" />
        </svg>
      </div>

      {/* Surah Name Frame */}
      <div className={cn(
        'inline-block relative px-12 py-5 rounded-2xl',
        isDark 
          ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-2 border-amber-500/40' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-2 border-emerald-300'
      )}
      style={{
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(217, 119, 6, 0.2), 0 0 60px rgba(217, 119, 6, 0.1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 32px rgba(0,0,0,0.08), 0 0 60px rgba(5, 150, 105, 0.1)',
      }}
      >
        {/* Inner glow */}
        <div className={cn(
          'absolute inset-0 rounded-2xl',
          isDark
            ? 'bg-gradient-to-br from-amber-500/10 to-transparent'
            : 'bg-gradient-to-br from-emerald-500/5 to-transparent'
        )} />
        
        {/* Surah Name */}
        <h2 
          className={cn(
            'relative text-4xl font-bold',
            isDark ? 'text-amber-400' : 'text-emerald-800'
          )}
          style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
        >
          {surahName}
        </h2>
      </div>

      {/* Surah Info */}
      <div className={cn(
        'mt-4 flex items-center justify-center gap-4 text-sm',
        isDark ? 'text-slate-400' : 'text-gray-600'
      )}>
        <span className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', isDark ? 'bg-amber-500' : 'bg-emerald-500')} />
          السورة رقم {toArabicNumber(surahNumber)}
        </span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span>{toArabicNumber(totalAyahs)} آية</span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs',
          isDark 
            ? 'bg-amber-500/20 text-amber-400' 
            : 'bg-emerald-100 text-emerald-700'
        )}>
          {revelationType === 'meccan' ? 'مكية' : 'مدنية'}
        </span>
      </div>

      {/* Bottom Ornament */}
      <div className={cn(
        'flex items-center justify-center gap-2 mt-6',
        isDark ? 'text-amber-500/40' : 'text-emerald-600/30'
      )}>
        <div className="w-16 h-px bg-current" />
        <div className={cn('w-2 h-2 rotate-45', isDark ? 'bg-amber-500/60' : 'bg-emerald-600/50')} />
        <div className="w-16 h-px bg-current" />
      </div>
    </div>
  );
};

// Luxurious Bismillah Component
export const LuxuriousBismillah = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="text-center py-10">
      <div 
        className={cn(
          'inline-block relative px-16 py-6 rounded-3xl',
          isDark 
            ? 'bg-gradient-to-r from-slate-800/50 via-amber-900/20 to-slate-800/50 border border-amber-500/30' 
            : 'bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/50 border border-emerald-200'
        )}
        style={{
          boxShadow: isDark
            ? 'inset 0 0 40px rgba(217, 119, 6, 0.1), 0 4px 20px rgba(0,0,0,0.3)'
            : 'inset 0 0 40px rgba(5, 150, 105, 0.05), 0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        {/* Side Ornaments */}
        <div className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2',
          isDark ? 'text-amber-500/50' : 'text-emerald-600/30'
        )}>
          <svg width="30" height="60" viewBox="0 0 30 60" fill="currentColor">
            <path d="M15 0 L30 30 L15 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="15" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 scale-x-[-1]',
          isDark ? 'text-amber-500/50' : 'text-emerald-600/30'
        )}>
          <svg width="30" height="60" viewBox="0 0 30 60" fill="currentColor">
            <path d="M15 0 L30 30 L15 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="15" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* Bismillah Text */}
        <p 
          className={cn(
            'text-4xl font-bold',
            isDark ? 'text-amber-400' : 'text-emerald-700'
          )}
          style={{ 
            fontFamily: "'Scheherazade New', 'Amiri', serif", 
            lineHeight: '2.5',
            textShadow: isDark ? '0 0 20px rgba(217, 119, 6, 0.3)' : '0 0 20px rgba(5, 150, 105, 0.2)'
          }}
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      </div>
    </div>
  );
};

// Luxurious Verse Number - Matching Surah Index Style exactly
export const LuxuriousVerseNumber = ({ 
  number, 
  isDark,
  isSelected = false 
}: { 
  number: number; 
  isDark: boolean;
  isSelected?: boolean;
}) => {
  const toArabicNumber = (num: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
  };

  return (
    <span className="inline-flex items-center justify-center mx-2 relative align-middle">
      {/* Main container - Square like Surah Index */}
      <span 
        className={cn(
          'relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
          'transition-all duration-300 group-hover:scale-105',
          isSelected 
            ? isDark
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/30'
              : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
            : isDark
              ? 'bg-slate-700/80 text-slate-300 border border-amber-500/20'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        )}
        style={{
          boxShadow: isSelected
            ? isDark
              ? '0 0 20px rgba(217, 119, 6, 0.3)'
              : '0 0 20px rgba(5, 150, 105, 0.2)'
            : 'none'
        }}
      >
        <span className="text-sm font-bold">{toArabicNumber(number)}</span>
        {/* Decorative corner */}
        <span className={cn(
          'absolute -top-1 -right-1 w-3 h-3 rotate-45',
          isSelected 
            ? 'bg-white/30' 
            : isDark 
              ? 'bg-amber-500/20' 
              : 'bg-emerald-300/50'
        )} />
      </span>
    </span>
  );
};

// Page Number Component
export const PageNumber = ({ pageNumber, isDark }: { pageNumber: number; isDark: boolean }) => {
  const toArabicNumber = (num: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
  };

  return (
    <div className="text-center py-6">
      <div className={cn(
        'inline-flex items-center gap-3 px-6 py-2 rounded-full',
        isDark 
          ? 'bg-slate-800 border border-amber-500/30' 
          : 'bg-white border border-emerald-200'
      )}
      style={{
        boxShadow: isDark
          ? '0 4px 15px rgba(0,0,0,0.3)'
          : '0 4px 15px rgba(0,0,0,0.05)'
      }}
      >
        <div className={cn(
          'w-8 h-px',
          isDark ? 'bg-amber-500/50' : 'bg-emerald-300'
        )} />
        <span className={cn(
          'text-lg font-bold',
          isDark ? 'text-amber-400' : 'text-emerald-700'
        )}>
          {toArabicNumber(pageNumber)}
        </span>
        <div className={cn(
          'w-8 h-px',
          isDark ? 'bg-amber-500/50' : 'bg-emerald-300'
        )} />
      </div>
    </div>
  );
};

export default IslamicOrnament;
