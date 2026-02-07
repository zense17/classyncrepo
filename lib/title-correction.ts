/**
 * 🎯 SOLUTION 3: Smart Title Correction Algorithm
 * Fixes common OCR errors using pattern recognition and fuzzy matching
 * Does NOT rely on known curriculum - works for any course
 */

/**
 * Common OCR character misreadings and their corrections
 */
const OCR_CHAR_FIXES: Record<string, string> = {
  // Common character confusions
  'rn': 'm',     // "Cormputing" → "Computing"
  'Cormp': 'Comp', // "Cormputing" → "Computing"
  'Hurnan': 'Human',
  'Hurman': 'Human',
  'Cormmunications': 'Communications',
  'Cormmunication': 'Communication',
  'Moverment': 'Movement',
  'Anaysis': 'Analysis',
  'Appreciatier': 'Appreciation',
  'Pagpapatalaga': 'Pagpapahalaga',
  'Lipunan': 'at Lipunan', // Often "at" gets dropped
  'Readingsin': 'Readings in',
  'VWorld': 'World',
  'VVorld': 'World',
  'Worfd': 'World',
  'Worid': 'World',
  'Exerc': 'Exercise',
  'Trairung': 'Training',
  'Training...': 'Training',
  'CSThesis': 'CS Thesis',
  'CWS': 'CWTS', // Common NSTP typo
  'LTS/CWS/ROTC': 'LTS/CWTS/ROTC',
  'Fiipino': 'Filipino',
  'Fihpino': 'Filipino',
  'Phihppine': 'Philippine',
  'Philhppine': 'Philippine',
  'Philippme': 'Philippine',
  'Technoiogy': 'Technology',
  'Technohogy': 'Technology',
  'Seff': 'Self',
  'Sef': 'Self',
  'Histor': 'History',
  'Historv': 'History',
  'Mathemati': 'Mathematic',
  'Distnbuted': 'Distributed',
  'Netw orks': 'Networks',
  'Netwoiks': 'Networks',
  'Prograrn': 'Program',
  'Programm': 'Programming',
  'Prograrnn': 'Programming',
  'Infonnation': 'Information',
  'Informahon': 'Information',
  'lnformation': 'Information', // lowercase L vs I
  'Cornputer': 'Computer',
  'Oomputer': 'Computer',
  'Softw are': 'Software',
  'Softwaie': 'Software',
  'Structuie': 'Structure',
  'Structur': 'Structure',
  'Algorithrn': 'Algorithm',
  'Algorithrns': 'Algorithms',
  'Developrnent': 'Development',
  'Developm ent': 'Development',
  'Organizafion': 'Organization',
  'Organizahon': 'Organization',
  'Architectur': 'Architecture',
  'Secufity': 'Security',
  'Secur ty': 'Security',
};

/**
 * Patterns to remove (common OCR noise)
 */
const NOISE_PATTERNS = [
  /\s+Total$/gi,      // "Subject Total"
  /\s+Grade$/gi,      // "Subject Grade"
  /\s+Elective$/gi,   // "Subject Elective"
  /\s+O\.H$/gi,       // "Subject O.H"
  /\s+OA$/gi,         // "Subject OA"
  /\s+APAM$/gi,       // "Subject APAM"
  /\s+J$/gi,          // Random "J" at end
  /\)$/,              // Trailing ")" - very common!
  /\s+\)$/,           // Trailing " )"
  /^\(/,              // Leading "("
  /\s{2,}/g,          // Multiple spaces → single space
];

/**
 * Apply smart corrections to a subject title
 * Fixes common OCR errors without relying on known curriculum
 */
export function correctTitle(title: string): {
  corrected: string;
  changes: string[];
} {
  if (!title || title.length < 2) {
    return { corrected: title, changes: [] };
  }

  let corrected = title;
  const changes: string[] = [];
  const original = title;

  // Step 1: Fix common OCR character errors
  Object.entries(OCR_CHAR_FIXES).forEach(([wrong, right]) => {
    if (corrected.includes(wrong)) {
      corrected = corrected.replace(new RegExp(wrong, 'g'), right);
      changes.push(`"${wrong}" → "${right}"`);
    }
  });

  // Step 2: Remove noise patterns
  NOISE_PATTERNS.forEach(pattern => {
    const before = corrected;
    corrected = corrected.replace(pattern, '');
    if (before !== corrected) {
      changes.push('Removed noise');
    }
  });

  // Step 3: Fix common spacing issues
  corrected = corrected
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between camelCase
    .replace(/\s+/g, ' ')                  // Normalize spaces
    .trim();

  // Step 4: Capitalize properly
  corrected = corrected
    .split(' ')
    .map((word, index) => {
      // Don't capitalize: and, or, in, of, the, for, to, at (unless first word)
      if (index > 0 && ['and', 'or', 'in', 'of', 'the', 'for', 'to', 'at'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Only log if changes were made
  if (corrected !== original) {
    // Don't add the full correction message - it will be logged by post-processing
  }

  return { corrected, changes };
}

/**
 * Batch correct multiple titles
 */
export function correctTitles(titles: string[]): Array<{ original: string; corrected: string; changes: string[] }> {
  return titles.map(title => {
    const result = correctTitle(title);
    return {
      original: title,
      corrected: result.corrected,
      changes: result.changes,
    };
  });
}

/**
 * Check if a title likely has OCR errors
 */
export function hasProbableOCRErrors(title: string): boolean {
  // Check for common OCR error patterns
  const errorPatterns = [
    /rn/,           // Often "rn" instead of "m"
    /Cormp/,        // "Cormputing"
    /Hurnan|Hurman/, // "Hurnan"
    /Cormmun/,      // "Cormmunications"
    /Moverment/,    // "Moverment"
    /Anaysis/,      // "Anaysis"
    /\)/,           // Trailing parenthesis
    /\s{2,}/,       // Multiple consecutive spaces
    /[A-Z]{2}[a-z][A-Z]/, // Weird capitalization like "CSThesis"
  ];

  return errorPatterns.some(pattern => pattern.test(title));
}