// Auto-reply detection (M5 Step 1). Per docs/contract's explicit instruction
// ("prefer simple configurable rules/patterns rather than AI classification"
// and "do not promise 100% accurate detection"): plain case-insensitive
// substring matching against configurable patterns, no ML/AI of any kind.
//
// Fail-safe direction: an empty (or missing) pattern list must never produce
// a `true` classification. A false "auto-reply" verdict on a genuine human
// reply would silently defeat the stop-on-reply guarantee (docs/rules — see
// M5 Step 1's Scope note), which is worse than occasionally missing a real
// auto-reply and sending one extra follow-up.
export function detectAutoReply(text: string, patterns: readonly string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const normalizedText = text.toLowerCase();
  return patterns.some((pattern) => {
    const normalizedPattern = pattern.trim().toLowerCase();
    return normalizedPattern.length > 0 && normalizedText.includes(normalizedPattern);
  });
}
