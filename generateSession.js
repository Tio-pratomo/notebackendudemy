// @ts-check
/**
 * @module utility
 * Module ini untuk memproses belajar apa
 * dan berapa banyak sesi yang dibuat
 */

/**
 * @param {number} lessonCount - banyaknya sesi belajar
 * @param {string} lessonName - nama folder / topik pembelajaran
 * @param {number | null} [continueable] - melanjut dari sesi sebelumnya atau tidak
 * @returns {string[]}
 */

export function generateSession(lessonCount, lessonName, continueable = null) {
  const processName = lessonName.toLowerCase().replaceAll(" ", "");

  /** @type {number[]} - proses array of number berdasarkan banyaknya sesi */
  const sessionCount = [...Array(lessonCount)].map((number, index) =>
    continueable ? (number ?? index + 1 + continueable) : (number ?? index + 1)
  );

  return sessionCount.map((value) => `${processName}/sesi${value}`);
}
