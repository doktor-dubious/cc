export type AutoFilledField = {
  source: string;
  confirmedAt: string | null; // ISO date string, or null = unconfirmed
};

export type AutoFilledFields = Record<string, AutoFilledField>;

export type CompanySearchResult = {
  id: string;
  name: string;
  registrationNumber?: string;
  country: string;
  source: string;
  address?: string;
  employees?: string;
  industryDescription?: string;
  // Pre-mapped to our enum values
  legalForm: string | null;
  naceSection: string | null;
  size: string | null;
  geographicScope: string | null;
  ownershipType: string | null;
};

export type CompanyAdapter = {
  search(query: string): Promise<CompanySearchResult[]>;
};
