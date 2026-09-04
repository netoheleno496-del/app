// Maps betting-house names to their brand domain so we can load real logos.
// Logos are fetched from Clearbit's free logo API (transparent PNG by domain).
// Any house not listed here falls back to colored initials.

const DOMAINS: Record<string, string> = {
  "10bet": "10bet.com",
  "12bet": "12bet.com",
  "188bet": "188bet.com",
  "1bet": "1bet.com",
  "1win": "1win.com",
  "1xbet": "1xbet.com",
  "20bet": "20bet.com",
  "22bet": "22bet.com",
  "32red": "32red.com",
  "888sport": "888sport.com",
  "7games": "7games.bet.br",
  "bet365": "bet365.com",
  "betano": "betano.com",
  "kto": "kto.com",
  "stake": "stake.com",
  "superbet": "superbet.com",
  "betfair": "betfair.com",
  "betclic": "betclic.com",
  "bwin": "bwin.com",
  "pixbet": "pixbet.com",
  "parimatch": "parimatch.com",
  "sportingbet": "sportingbet.com",
  "novibet": "novibet.com",
  "betnacional": "betnacional.com",
  "esportes da sorte": "esportesdasorte.com",
  "suprema bet": "supremabet.com",
  "vaidebet": "vaidebet.com",
  "estrelabet": "estrelabet.com",
  "blaze": "blaze.com",
  "betfast": "betfast.io",
  "brazino777": "brazino777.com",
  "f12 bet": "f12.bet",
  "betmgm": "betmgm.com",
  "unibet": "unibet.com",
  "williamhill": "williamhill.com",
  "william hill": "williamhill.com",
  "pokerstars": "pokerstars.com",
  "leovegas": "leovegas.com",
  "rivalo": "rivalo.com",
  "betsson": "betsson.com",
  "melbet": "melbet.com",
  "dafabet": "dafabet.com",
};

export function casaLogoUrl(name: string): string | null {
  const domain = DOMAINS[name.trim().toLowerCase()];
  if (!domain) return null;
  // DeBounce free logo API (no key) — replaces the shut-down Clearbit logo API.
  return `https://logo.debounce.com/${domain}`;
}
