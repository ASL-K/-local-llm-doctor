// =====================================================================
// tests/errors.test.ts
//
// 测试 src/utils/errors.ts 的所有自定义错误类
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  LlmDoctorError,
  DetectionError,
  ConfigError,
  ModelNotFoundError,
  FormatError,
} from '../src/utils/errors.js';

describe('LlmDoctorError', () => {
  it('is an Error subclass', () => {
    const e = new LlmDoctorError('test');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmDoctorError);
  });

  it('preserves the message', () => {
    const e = new LlmDoctorError('something failed');
    expect(e.message).toBe('something failed');
  });

  it('sets name to constructor name', () => {
    const e = new LlmDoctorError('test');
    expect(e.name).toBe('LlmDoctorError');
  });
});

describe('DetectionError', () => {
  it('formats message with detector name', () => {
    const cause = new Error('timeout');
    const e = new DetectionError('cpu', cause);
    expect(e.message).toBe('Hardware detection failed [cpu]: timeout');
    expect(e.detector).toBe('cpu');
    expect(e.cause).toBe(cause);
  });

  it('handles non-Error causes', () => {
    const e = new DetectionError('memory', 'string error');
    expect(e.message).toBe('Hardware detection failed [memory]: string error');
  });

  it('is an LlmDoctorError', () => {
    const e = new DetectionError('disk', new Error('x'));
    expect(e).toBeInstanceOf(LlmDoctorError);
  });
});

describe('ConfigError', () => {
  it('formats message', () => {
    const e = new ConfigError('invalid model id');
    expect(e.message).toBe('Configuration error: invalid model id');
  });
});

describe('ModelNotFoundError', () => {
  it('includes model id', () => {
    const e = new ModelNotFoundError('qwen3-99b');
    expect(e.message).toBe('Model not found in table: qwen3-99b');
  });
});

describe('FormatError', () => {
  it('includes format type', () => {
    const e = new FormatError('json', new Error('unexpected token'));
    expect(e.message).toBe('Failed to format [json]: unexpected token');
  });
});
