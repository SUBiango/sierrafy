/** Checksum algorithms the validator knows how to run. */
export const CHECKSUM_ALGORITHMS = ['luhn'] as const;

/** A checksum algorithm name the validator accepts. */
export type ChecksumAlgorithm = (typeof CHECKSUM_ALGORITHMS)[number];

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
  /**
   * Optional check-digit validation; disabled until NCRA confirms an algorithm.
   *
   * WARNING: the only wired algorithm is Luhn, which runs over the NIN's decimal
   * digits and therefore rejects all-letter NINs — a shape observed on a real
   * card. Do not enable it as a general integrity check.
   */
  checksum: {
    enabled: boolean;
    algorithm: ChecksumAlgorithm;
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
