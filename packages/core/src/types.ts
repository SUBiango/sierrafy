/** Names of the individual checks the NIN validator performs. */
export type NinCheckName = 'length' | 'charset' | 'checksum' | 'blacklist';

/** Error code reported for the first failing check (see spec precedence). */
export type NinErrorCode =
  | 'INVALID_LENGTH'
  | 'INVALID_CHARSET'
  | 'INVALID_CHECKSUM'
  | 'BLACKLISTED';

/**
 * External, editable rule set driving the validator. Loaded from
 * `schema/nin-format.json` by default. The format was derived from real eID
 * card samples; charset and checksum specifics remain provisional until
 * confirmed with NCRA (Architecture Spec §12.1).
 */
export interface NinFormatSchema {
  /** Schema version, for traceability. */
  version: string;
  /** Human note on provenance / how to edit. */
  description?: string;
  /** Exact total character count (8 on observed cards). */
  length: number;
  /** Anchored regex (source string) of the allowed character set. */
  charset: string;
  /** Optional check-digit validation; disabled until the algorithm is confirmed. */
  checksum: {
    enabled: boolean;
    algorithm: 'luhn';
  };
  /** Exact NINs to reject (e.g. known test values). */
  blacklist: string[];
}

/** Per-check boolean results. */
export type NinValidationChecks = Record<NinCheckName, boolean>;

/** Result returned by {@link validateNin}. */
export interface NinValidationResult {
  valid: boolean;
  nin: string;
  checks: NinValidationChecks;
  /** Present only when `valid` is false: the first failing check's code. */
  error?: NinErrorCode;
}
