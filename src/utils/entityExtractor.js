/**
 * Normalizes an entity name by cleaning up strings and domains.
 */
function normalizeEntity(e) {
  if (!e) return "";
  return e.toLowerCase().trim().replace(/[^a-z0-9.]/g, "");
}

/**
 * Extracts a candidate entity name from a search query or free-form text.
 * Prioritizes domain names, then DNS-like structures, then falls back 
 * to the longest word.
 */
function extractEntity(input) {
  if (!input) return "";

  // Try to extract domain (e.g., "example.com")
  const domainMatch = input.match(/\b([a-z0-9-]+\.(com|in|io|ai|co|org|net))\b/i);
  if (domainMatch) return normalizeEntity(domainMatch[1]);

  // Try to extract word (domain-like prefix, e.g., "example" from "example.com")
  const dnsMatch = input.match(/\b([a-z0-9-]+)\.(com|in|io|ai|co|org|net)\b/i);
  if (dnsMatch) return normalizeEntity(dnsMatch[1]);

  // Fallback: find longest word in the input
  const words = input.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const longest = words.reduce((a, b) => a.length > b.length ? a : b);
    return normalizeEntity(longest);
  }

  return normalizeEntity(input);
}

module.exports = {
  normalizeEntity,
  extractEntity
};
