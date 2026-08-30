// Reusable fuzzy matching utility for spelling-tolerant search and category matches

export const levenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

export const fuzzyMatch = (text, query) => {
  if (!text || !query) return false;
  const t = text.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // Exact match or direct substring match
  if (t.includes(q) || q.includes(t)) return true;

  // Split into individual words
  const textWords = t.split(/\s+/).filter(w => w.length > 1);
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);

  if (queryWords.length === 0) return false;

  // For multi-word queries, demand at least 50% of words match
  let matchedCount = 0;
  for (const qw of queryWords) {
    for (const tw of textWords) {
      const maxDistance = Math.max(1, Math.floor(tw.length * 0.3)); // 30% error margin allowed
      if (tw.includes(qw) || qw.includes(tw) || levenshteinDistance(qw, tw) <= maxDistance) {
        matchedCount++;
        break;
      }
    }
  }

  if (queryWords.length <= 1) {
    return matchedCount > 0;
  }

  return (matchedCount / queryWords.length) >= 0.5;
};

// Calculate search relevance score (higher is better)
export const getMatchScore = (text, query) => {
  if (!text || !query) return 0;
  const t = text.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (t === q) return 1000;
  if (t.startsWith(q)) return 800;
  if (t.includes(q)) return 600;

  const queryWords = q.split(/\s+/).filter(w => w.length > 0);
  const textWords = t.split(/\s+/).filter(w => w.length > 0);

  if (queryWords.length === 0) return 0;

  let matchedCount = 0;
  for (const qw of queryWords) {
    if (textWords.some(tw => tw.startsWith(qw) || tw.includes(qw) || (tw.length > 3 && levenshteinDistance(qw, tw) <= 1))) {
      matchedCount++;
    }
  }

  const matchRatio = matchedCount / queryWords.length;

  if (queryWords.length === 1 && matchedCount === 1) {
    return 400;
  }

  if (matchedCount === queryWords.length) {
    return 500;
  }

  if (matchRatio >= 0.5) {
    return Math.round(300 * matchRatio);
  }

  return 0;
};

export const TAMIL_NADU_CITIES = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Tiruppur',
  'Thanjavur', 'Dindigul', 'Karur', 'Namakkal', 'Nagapattinam',
  'Kanchipuram', 'Chengalpattu', 'Tambaram', 'Avadi', 'Tiruvallur',
  'Tiruvannamalai', 'Viluppuram', 'Kallakurichi', 'Cuddalore',
  'Chidambaram', 'Mayiladuthurai', 'Sirkazhi', 'Thiruvarur',
  'Pudukottai', 'Sivagangai', 'Ramanathapuram', 'Paramakudi',
  'Sivakasi', 'Virudhunagar', 'Rajapalayam', 'Srivilliputhur',
  'Tenkasi', 'Sankarankovil', 'Nagercoil', 'Kanyakumari',
  'Marthandam', 'Kuzhithurai', 'Theni', 'Bodinayakanur',
  'Cumbum', 'Periyakulam', 'Palani', 'Oddanchatram',
  'Kodaikanal', 'Pollachi', 'Mettupalayam', 'Coonoor',
  'Udhagamandalam', 'Gobichettipalayam', 'Bhavani', 'Sathyamangalam',
  'Mettur', 'Attur', 'Rasipuram', 'Kulithalai',
  'Ariyalur', 'Perambalur', 'Arakkonam', 'Ranipet',
  'Walajapet', 'Gudiyatham', 'Ambur', 'Vaniyambadi',
  'Tirupattur', 'Arani', 'Cheyyar', 'Tiruttani',
  'Palladam', 'Dharapuram', 'Udumalaipettai', 'Kovilpatti',
  'Tiruchendur', 'Neyveli', 'Panruti', 'Vriddhachalam',
  'Pattukkottai', 'Mannargudi', 'Vedaranyam', 'Karaikudi'
];

export const extractCityFromText = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const city of TAMIL_NADU_CITIES) {
    const cLower = city.toLowerCase();
    if (lower === cLower) return city;
    if (
      lower.includes(`in ${cLower}`) ||
      lower.includes(`at ${cLower}`) ||
      lower.includes(`near ${cLower}`) ||
      lower.endsWith(` ${cLower}`) ||
      lower.startsWith(`${cLower} `)
    ) {
      return city;
    }
  }
  return null;
};

export const getCleanKeyword = (kw, city) => {
  if (!kw) return '';
  let cleaned = kw.toLowerCase().trim();
  const detectedCity = city || extractCityFromText(kw);
  if (detectedCity) {
    const cLower = detectedCity.toLowerCase();
    cleaned = cleaned
      .replace(new RegExp(`(?:\\s+in|\\s+at|\\s+near)?\\s+${cLower}`, 'gi'), '')
      .replace(new RegExp(`^${cLower}\\s+`, 'gi'), '')
      .trim();
  }
  return cleaned;
};
