const BADGE_WEIGHTS = {
  FULL_CONTENT: 1.0,
  SNIPPET_ONLY: 0.6,
  UNVERIFIABLE: 0.3,
};

/**
 * Returns a weight multiplier based on the source domain.
 * Higher trust sources (Reddit, LinkedIn, Quora) have higher weights.
 */
function getSourceWeight(link) {
  if (!link) return 1;
  const url = link.toLowerCase();

  // Community-driven sources (highest trust)
  if (url.includes("reddit.com")) return 4;
  if (url.includes("quora.com")) return 3.5;
  if (url.includes("linkedin.com")) return 4;
  if (url.includes("glassdoor")) return 4;

  // News & tech blogs
  if (url.includes("medium.com")) return 2.5;
  if (url.includes("dev.to")) return 2;
  if (url.includes("twitter.com") || url.includes("x.com")) return 2;

  // Default weight for general websites
  return 1;
}

module.exports = {
  BADGE_WEIGHTS,
  getSourceWeight
};
