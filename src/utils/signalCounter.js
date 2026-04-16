const SCAM_WORDS = ["scam", "fake", "fraud", "beware", "complaint", "warning", "alert"];
const LEGIT_WORDS = ["legit", "trusted", "genuine", "good", "safe", "verified", "authentic"];

/**
 * Checks if a specific word exists in text, accounting for basic negation.
 */
function containsWord(text, word) {
  const regex = new RegExp(`\\b${word}\\b`, "i");
  const negation = new RegExp(`not\\s+${word}|${word}\\s+not`, "i");
  return regex.test(text) && !negation.test(text);
}

/**
 * Counts occurrences of scam and legit signals in a given text.
 * Returns an object with counts.
 */
function countSignals(text) {
  let scam = 0;
  let legit = 0;

  SCAM_WORDS.forEach(w => {
    if (containsWord(text, w)) scam++;
  });

  LEGIT_WORDS.forEach(w => {
    if (containsWord(text, w)) legit++;
  });

  return { scam, legit };
}

module.exports = {
  SCAM_WORDS,
  LEGIT_WORDS,
  countSignals,
  containsWord
};
