/**
 * Unit Tests for Utility Functions
 * 
 * Tests src/lib/utils.ts
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

// =============================================================================
// cn (className merger) Tests
// =============================================================================

describe('cn utility function', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toBe('base visible');
  });

  it('should handle undefined values', () => {
    const result = cn('base', undefined, 'end');
    expect(result).toBe('base end');
  });

  it('should handle null values', () => {
    const result = cn('base', null, 'end');
    expect(result).toBe('base end');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should handle conflicting tailwind classes
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('should handle object syntax', () => {
    const result = cn({
      'active': true,
      'disabled': false,
      'primary': true,
    });
    expect(result).toContain('active');
    expect(result).toContain('primary');
    expect(result).not.toContain('disabled');
  });

  it('should handle arrays', () => {
    const result = cn(['class1', 'class2']);
    expect(result).toBe('class1 class2');
  });

  it('should handle mixed inputs', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      'end'
    );
    expect(result).toContain('base');
    expect(result).toContain('array-class');
    expect(result).toContain('object-class');
    expect(result).toContain('end');
  });

  it('should return empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('should handle conflicting responsive classes', () => {
    const result = cn('sm:p-2', 'sm:p-4');
    expect(result).toBe('sm:p-4');
  });
});
