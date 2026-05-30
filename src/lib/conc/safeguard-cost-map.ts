// Per-safeguard cost fingerprint for the per-safeguard financial exposure model.
//
// Each safeguard "claims" a share of one or more CONC cost categories — i.e. the
// fraction of a breach's cost in that category that can be plausibly attributed
// to *this* safeguard failing. Claims are intentionally relative (not normalised
// here); the impact calculator jointly normalises across all safeguards so that
// Σ_safeguards weight = 1.0 per category. That way, summing avoidable-loss
// across every safeguard at CMMI 1 reproduces the total CONC cost, and at CMMI 5
// drops to zero.
//
// The mapping was bootstrapped from the CIS Critical Security Controls v8.1
// implementation notes and each safeguard's purpose/why text in
// `src/lib/constants/cis-controls.ts`. Categories were assigned based on:
//   • prevent  → control reduces probability/blast-radius of breach
//                → reputation, ccl, reg, notification, downtime
//   • detect   → control aids identification of incident
//                → ir, downtime (faster detection = shorter outage)
//   • recover  → control reduces restore cost or recovery time
//                → restore, downtime, ebi
//   • mitigate → control reduces impact during/after incident
//                → ir, ccl, reputation
//   • govern   → control aids governance, audits, regulator handling
//                → governance, reg
//
// Weights are calibrated to be transparent ("does this make business sense?")
// rather than statistically derived. Re-balance as real-world data comes in.

import type { ConcAllCosts } from './conc-calculator';

export type CostCategory = Exclude<keyof ConcAllCosts, 'adminFineCeiling'>;

export type SafeguardFingerprint = {
  weights: Partial<Record<CostCategory, number>>;
  role: 'prevent' | 'detect' | 'recover' | 'mitigate' | 'govern';
};

export const SAFEGUARD_COST_FINGERPRINT: Record<string, SafeguardFingerprint> = {

  // ── CONTROL 1 — Inventory and Control of Enterprise Assets ─────────────────
  '1.1':  { weights: { ir: 0.35, restore: 0.25, governance: 0.25, downtime: 0.15 }, role: 'govern'  },
  '1.2':  { weights: { ir: 0.30, governance: 0.25, restore: 0.25, downtime: 0.20 }, role: 'detect'  },
  '1.3':  { weights: { ir: 0.35, governance: 0.25, restore: 0.20, downtime: 0.20 }, role: 'detect'  },
  '1.4':  { weights: { ir: 0.50, governance: 0.30, downtime: 0.20 },                role: 'detect'  },
  '1.5':  { weights: { ir: 0.40, governance: 0.30, downtime: 0.30 },                role: 'detect'  },

  // ── CONTROL 2 — Inventory and Control of Software Assets ───────────────────
  '2.1':  { weights: { ir: 0.30, reg: 0.20, governance: 0.20, restore: 0.20, downtime: 0.10 }, role: 'govern'  },
  '2.2':  { weights: { reg: 0.25, ir: 0.25, governance: 0.20, downtime: 0.30 },                role: 'prevent' },
  '2.3':  { weights: { ir: 0.30, governance: 0.20, reg: 0.20, downtime: 0.30 },                role: 'prevent' },
  '2.4':  { weights: { ir: 0.40, governance: 0.30, downtime: 0.30 },                          role: 'detect'  },
  '2.5':  { weights: { ir: 0.30, reputation: 0.20, downtime: 0.30, governance: 0.20 },        role: 'prevent' },
  '2.6':  { weights: { ir: 0.40, reputation: 0.20, downtime: 0.30, governance: 0.10 },        role: 'prevent' },
  '2.7':  { weights: { ir: 0.40, reputation: 0.20, downtime: 0.30, governance: 0.10 },        role: 'prevent' },

  // ── CONTROL 3 — Data Protection ────────────────────────────────────────────
  '3.1':  { weights: { governance: 0.35, reg: 0.30, notification: 0.20, reputation: 0.15 }, role: 'govern'  },
  '3.2':  { weights: { reg: 0.30, governance: 0.25, notification: 0.20, reputation: 0.25 }, role: 'govern'  },
  '3.3':  { weights: { reputation: 0.30, ccl: 0.20, reg: 0.30, notification: 0.20 },        role: 'prevent' },
  '3.4':  { weights: { reg: 0.40, reputation: 0.25, notification: 0.20, governance: 0.15 }, role: 'prevent' },
  '3.5':  { weights: { reg: 0.35, reputation: 0.30, notification: 0.20, governance: 0.15 }, role: 'prevent' },
  '3.6':  { weights: { reputation: 0.30, notification: 0.30, reg: 0.30, governance: 0.10 }, role: 'prevent' },
  '3.7':  { weights: { reg: 0.35, governance: 0.30, notification: 0.20, reputation: 0.15 }, role: 'govern'  },
  '3.8':  { weights: { governance: 0.40, reg: 0.30, notification: 0.20, reputation: 0.10 }, role: 'govern'  },
  '3.9':  { weights: { reputation: 0.25, notification: 0.35, reg: 0.30, governance: 0.10 }, role: 'prevent' },
  '3.10': { weights: { reputation: 0.30, notification: 0.30, reg: 0.30, governance: 0.10 }, role: 'prevent' },
  '3.11': { weights: { reputation: 0.30, notification: 0.30, reg: 0.30, governance: 0.10 }, role: 'prevent' },
  '3.12': { weights: { reputation: 0.30, ccl: 0.20, reg: 0.30, notification: 0.20 },        role: 'prevent' },
  '3.13': { weights: { reputation: 0.30, reg: 0.25, notification: 0.20, ccl: 0.15, ir: 0.10 }, role: 'detect'  },
  '3.14': { weights: { ir: 0.40, reg: 0.25, reputation: 0.20, notification: 0.15 },         role: 'detect'  },

  // ── CONTROL 4 — Secure Configuration ───────────────────────────────────────
  '4.1':  { weights: { ir: 0.20, downtime: 0.25, restore: 0.15, ccl: 0.10, reg: 0.15, reputation: 0.15 }, role: 'prevent' },
  '4.2':  { weights: { ir: 0.25, downtime: 0.30, restore: 0.20, reputation: 0.25 },                       role: 'prevent' },
  '4.3':  { weights: { reputation: 0.30, notification: 0.25, ir: 0.20, reg: 0.25 },                       role: 'prevent' },
  '4.4':  { weights: { ir: 0.25, downtime: 0.30, reputation: 0.20, restore: 0.25 },                       role: 'prevent' },
  '4.5':  { weights: { ir: 0.25, downtime: 0.30, reputation: 0.20, restore: 0.25 },                       role: 'prevent' },
  '4.6':  { weights: { ir: 0.25, downtime: 0.25, restore: 0.20, reputation: 0.15, governance: 0.15 },     role: 'prevent' },
  '4.7':  { weights: { ir: 0.30, reputation: 0.25, ccl: 0.20, reg: 0.25 },                                role: 'prevent' },
  '4.8':  { weights: { ir: 0.30, downtime: 0.30, restore: 0.20, reputation: 0.20 },                       role: 'prevent' },
  '4.9':  { weights: { ir: 0.30, downtime: 0.25, reputation: 0.20, governance: 0.25 },                    role: 'prevent' },
  '4.10': { weights: { reputation: 0.30, notification: 0.30, reg: 0.30, governance: 0.10 },               role: 'prevent' },
  '4.11': { weights: { reputation: 0.30, notification: 0.30, reg: 0.30, governance: 0.10 },               role: 'mitigate'},
  '4.12': { weights: { reputation: 0.30, notification: 0.25, reg: 0.25, governance: 0.20 },               role: 'prevent' },

  // ── CONTROL 5 — Account Management ─────────────────────────────────────────
  '5.1':  { weights: { ir: 0.30, governance: 0.30, reg: 0.20, reputation: 0.20 },                          role: 'govern'  },
  '5.2':  { weights: { reputation: 0.30, ir: 0.20, ccl: 0.20, reg: 0.20, governance: 0.10 },               role: 'prevent' },
  '5.3':  { weights: { ir: 0.30, reputation: 0.25, ccl: 0.20, reg: 0.25 },                                 role: 'prevent' },
  '5.4':  { weights: { ir: 0.30, downtime: 0.20, reputation: 0.25, restore: 0.15, reg: 0.10 },             role: 'prevent' },
  '5.5':  { weights: { ir: 0.40, governance: 0.30, downtime: 0.20, reg: 0.10 },                            role: 'govern'  },
  '5.6':  { weights: { ir: 0.30, governance: 0.25, reg: 0.20, reputation: 0.25 },                          role: 'prevent' },

  // ── CONTROL 6 — Access Control Management ──────────────────────────────────
  '6.1':  { weights: { ir: 0.25, governance: 0.25, reg: 0.25, reputation: 0.25 },                          role: 'prevent' },
  '6.2':  { weights: { ir: 0.30, governance: 0.20, reg: 0.25, reputation: 0.25 },                          role: 'prevent' },
  '6.3':  { weights: { reputation: 0.30, ccl: 0.20, ir: 0.20, reg: 0.30 },                                 role: 'prevent' },
  '6.4':  { weights: { reputation: 0.30, ccl: 0.20, ir: 0.20, reg: 0.30 },                                 role: 'prevent' },
  '6.5':  { weights: { reputation: 0.30, ir: 0.25, downtime: 0.20, restore: 0.15, reg: 0.10 },             role: 'prevent' },
  '6.6':  { weights: { ir: 0.40, governance: 0.40, reg: 0.20 },                                            role: 'govern'  },
  '6.7':  { weights: { ir: 0.30, governance: 0.30, reg: 0.20, reputation: 0.20 },                          role: 'prevent' },
  '6.8':  { weights: { reputation: 0.25, ir: 0.25, ccl: 0.20, reg: 0.20, governance: 0.10 },               role: 'prevent' },

  // ── CONTROL 7 — Continuous Vulnerability Management ────────────────────────
  '7.1':  { weights: { ir: 0.20, downtime: 0.25, reputation: 0.20, restore: 0.20, governance: 0.15 }, role: 'govern'  },
  '7.2':  { weights: { downtime: 0.30, ir: 0.25, restore: 0.20, reputation: 0.25 },                   role: 'prevent' },
  '7.3':  { weights: { downtime: 0.30, ir: 0.25, reputation: 0.20, restore: 0.25 },                   role: 'prevent' },
  '7.4':  { weights: { downtime: 0.30, ir: 0.25, reputation: 0.20, restore: 0.25 },                   role: 'prevent' },
  '7.5':  { weights: { ir: 0.30, downtime: 0.25, reputation: 0.25, restore: 0.20 },                   role: 'detect'  },
  '7.6':  { weights: { ir: 0.30, downtime: 0.25, reputation: 0.25, restore: 0.20 },                   role: 'detect'  },
  '7.7':  { weights: { downtime: 0.30, reputation: 0.25, ir: 0.25, restore: 0.20 },                   role: 'prevent' },

  // ── CONTROL 8 — Audit Log Management ───────────────────────────────────────
  '8.1':  { weights: { ir: 0.50, governance: 0.30, downtime: 0.20 },                       role: 'govern'  },
  '8.2':  { weights: { ir: 0.55, downtime: 0.25, governance: 0.20 },                       role: 'detect'  },
  '8.3':  { weights: { ir: 0.50, governance: 0.30, downtime: 0.20 },                       role: 'detect'  },
  '8.4':  { weights: { ir: 0.55, governance: 0.25, downtime: 0.20 },                       role: 'detect'  },
  '8.5':  { weights: { ir: 0.50, downtime: 0.25, governance: 0.25 },                       role: 'detect'  },
  '8.6':  { weights: { ir: 0.55, downtime: 0.25, governance: 0.20 },                       role: 'detect'  },
  '8.7':  { weights: { ir: 0.55, downtime: 0.25, governance: 0.20 },                       role: 'detect'  },
  '8.8':  { weights: { ir: 0.60, downtime: 0.25, governance: 0.15 },                       role: 'detect'  },
  '8.9':  { weights: { ir: 0.50, governance: 0.30, downtime: 0.20 },                       role: 'detect'  },
  '8.10': { weights: { ir: 0.40, reg: 0.30, governance: 0.30 },                            role: 'govern'  },
  '8.11': { weights: { ir: 0.55, downtime: 0.30, governance: 0.15 },                       role: 'detect'  },
  '8.12': { weights: { ir: 0.50, governance: 0.30, reg: 0.20 },                            role: 'detect'  },

  // ── CONTROL 9 — Email and Web Browser Protections ──────────────────────────
  '9.1':  { weights: { reputation: 0.25, ir: 0.25, downtime: 0.25, restore: 0.25 }, role: 'prevent' },
  '9.2':  { weights: { reputation: 0.30, ir: 0.25, downtime: 0.20, restore: 0.25 }, role: 'prevent' },
  '9.3':  { weights: { reputation: 0.30, ir: 0.25, downtime: 0.20, restore: 0.25 }, role: 'prevent' },
  '9.4':  { weights: { reputation: 0.25, ir: 0.25, downtime: 0.25, restore: 0.25 }, role: 'prevent' },
  '9.5':  { weights: { reputation: 0.40, ccl: 0.20, reg: 0.20, ir: 0.20 },          role: 'prevent' },
  '9.6':  { weights: { ir: 0.25, downtime: 0.25, restore: 0.25, reputation: 0.25 }, role: 'prevent' },
  '9.7':  { weights: { ir: 0.25, downtime: 0.25, restore: 0.25, reputation: 0.25 }, role: 'prevent' },

  // ── CONTROL 10 — Malware Defenses ──────────────────────────────────────────
  '10.1': { weights: { restore: 0.30, downtime: 0.25, ir: 0.20, reputation: 0.25 },         role: 'prevent' },
  '10.2': { weights: { restore: 0.30, downtime: 0.25, ir: 0.20, reputation: 0.25 },         role: 'prevent' },
  '10.3': { weights: { ir: 0.30, restore: 0.30, downtime: 0.20, reputation: 0.20 },         role: 'prevent' },
  '10.4': { weights: { restore: 0.30, ir: 0.30, downtime: 0.20, reputation: 0.20 },         role: 'prevent' },
  '10.5': { weights: { restore: 0.30, downtime: 0.25, ir: 0.25, reputation: 0.20 },         role: 'prevent' },
  '10.6': { weights: { ir: 0.30, governance: 0.20, restore: 0.30, downtime: 0.20 },         role: 'prevent' },
  '10.7': { weights: { ir: 0.30, restore: 0.30, downtime: 0.20, reputation: 0.20 },         role: 'detect'  },

  // ── CONTROL 11 — Data Recovery ─────────────────────────────────────────────
  '11.1': { weights: { restore: 0.55, downtime: 0.30, governance: 0.15 }, role: 'recover' },
  '11.2': { weights: { restore: 0.60, downtime: 0.30, governance: 0.10 }, role: 'recover' },
  '11.3': { weights: { restore: 0.50, downtime: 0.30, ir: 0.20 },         role: 'recover' },
  '11.4': { weights: { restore: 0.55, downtime: 0.30, ir: 0.15 },         role: 'recover' },
  '11.5': { weights: { restore: 0.55, downtime: 0.30, ebi: 0.15 },        role: 'recover' },

  // ── CONTROL 12 — Network Infrastructure Management ─────────────────────────
  '12.1': { weights: { downtime: 0.30, ir: 0.25, restore: 0.20, reputation: 0.25 },                   role: 'prevent' },
  '12.2': { weights: { ir: 0.30, downtime: 0.25, restore: 0.20, reputation: 0.25 },                   role: 'prevent' },
  '12.3': { weights: { ir: 0.30, downtime: 0.25, restore: 0.20, governance: 0.15, reputation: 0.10 }, role: 'prevent' },
  '12.4': { weights: { ir: 0.40, restore: 0.30, downtime: 0.20, governance: 0.10 },                   role: 'govern'  },
  '12.5': { weights: { ir: 0.40, governance: 0.30, downtime: 0.30 },                                  role: 'prevent' },
  '12.6': { weights: { ir: 0.30, reputation: 0.30, reg: 0.20, governance: 0.20 },                     role: 'prevent' },
  '12.7': { weights: { reputation: 0.30, ir: 0.30, reg: 0.20, downtime: 0.20 },                       role: 'prevent' },
  '12.8': { weights: { ir: 0.40, restore: 0.20, downtime: 0.20, reputation: 0.20 },                   role: 'prevent' },

  // ── CONTROL 13 — Network Monitoring and Defense ────────────────────────────
  '13.1':  { weights: { ir: 0.50, downtime: 0.30, governance: 0.20 },                  role: 'detect'  },
  '13.2':  { weights: { ir: 0.45, downtime: 0.25, restore: 0.20, reputation: 0.10 },   role: 'detect'  },
  '13.3':  { weights: { ir: 0.30, downtime: 0.30, restore: 0.20, reputation: 0.20 },   role: 'prevent' },
  '13.4':  { weights: { ir: 0.55, downtime: 0.25, governance: 0.20 },                  role: 'detect'  },
  '13.5':  { weights: { ir: 0.60, downtime: 0.20, governance: 0.20 },                  role: 'detect'  },
  '13.6':  { weights: { ir: 0.50, downtime: 0.25, restore: 0.15, reputation: 0.10 },   role: 'detect'  },
  '13.7':  { weights: { ir: 0.40, downtime: 0.30, restore: 0.20, reputation: 0.10 },   role: 'prevent' },
  '13.8':  { weights: { reputation: 0.30, ir: 0.25, downtime: 0.20, reg: 0.15, ccl: 0.10 }, role: 'prevent' },
  '13.9':  { weights: { ir: 0.35, governance: 0.25, reputation: 0.20, downtime: 0.20 }, role: 'prevent' },
  '13.10': { weights: { ir: 0.30, reputation: 0.25, downtime: 0.20, restore: 0.15, ccl: 0.10 }, role: 'prevent' },
  '13.11': { weights: { ir: 0.55, downtime: 0.25, governance: 0.20 },                  role: 'govern'  },

  // ── CONTROL 14 — Security Awareness and Skills Training ────────────────────
  '14.1': { weights: { reputation: 0.25, ir: 0.20, restore: 0.20, reg: 0.20, downtime: 0.15 }, role: 'prevent' },
  '14.2': { weights: { reputation: 0.25, ir: 0.20, restore: 0.20, reg: 0.20, downtime: 0.15 }, role: 'prevent' },
  '14.3': { weights: { reputation: 0.30, ir: 0.20, restore: 0.20, ccl: 0.10, reg: 0.20 },      role: 'prevent' },
  '14.4': { weights: { reputation: 0.30, ir: 0.20, restore: 0.20, ccl: 0.10, reg: 0.20 },      role: 'prevent' },
  '14.5': { weights: { reputation: 0.25, ir: 0.25, governance: 0.20, reg: 0.20, restore: 0.10 }, role: 'prevent' },
  '14.6': { weights: { ir: 0.45, downtime: 0.25, restore: 0.20, governance: 0.10 },            role: 'detect'  },
  '14.7': { weights: { governance: 0.40, reputation: 0.25, ir: 0.20, reg: 0.15 },              role: 'govern'  },
  '14.8': { weights: { reputation: 0.30, ir: 0.20, ccl: 0.15, reg: 0.20, governance: 0.15 },   role: 'prevent' },
  '14.9': { weights: { reputation: 0.25, ir: 0.25, reg: 0.20, governance: 0.15, restore: 0.15 }, role: 'prevent' },

  // ── CONTROL 15 — Service Provider Management ───────────────────────────────
  '15.1': { weights: { governance: 0.35, reg: 0.30, reputation: 0.20, ir: 0.15 }, role: 'govern'  },
  '15.2': { weights: { governance: 0.30, reg: 0.30, reputation: 0.25, ir: 0.15 }, role: 'govern'  },
  '15.3': { weights: { reg: 0.35, governance: 0.30, reputation: 0.20, ir: 0.15 }, role: 'prevent' },
  '15.4': { weights: { reg: 0.30, governance: 0.30, reputation: 0.25, ir: 0.15 }, role: 'detect'  },
  '15.5': { weights: { ir: 0.45, downtime: 0.25, restore: 0.20, governance: 0.10 }, role: 'mitigate'},
  '15.6': { weights: { governance: 0.40, reg: 0.25, reputation: 0.20, ir: 0.15 },   role: 'govern'  },
  '15.7': { weights: { reg: 0.30, reputation: 0.25, governance: 0.25, notification: 0.20 }, role: 'prevent' },

  // ── CONTROL 16 — Application Software Security ─────────────────────────────
  '16.1':  { weights: { reputation: 0.25, governance: 0.20, reg: 0.20, ir: 0.20, downtime: 0.15 }, role: 'govern'  },
  '16.2':  { weights: { reputation: 0.25, reg: 0.20, governance: 0.20, ir: 0.20, downtime: 0.15 }, role: 'prevent' },
  '16.3':  { weights: { reputation: 0.25, reg: 0.20, ir: 0.20, governance: 0.20, downtime: 0.15 }, role: 'prevent' },
  '16.4':  { weights: { reputation: 0.25, reg: 0.20, ir: 0.25, restore: 0.20, downtime: 0.10 },    role: 'prevent' },
  '16.5':  { weights: { reputation: 0.25, reg: 0.20, ir: 0.25, restore: 0.20, downtime: 0.10 },    role: 'prevent' },
  '16.6':  { weights: { reputation: 0.25, reg: 0.20, ir: 0.25, restore: 0.20, downtime: 0.10 },    role: 'prevent' },
  '16.7':  { weights: { reputation: 0.25, reg: 0.20, ir: 0.25, restore: 0.20, downtime: 0.10 },    role: 'prevent' },
  '16.8':  { weights: { reputation: 0.25, ir: 0.30, restore: 0.20, downtime: 0.25 },               role: 'prevent' },
  '16.9':  { weights: { reputation: 0.25, ir: 0.30, downtime: 0.30, restore: 0.15 },               role: 'prevent' },
  '16.10': { weights: { ir: 0.35, governance: 0.35, reg: 0.20, reputation: 0.10 },                 role: 'govern'  },
  '16.11': { weights: { reputation: 0.25, reg: 0.20, ir: 0.20, governance: 0.20, downtime: 0.15 }, role: 'prevent' },
  '16.12': { weights: { reputation: 0.30, reg: 0.20, ir: 0.20, restore: 0.20, governance: 0.10 },  role: 'prevent' },
  '16.13': { weights: { reputation: 0.25, ir: 0.25, reg: 0.20, governance: 0.20, restore: 0.10 },  role: 'detect'  },
  '16.14': { weights: { reputation: 0.30, governance: 0.25, ir: 0.20, reg: 0.15, restore: 0.10 },  role: 'govern'  },

  // ── CONTROL 17 — Incident Response Management ──────────────────────────────
  '17.1': { weights: { ir: 0.55, downtime: 0.30, governance: 0.15 },                 role: 'mitigate'},
  '17.2': { weights: { ir: 0.55, downtime: 0.30, governance: 0.15 },                 role: 'mitigate'},
  '17.3': { weights: { ir: 0.45, reputation: 0.30, governance: 0.10, ccl: 0.15 },    role: 'mitigate'},
  '17.4': { weights: { ir: 0.40, governance: 0.40, ebi: 0.20 },                      role: 'govern'  },
  '17.5': { weights: { ir: 0.50, downtime: 0.30, governance: 0.20 },                 role: 'mitigate'},
  '17.6': { weights: { ir: 0.50, downtime: 0.30, restore: 0.20 },                    role: 'mitigate'},
  '17.7': { weights: { ir: 0.50, governance: 0.25, downtime: 0.15, reputation: 0.10 }, role: 'detect'  },
  '17.8': { weights: { ir: 0.45, governance: 0.30, downtime: 0.15, reg: 0.10 },      role: 'govern'  },
  '17.9': { weights: { ir: 0.45, downtime: 0.20, reputation: 0.20, restore: 0.15 },  role: 'mitigate'},

  // ── CONTROL 18 — Penetration Testing ───────────────────────────────────────
  '18.1': { weights: { reputation: 0.25, ir: 0.20, downtime: 0.20, restore: 0.20, reg: 0.15 }, role: 'govern'  },
  '18.2': { weights: { reputation: 0.25, ir: 0.25, downtime: 0.25, restore: 0.25 },            role: 'detect'  },
  '18.3': { weights: { reputation: 0.30, downtime: 0.25, ir: 0.20, restore: 0.25 },            role: 'prevent' },
  '18.4': { weights: { ir: 0.30, downtime: 0.25, restore: 0.20, reputation: 0.25 },            role: 'govern'  },
  '18.5': { weights: { ir: 0.30, downtime: 0.25, restore: 0.20, reputation: 0.25 },            role: 'detect'  },
};
