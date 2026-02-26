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
    revenueRange             : string | null;
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
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
}

interface OrganizationContextValue
{
    organizations           : Organization[];
    sortedOrganizations     : Organization[];
    activeOrganization      : Organization | null;
    setActiveOrganization   : (org: Organization) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({children, organizations,}: {
    children: React.ReactNode;
    organizations: Organization[];
})
{
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
                return;
            }
        }

        setActiveOrganizationState(organizations[0]);
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
    };

    return (
<OrganizationContext.Provider
    value={{ organizations, sortedOrganizations, activeOrganization, setActiveOrganization }}
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

