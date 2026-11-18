/**
 * Catch ".con" style email typos before a ticket goes nowhere.
 *
 * Mirrors backend/core/utils/email_validation.py: only a non-existent TLD that
 * is a clear slip for "com", or a misspelt provider domain, is corrected.
 * Real TLDs (.co, .cm, .com.ng) are left alone.
 */

const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cim: "com",
  cpm: "com",
  clm: "com",
  comn: "com",
  coom: "com",
  comm: "com",
  conm: "com",
  ocm: "com",
  vom: "com",
  xom: "com",
  coml: "com",
};

const PROVIDER_DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gemail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cim": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
};

/**
 * Returns the corrected address, or null when nothing needs fixing.
 * Only the domain ever changes; the local part stays as typed.
 */
export function emailSuggestion(email: string): string | null {
  const value = (email || "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return null;

  const local = value.slice(0, at).toLowerCase();
  const domain = value.slice(at + 1).toLowerCase();
  const dot = domain.lastIndexOf(".");
  if (!local || dot < 1) return null;

  let fixed = PROVIDER_DOMAIN_TYPOS[domain];
  if (!fixed) {
    const corrected = TLD_TYPOS[domain.slice(dot + 1)];
    if (!corrected) return null;
    fixed = `${domain.slice(0, dot + 1)}${corrected}`;
  }

  const candidate = `${local}@${fixed}`;
  return candidate === value.toLowerCase() ? null : candidate;
}

/** The address a form should submit. */
export function normaliseEmail(email: string): string {
  return emailSuggestion(email) || (email || "").trim();
}