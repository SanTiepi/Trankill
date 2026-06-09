/**
 * Pause Service — Safe Pause store (TRK-005)
 *
 * When scan returns 'suspect' or 'danger', a Safe Pause entry is created.
 * It holds the scan context so /pause/:scanId can:
 *   - render the countdown + reassuring message
 *   - trigger a circle notification exactly once
 *   - track manual unlock
 *
 * Storage: in-memory Map (same pattern as circle_service, ephemeral for MVP).
 */

import { randomBytes } from 'node:crypto';

/** @type {Map<string, PauseEntry>} */
const pauses = new Map();

const PAUSE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @typedef {object} PauseEntry
 * @property {string}  scanId
 * @property {string}  verdict          — 'suspect' | 'danger'
 * @property {number}  score
 * @property {string}  input_preview    — first 100 chars of scanned text
 * @property {object}  explanation      — multilingual {fr, de, it, en}
 * @property {object|null} official_contact
 * @property {Array}   suggested_verifiers
 * @property {string}  scanned_at       — ISO
 * @property {number}  pauseUntil       — epoch ms
 * @property {boolean} circleNotified   — circle alert sent?
 * @property {boolean} unlocked         — manually unlocked by user?
 * @property {string|null} circleId     — if user provided one
 * @property {string|null} memberId     — if user provided one
 */

/**
 * Create a Safe Pause from a scan result.
 * @param {object} scanResult — output of scanInput()
 * @param {object} [opts]     — { circleId, memberId }
 * @returns {PauseEntry}
 */
export function createPause(scanResult, opts = {}) {
  const { verdict } = scanResult;
  if (verdict !== 'suspect' && verdict !== 'danger') {
    throw new Error(`createPause requires verdict suspect|danger, got: ${verdict}`);
  }

  const scanId = randomBytes(8).toString('hex');
  const entry = {
    scanId,
    verdict,
    score: scanResult.score ?? 0,
    input_preview: scanResult.input_preview ?? '',
    explanation: scanResult.explanation ?? {},
    official_contact: scanResult.official_contact ?? null,
    suggested_verifiers: scanResult.suggested_verifiers ?? [],
    scanned_at: scanResult.scanned_at ?? new Date().toISOString(),
    pauseUntil: Date.now() + PAUSE_DURATION_MS,
    circleNotified: false,
    unlocked: false,
    circleId: opts.circleId ?? null,
    memberId: opts.memberId ?? null,
  };

  pauses.set(scanId, entry);
  return entry;
}

/**
 * Retrieve a pause by scanId.
 * @param {string} scanId
 * @returns {PauseEntry}
 */
export function getPause(scanId) {
  const entry = pauses.get(scanId);
  if (!entry) throw new Error('Pause not found');
  return entry;
}

/**
 * Mark the circle as notified (idempotent).
 * @param {string} scanId
 */
export function markCircleNotified(scanId) {
  const entry = pauses.get(scanId);
  if (!entry) throw new Error('Pause not found');
  entry.circleNotified = true;
}

/**
 * Manually unlock a pause (user decided to proceed after the wait).
 * Always succeeds, even if the countdown is still running.
 * @param {string} scanId
 * @returns {PauseEntry}
 */
export function unlockPause(scanId) {
  const entry = pauses.get(scanId);
  if (!entry) throw new Error('Pause not found');
  entry.unlocked = true;
  return entry;
}

/**
 * Check whether the countdown has expired (or user unlocked manually).
 * @param {string} scanId
 * @returns {boolean}
 */
export function isPauseOver(scanId) {
  const entry = pauses.get(scanId);
  if (!entry) throw new Error('Pause not found');
  return entry.unlocked || Date.now() >= entry.pauseUntil;
}

/**
 * Test teardown helper — clears all pauses.
 */
export function _clearPauses() {
  pauses.clear();
}
