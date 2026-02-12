'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface Organization
{
    id      : string;
    name    : string;
    description: string | null;
}

interface OrganizationContextValue
{
    organizations           : Organization[];
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

    // Restore persisted org
    useEffect(() =>
    {
        const stored = localStorage.getItem('activeOrganizationId');
        if (stored)
        {
            const match = organizations.find(o => o.id === stored);
            if (match) setActiveOrganizationState(match);
        }
    }, [organizations]);

    // Default selection
    useEffect(() =>
    {
        if (!activeOrganization && organizations.length > 0)
        {
            setActiveOrganizationState(organizations[0]);
        }
    }, [activeOrganization, organizations]);

    const setActiveOrganization = (org: Organization) =>
    {
        localStorage.setItem('activeOrganizationId', org.id);
        setActiveOrganizationState(org);
    };

    return (
<OrganizationContext.Provider
    value={{ organizations, activeOrganization, setActiveOrganization }}
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

