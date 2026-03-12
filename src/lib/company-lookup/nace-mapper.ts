/**
 * Maps NACE division codes (numeric prefix of a NACE code like "62.010") to our NaceSection enum.
 * NACE Rev. 2 divisions 01–96 map to sections A–S.
 */

const divisionToSection: Record<number, string> = {
    // A — Agriculture, forestry and fishing
    1: 'A', 2: 'A', 3: 'A',
    // B — Mining and quarrying
    5: 'B', 6: 'B', 7: 'B', 8: 'B', 9: 'B',
    // C — Manufacturing
    10: 'C', 11: 'C', 12: 'C', 13: 'C', 14: 'C', 15: 'C', 16: 'C',
    17: 'C', 18: 'C', 19: 'C', 20: 'C', 21: 'C', 22: 'C', 23: 'C',
    24: 'C', 25: 'C', 26: 'C', 27: 'C', 28: 'C', 29: 'C', 30: 'C',
    31: 'C', 32: 'C', 33: 'C',
    // D — Electricity, gas, steam and air conditioning supply
    35: 'D',
    // E — Water supply, sewerage, waste management
    36: 'E', 37: 'E', 38: 'E', 39: 'E',
    // F — Construction
    41: 'F', 42: 'F', 43: 'F',
    // G — Wholesale and retail trade
    45: 'G', 46: 'G', 47: 'G',
    // H — Transportation and storage
    49: 'H', 50: 'H', 51: 'H', 52: 'H', 53: 'H',
    // I — Accommodation and food service activities
    55: 'I', 56: 'I',
    // J — Information and communication
    58: 'J', 59: 'J', 60: 'J', 61: 'J', 62: 'J', 63: 'J',
    // K — Financial and insurance activities
    64: 'K', 65: 'K', 66: 'K',
    // L — Real estate activities
    68: 'L',
    // M — Professional, scientific and technical activities
    69: 'M', 70: 'M', 71: 'M', 72: 'M', 73: 'M', 74: 'M', 75: 'M',
    // N — Administrative and support service activities
    77: 'N', 78: 'N', 79: 'N', 80: 'N', 81: 'N', 82: 'N',
    // O — Public administration and defence
    84: 'O',
    // P — Education
    85: 'P',
    // Q — Human health and social work activities
    86: 'Q', 87: 'Q', 88: 'Q',
    // R — Arts, entertainment and recreation
    90: 'R', 91: 'R', 92: 'R', 93: 'R',
    // S — Other service activities
    94: 'S', 95: 'S', 96: 'S',
};

/**
 * Converts a NACE code string (e.g. "62.010", "620100", "62", "C") to our NaceSection enum value.
 * Returns null if the code cannot be mapped.
 */
export function naceCodeToSection(code: string | number | null | undefined): string | null {
    if (code === null || code === undefined) return null;

    const s = String(code).trim();

    // Already a single letter section (e.g. from some APIs)
    if (/^[A-S]$/i.test(s)) {
        return s.toUpperCase();
    }

    // Extract leading numeric division (handles "62.010", "620100", "62")
    const match = s.match(/^(\d+)/);
    if (!match) return null;

    const fullNum = parseInt(match[1], 10);

    // If the raw number is a 5- or 6-digit industry code (e.g. Danish 620100), divide to get division
    let division: number;
    if (fullNum >= 1000) {
        division = Math.floor(fullNum / 10000);
    } else if (fullNum >= 100) {
        division = Math.floor(fullNum / 100);
    } else {
        division = fullNum;
    }

    return divisionToSection[division] ?? 'OTHER';
}

/**
 * Maps employee count to our OrgSize enum value.
 */
export function employeesToSize(count: number | null | undefined): string | null {
    if (count === null || count === undefined) return null;
    if (count < 10)   return 'MICRO';
    if (count < 50)   return 'SMALL';
    if (count < 250)  return 'MEDIUM';
    if (count < 1000) return 'LARGE';
    return 'ENTERPRISE';
}
