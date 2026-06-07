// =====================================================================
// src/utils/errors.ts
//
// 自定义错误类，便于上层 catch 时区分失败原因。
// =====================================================================

/** 基础错误类，所有 local-llm-doctor 错误都继承自此 */
export class LlmDoctorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // 保留 V8 stack trace
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 硬件检测失败错误
 *
 * @example
 *   try {
 *     await detectCpu();
 *   } catch (e) {
 *     throw new DetectionError('cpu', e);
 *   }
 */
export class DetectionError extends LlmDoctorError {
  constructor(
    /** 失败的检测器名：'cpu' | 'memory' | 'disk' | 'os' | 'gpu' */
    public readonly detector: string,
    /** 原始错误 */
    public readonly cause: unknown,
  ) {
    super(`Hardware detection failed [${detector}]: ${
      cause instanceof Error ? cause.message : String(cause)
    }`);
  }
}

/** 配置/参数错误 */
export class ConfigError extends LlmDoctorError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
  }
}

/** 模型表里找不到指定 ID */
export class ModelNotFoundError extends LlmDoctorError {
  constructor(modelId: string) {
    super(`Model not found in table: ${modelId}`);
  }
}

/** 格式化错误 */
export class FormatError extends LlmDoctorError {
  constructor(formatType: string, cause: unknown) {
    super(`Failed to format [${formatType}]: ${
      cause instanceof Error ? cause.message : String(cause)
    }`);
  }
}
