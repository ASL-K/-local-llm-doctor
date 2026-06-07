// =====================================================================
// tests/logger.test.ts
//
// 测试 src/utils/logger.ts 的 debug 模式开关
// =====================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setDebug, isDebugMode } from '../src/utils/logger.js';

describe('logger', () => {
  beforeEach(() => {
    setDebug(false);
  });

  afterEach(() => {
    setDebug(false);
  });

  describe('debug mode', () => {
    it('is off by default', () => {
      expect(isDebugMode()).toBe(false);
    });

    it('can be enabled', () => {
      setDebug(true);
      expect(isDebugMode()).toBe(true);
    });

    it('can be disabled', () => {
      setDebug(true);
      setDebug(false);
      expect(isDebugMode()).toBe(false);
    });
  });

  describe('logging output', () => {
    it('debug() does not log when debug off', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      setDebug(false);
      logger.debug('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('debug() logs when debug on', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      setDebug(true);
      logger.debug('test message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('info() always logs', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('info message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('warn() uses console.warn', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('warn message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('error() uses console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('error message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
