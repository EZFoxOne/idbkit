/**
 * Error codes for DatabaseManager errors
 */
export const ErrorCodes = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CONSTRAINT_ERR: 'CONSTRAINT_ERR',
  VERSION_ERR: 'VERSION_ERR',
  BLOCKED: 'BLOCKED',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  INVALID_KEY: 'INVALID_KEY',
  INVALID_VALUE: 'INVALID_VALUE',
};

const DOMExceptionToCode = {
  QuotaExceededError: ErrorCodes.QUOTA_EXCEEDED,
  ConstraintError: ErrorCodes.CONSTRAINT_ERR,
  VersionError: ErrorCodes.VERSION_ERR,
  NotFoundError: ErrorCodes.NOT_FOUND,
  UnknownError: ErrorCodes.UNKNOWN,
};

/**
 * Wraps DOMException or Error with a DatabaseManagerError
 * @param {string} message - Human-readable message
 * @param {DOMException|Error} cause - Original error
 * @returns {DatabaseManagerError}
 */
export function wrapError(message, cause) {
  const code = cause?.name && DOMExceptionToCode[cause.name]
    ? DOMExceptionToCode[cause.name]
    : ErrorCodes.UNKNOWN;
  return new DatabaseManagerError(message, code, cause);
}

/**
 * DatabaseManagerError - typed error with code and cause
 */
export class DatabaseManagerError extends Error {
  /**
   * @param {string} message
   * @param {string} code - One of ErrorCodes
   * @param {Error|DOMException} [cause]
   */
  constructor(message, code = ErrorCodes.UNKNOWN, cause = null) {
    super(message);
    this.name = 'DatabaseManagerError';
    this.code = code;
    this.cause = cause;
  }
}
