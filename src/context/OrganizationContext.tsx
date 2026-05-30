'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export interface Organization
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : number | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    remoteWorkforce          : string | null;
    previousBreachHistory    : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    manualOperation          : string | null;
    productionDependency     : string | null;
    customerAccess           : string | null;
    businessDaysPerYear      : number | null;
    revenueConcentration     : string | null;
    entityType               : string | null;
    mediaExposure            : boolean | null;
    criticalSocietalRole     : boolean | null;
}

interface OrganizationContextValue
{
    organizations           : Organization[];
    sortedOrganizations     : Organization[];
    activeOrganization      : Organization | null;
    setActiveOrganization   : (org: Organization) => void;
    updateOrganization      : (id: string, patch: Partial<Organization>) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({children, organizations: organizationsProp,}: {
    children: React.ReactNode;
    organizations: Organization[];
})
{
    // Mirror the server-provided list into local state so client mutations (org rename,
    // etc.) are reflected immediately without a page refresh. Re-sync whenever the prop
    // changes — e.g. on navigation, where the layout re-runs and returns fresh data.
    const [organizations, setOrganizations] = useState<Organization[]>(organizationsProp);
    useEffect(() => { setOrganizations(organizationsProp); }, [organizationsProp]);

    const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);
    const [selectionHistory, setSelectionHistory] = useState<Record<string, number>>({});

    // Read selection history from localStorage
    const getSelectionHistory = (): Record<string, number> =>
    {
        try
        {
            const raw = localStorage.getItem('orgSelectionHistory');
            return raw ? JSON.parse(raw) : {};
        }
        catch { return {}; }
    };

    // Push the active org to the server. Fire-and-forget: localStorage is the instant
    // source of truth; server is a best-effort sync so SSR pages see the same selection.
    // Skips when the server already has this id (tracked via a separate localStorage key).
    const syncActiveOrgToServer = (orgId: string) =>
    {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem('activeOrganizationIdSynced') === orgId) return;

        void fetch('/api/profile/active-organization', {
            method  : 'PATCH',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ organizationId: orgId }),
        })
            .then(res => { if (res.ok) localStorage.setItem('activeOrganizationIdSynced', orgId); })
            .catch(() => { /* offline / expired session — leave server stale */ });
    };

    // Restore persisted org or default to first
    useEffect(() =>
    {
        if (organizations.length === 0) return;

        const history = getSelectionHistory();
        setSelectionHistory(history);

        const stored = localStorage.getItem('activeOrganizationId');
        if (stored)
        {
            const match = organizations.find(o => o.id === stored);
            if (match)
            {
                setActiveOrganizationState(match);
                syncActiveOrgToServer(match.id);
                return;
            }
        }

        setActiveOrganizationState(organizations[0]);
        syncActiveOrgToServer(organizations[0].id);
    }, [organizations]);

    // Organizations sorted by most recently selected
    const sortedOrganizations = useMemo(() =>
    {
        return [...organizations].sort((a, b) =>
        {
            const tsA = selectionHistory[a.id] || 0;
            const tsB = selectionHistory[b.id] || 0;
            return tsB - tsA;
        });
    }, [organizations, selectionHistory]);

    const setActiveOrganization = (org: Organization) =>
    {
        localStorage.setItem('activeOrganizationId', org.id);

        const updated = { ...selectionHistory, [org.id]: Date.now() };
        localStorage.setItem('orgSelectionHistory', JSON.stringify(updated));
        setSelectionHistory(updated);

        setActiveOrganizationState(org);

        syncActiveOrgToServer(org.id);
    };

    // Patch an organization's fields in-place. Used by edit pages (e.g. organization-profile)
    // so the sidebar/switcher reflect renames immediately, without waiting for navigation.
    const updateOrganization = (id: string, patch: Partial<Organization>) =>
    {
        setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
        setActiveOrganizationState(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
    };

    return (
<OrganizationContext.Provider
    value={{ organizations, sortedOrganizations, activeOrganization, setActiveOrganization, updateOrganization }}
>
    {children}
</OrganizationContext.Provider>
  );
}

export const useOrganization = () =>
{
    const ctx = useContext(OrganizationContext);
    if (!ctx)
    {
        throw new Error('useOrganization must be used within OrganizationProvider');
    }

    return ctx;
};

