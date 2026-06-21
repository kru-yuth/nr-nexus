/**
 * Calculates the current Thai academic school year.
 * The Thai school year typically begins in May.
 * - From May to December, the school year is current Gregorian year + 543.
 * - From January to April, the school year is current Gregorian year + 542 (since it's still the previous academic year).
 * @returns {string} The current Thai school year (e.g. "2569").
 */
export function getCurrentSchoolYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed: January is 0, May is 4
    if (month >= 4) {
        return (year + 543).toString();
    } else {
        return (year + 542).toString();
    }
}
