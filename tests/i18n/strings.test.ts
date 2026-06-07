// =====================================================================
// tests/i18n/strings.test.ts
//
// v0.4.1 i18n 框架测试
// =====================================================================

import { describe, it, expect } from 'vitest';
import { t, detectLang, LANG_LABELS, DEFAULT_LANG, SUPPORTED_LANGS } from '../../src/i18n/strings.js';

describe('t() — translate with variable replacement', () => {
  it('returns Chinese by default', () => {
    expect(t('appName', 'zh')).toBe('local-llm-doctor');
    expect(t('title', 'zh')).toBe('我电脑能跑哪个 LLM？');
  });

  it('returns English when lang=en', () => {
    expect(t('title', 'en')).toBe('Which LLM runs on my computer?');
    expect(t('appName', 'en')).toBe('local-llm-doctor');
  });

  it('replaces {var} placeholders', () => {
    expect(t('status.detectDone', 'zh', { ms: 234 })).toBe('硬件检测完成（234ms）');
    expect(t('status.detectDone', 'en', { ms: 234 })).toBe('Hardware detected (234ms)');
  });

  it('returns [missing:key] for unknown keys', () => {
    expect(t('not.a.key', 'zh')).toBe('[missing:not.a.key]');
    expect(t('not.a.key', 'en')).toBe('[missing:not.a.key]');
  });

  it('keeps {var} placeholders for missing params', () => {
    expect(t('status.detectDone', 'zh', {})).toBe('硬件检测完成（{ms}ms）');
  });

  it('tier names translate correctly', () => {
    expect(t('tier.conservative', 'zh')).toBe('保守档');
    expect(t('tier.conservative', 'en')).toBe('Conservative');
    expect(t('tier.balanced', 'en')).toBe('Balanced');
    expect(t('tier.aggressive', 'en')).toBe('Aggressive');
  });

  it('fitLevel badges translate', () => {
    expect(t('fit.perfect', 'zh')).toContain('完美');
    expect(t('fit.perfect', 'en')).toContain('perfect');
    expect(t('fit.comfortable', 'en')).toContain('comfortable');
    expect(t('fit.tight', 'en')).toContain('tight');
  });

  it('fallback 3 branches translate', () => {
    // 盈余
    expect(t('fallback.surplus', 'zh', { need: 3, have: '3.9', gap: '0.9' })).toContain('盈余');
    expect(t('fallback.surplus', 'en', { need: 3, have: '3.9', gap: '0.9' })).toContain('surplus');
    // 刚好
    expect(t('fallback.just_enough', 'zh', { need: 3, have: '3.0' })).toContain('刚好够');
    expect(t('fallback.just_enough', 'en', { need: 3, have: '3.0' })).toContain('just enough');
    // 还差
    expect(t('fallback.short', 'zh', { need: 8, have: '3.9', gap: '4.1' })).toContain('还差');
    expect(t('fallback.short', 'en', { need: 8, have: '3.9', gap: '4.1' })).toContain('short');
  });

  it('hardware line translate', () => {
    expect(t('hw.cpu', 'zh', { brand: 'i5', cores: 16, threads: 24, arch: 'x86_64' })).toContain('i5');
    expect(t('hw.cpu', 'en', { brand: 'i5', cores: 16, threads: 24, arch: 'x86_64' })).toContain('16c');
  });
});

describe('detectLang()', () => {
  it('returns zh when LANG is empty', () => {
    const old = process.env.LANG;
    delete process.env.LANG;
    delete process.env.LC_ALL;
    expect(detectLang()).toBe('zh');
    if (old) process.env.LANG = old;
  });

  it('returns en when LANG starts with en', () => {
    const old = process.env.LANG;
    process.env.LANG = 'en_US.UTF-8';
    expect(detectLang()).toBe('en');
    if (old) process.env.LANG = old;
  });
});

describe('i18n metadata', () => {
  it('DEFAULT_LANG is zh', () => {
    expect(DEFAULT_LANG).toBe('zh');
  });

  it('SUPPORTED_LANGS has zh and en', () => {
    expect(SUPPORTED_LANGS).toContain('zh');
    expect(SUPPORTED_LANGS).toContain('en');
  });

  it('LANG_LABELS has both languages', () => {
    expect(LANG_LABELS.zh).toBe('中文');
    expect(LANG_LABELS.en).toBe('English');
  });
});
