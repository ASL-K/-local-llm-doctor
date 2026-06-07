// =====================================================================
// tests/fixtures.test.ts
//
// 测试 hardware-profiles.ts 的 fixture 完整性。
// 目的：防止"哪个字段没填"导致下游代码崩。
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  lowEnd,
  gaming,
  workstation,
  appleSilicon,
  wslUser,
  cpuOnly,
  allProfiles,
} from './fixtures/hardware-profiles.js';
import type { HardwareProfile } from '../src/types.js';

function assertValidProfile(p: HardwareProfile, name: string): void {
  expect(p.os, `${name}.os`).toBeDefined();
  expect(p.os.platform, `${name}.os.platform`).toMatch(/^(darwin|win32|linux)$/);
  expect(p.cpu, `${name}.cpu`).toBeDefined();
  expect(p.cpu.cores, `${name}.cpu.cores`).toBeGreaterThan(0);
  expect(p.cpu.threads, `${name}.cpu.threads`).toBeGreaterThan(0);
  expect(p.cpu.arch, `${name}.cpu.arch`).toMatch(/^(x86_64|arm64|riscv64)$/);
  expect(p.memory, `${name}.memory`).toBeDefined();
  expect(p.memory.total, `${name}.memory.total`).toBeGreaterThan(0);
  expect(p.memory.available, `${name}.memory.available`).toBeGreaterThan(0);
  expect(p.memory.available, `${name}.memory.available <= total`).toBeLessThanOrEqual(
    p.memory.total,
  );
  expect(p.disk, `${name}.disk`).toBeDefined();
  expect(p.disk.total, `${name}.disk.total`).toBeGreaterThan(0);
  expect(p.disk.available, `${name}.disk.available`).toBeGreaterThan(0);
  expect(Array.isArray(p.gpu), `${name}.gpu is array`).toBe(true);
}

describe('hardware profiles fixtures', () => {
  it('lowEnd is a valid 5.64GB profile (the README star story)', () => {
    expect(lowEnd.memory.available).toBeCloseTo(5.64, 2);
    assertValidProfile(lowEnd, 'lowEnd');
  });

  it('gaming profile (RTX 3060 12GB) is valid', () => {
    expect(gaming.gpu[0]?.vram).toBe(12);
    expect(gaming.gpu[0]?.vendor).toBe('nvidia');
    assertValidProfile(gaming, 'gaming');
  });

  it('workstation profile (RTX 4090 24GB) is valid', () => {
    expect(workstation.gpu[0]?.vram).toBe(24);
    assertValidProfile(workstation, 'workstation');
  });

  it('appleSilicon profile (M3 Pro) is valid', () => {
    expect(appleSilicon.cpu.arch).toBe('arm64');
    expect(appleSilicon.gpu[0]?.vendor).toBe('apple');
    expect(appleSilicon.memory.type).toBe('unified');
    assertValidProfile(appleSilicon, 'appleSilicon');
  });

  it('wslUser profile correctly marks WSL2', () => {
    expect(wslUser.os.wsl).toBe(true);
    expect(wslUser.os.wslVersion).toBe('2');
    assertValidProfile(wslUser, 'wslUser');
  });

  it('cpuOnly profile has no GPU (boundary case)', () => {
    expect(cpuOnly.gpu).toEqual([]);
    assertValidProfile(cpuOnly, 'cpuOnly');
  });

  it('all profiles pass validation', () => {
    for (const [name, profile] of Object.entries(allProfiles)) {
      assertValidProfile(profile, name);
    }
  });
});
