// =====================================================================
// tests/detect/os.test.ts
//
// 测试 src/detect/os.ts
// 重点测 WSL 检测（项目核心卖点）
// =====================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { platform } from 'node:os';

vi.mock('systeminformation', () => ({
  default: {
    osInfo: vi.fn(),
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    platform: vi.fn(),
  };
});

import si from 'systeminformation';
import { detectOs } from '../../src/detect/os.js';
import { DetectionError } from '../../src/utils/errors.js';

describe('detectOs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Linux platforms', () => {
    it('detects native Ubuntu (not WSL)', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        'Linux version 5.15.0-78-generic (buildd@lcy02-amd64-007)'
      );
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'linux',
        distro: 'Ubuntu 22.04',
        release: '5.15.0',
        codename: 'jammy',
        kernel: '5.15.0',
        arch: 'x64',
        hostname: 'myhost',
        fqdn: 'myhost.local',
        codepage: 'UTF-8',
        logofile: 'ubuntu',
        build: '',
        servicepack: '',
      });

      const os = await detectOs();

      expect(os.platform).toBe('linux');
      expect(os.distro).toBe('Ubuntu 22.04');
      expect(os.wsl).toBe(false);
      expect(os.wslVersion).toBe(null);
    });

    it('detects WSL 2 (the README star story!)', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        'Linux version 5.15.123.1-microsoft-standard-WSL2 (oe-user@oe-host)'
      );
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'linux',
        distro: 'Ubuntu 22.04',
        release: '5.15.123',
        codename: 'jammy',
        kernel: '5.15.123',
        arch: 'x64',
      });

      const os = await detectOs();

      expect(os.platform).toBe('linux');
      expect(os.distro).toBe('Ubuntu 22.04 (WSL)');
      expect(os.wsl).toBe(true);
      expect(os.wslVersion).toBe('2');
    });

    it('detects WSL 1 (legacy, but still supported)', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        'Linux version 4.4.0-19041-Microsoft (Microsoft@Microsoft.com)'
      );
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'linux',
        distro: 'Ubuntu 18.04',
        release: '4.4.0',
        arch: 'x64',
      });

      const os = await detectOs();

      expect(os.wsl).toBe(true);
      expect(os.wslVersion).toBe('1');
    });

    it('handles /proc/version read failure gracefully', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EACCES'));
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'linux',
        distro: 'Debian 12',
        release: '6.1.0',
        arch: 'x64',
      });

      const os = await detectOs();

      expect(os.wsl).toBe(false);
      expect(os.wslVersion).toBe(null);
      expect(os.distro).toBe('Debian 12');
    });
  });

  describe('macOS', () => {
    it('detects macOS Sonoma (arm64)', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('darwin');
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'Darwin',
        distro: 'Mac OS X',
        release: '23.4.0',
        arch: 'arm64',
      });

      const os = await detectOs();

      expect(os.platform).toBe('darwin');
      expect(os.distro).toBe('macOS 23.4.0');
      expect(os.wsl).toBe(false);
    });
  });

  describe('Windows', () => {
    it('detects Windows 11', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('win32');
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: 'Windows',
        distro: 'Microsoft Windows 11 Pro',
        release: '10.0.22631',
        arch: 'x64',
      });

      const os = await detectOs();

      expect(os.platform).toBe('win32');
      expect(os.distro).toBe('Microsoft Windows 11 Pro');
      expect(os.wsl).toBe(false);
    });
  });

  describe('error handling', () => {
    it('throws DetectionError when systeminformation fails', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValue('Linux version 5.0');
      (si.osInfo as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EACCES'));

      await expect(detectOs()).rejects.toThrow(DetectionError);
    });

    it('throws DetectionError on timeout', async () => {
      (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
      (readFile as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );
      (si.osInfo as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await expect(detectOs()).rejects.toThrow(DetectionError);
    }, 10000);
  });
});
