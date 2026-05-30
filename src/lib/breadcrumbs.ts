import type { BreadcrumbItemSpec } from '@/components/ui/cc/page-breadcrumb';

// Top-of-app breadcrumbs, evaluated against the current pathname.
// Add a rule here to attach a breadcrumb trail to a route. The first matching
// rule wins, so order matters when one path is a prefix of another.
const RISK_FOUNDATION: BreadcrumbItemSpec = { label: 'Risk Foundation', href: '/risk-foundation' };

const rules: Array<{ match: (path: string) => boolean; items: BreadcrumbItemSpec[] }> = [
  { match: p => p.startsWith('/risk-foundation/organization-profile'),
    items: [RISK_FOUNDATION, { label: 'Organization Profile' }] },

  { match: p => p.startsWith('/risk-foundation/client-exposure-report-detailed'),
    items: [RISK_FOUNDATION,
            { label: 'Client Exposure Report', href: '/risk-foundation/client-exposure-report' },
            { label: 'Detailed Assessment' }] },

  { match: p => p.startsWith('/risk-foundation/client-exposure-report'),
    items: [RISK_FOUNDATION, { label: 'Client Exposure Report' }] },

  { match: p => p.startsWith('/risk-foundation/client-exposure'),
    items: [RISK_FOUNDATION, { label: 'Client Exposure' }] },

  { match: p => p.startsWith('/risk-foundation/structural-risk-profile/detailed'),
    items: [RISK_FOUNDATION,
            { label: 'Structural Risk Profile', href: '/risk-foundation/structural-risk-profile' },
            { label: 'Detailed' }] },

  { match: p => p.startsWith('/risk-foundation/structural-risk-profile'),
    items: [RISK_FOUNDATION, { label: 'Structural Risk Profile' }] },

  { match: p => p.startsWith('/risk-foundation/financial-exposure-detailed'),
    items: [RISK_FOUNDATION,
            { label: 'Financial Exposure', href: '/risk-foundation/financial-exposure' },
            { label: 'Detailed' }] },

  { match: p => p.startsWith('/risk-foundation/financial-exposure'),
    items: [RISK_FOUNDATION, { label: 'Financial Exposure' }] },

  { match: p => p.startsWith('/risk-foundation/per-safeguard-exposure-details'),
    items: [RISK_FOUNDATION,
            { label: 'Per-Safeguard Financial Exposure', href: '/risk-foundation/per-safeguard-exposure' },
            { label: 'Details' }] },

  { match: p => p.startsWith('/risk-foundation/per-safeguard-exposure'),
    items: [RISK_FOUNDATION, { label: 'Per-Safeguard Financial Exposure' }] },

  // Fallback for the bare /risk-foundation page. Placed last so the more
  // specific child rules above still win.
  { match: p => p === '/risk-foundation' || p.startsWith('/risk-foundation'),
    items: [{ label: 'Risk Foundation' }] },

  { match: p => p.startsWith('/gap/analysis'),
    items: [{ label: 'GAP', href: '/gap' }, { label: 'Analysis' }] },

  { match: p => p.startsWith('/gap/report'),
    items: [{ label: 'GAP', href: '/gap' }, { label: 'Report' }] },

  { match: p => p.startsWith('/gap/definition'),
    items: [{ label: 'GAP', href: '/gap' }, { label: 'Definition' }] },

  { match: p => p === '/gap' || p.startsWith('/gap'),
    items: [{ label: 'GAP' }] },

  { match: p => p.startsWith('/roadmap'),
    items: [{ label: 'Roadmap' }] },

];

export function getBreadcrumb(pathname: string): BreadcrumbItemSpec[] | null {
  for (const rule of rules) {
    if (rule.match(pathname)) return rule.items;
  }
  return null;
}
