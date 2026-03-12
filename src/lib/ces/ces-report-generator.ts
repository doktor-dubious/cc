import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';

export type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Severe';

export type CesCategoryReport = {
    name        : string;
    score       : number; // 0-100
    riskLevel   : RiskLevel;
    findings    : string[];
};

export type CesReport = {
    companyId       : string;
    companyName     : string;
    generatedDate   : string;
    overallScore    : number; // 0-100
    riskLevel       : RiskLevel;
    categories      : CesCategoryReport[];
    recommendations : string[];
};

// ── Scoring helpers ──────────────────────────────────────────────────────────

function scoreToRiskLevel(score: number): RiskLevel
{
    if (score < 20) return 'Low';
    if (score < 40) return 'Moderate';
    if (score < 60) return 'Elevated';
    if (score < 80) return 'High';
    return 'Severe';
}

function avg(...scores: number[]): number
{
    const valid = scores.filter(s => s >= 0);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ── Category 1: Regulatory & Compliance ─────────────────────────────────────

function scoreRegulatory(c: ThirdPartyCompanyObj): CesCategoryReport
{
    const findings: string[] = [];
    const scores: number[] = [];

    // regulatoryFramework
    const frameworkScore: Record<string, number> = {
        NIS2_ESSENTIAL : 90,
        NIS2_IMPORTANT : 70,
        FINANCIAL      : 75,
        HEALTH         : 70,
        PUBLIC         : 60,
        LISTED         : 65,
        ENTERPRISE     : 45,
        DATACENTER     : 55,
        SAAS           : 50,
        NON_REG_SME    : 20,
    };
    if (c.regulatoryFramework)
    {
        const s = frameworkScore[c.regulatoryFramework] ?? 30;
        scores.push(s);
        if (s >= 70) findings.push(`Customer operates under ${c.regulatoryFramework.replace(/_/g, ' ')} — high regulatory burden.`);
    }

    // dedicatedCompliance = false → risk
    if (c.dedicatedCompliance === false)
    {
        scores.push(60);
        findings.push('No dedicated compliance function — increased risk of unmanaged obligations.');
    }
    else if (c.dedicatedCompliance === true)
    {
        scores.push(20);
    }

    // partOfGroup — group structures can increase exposure
    if (c.partOfGroup === true)
    {
        scores.push(45);
        findings.push('Part of a corporate group — potential shared liability and cross-entity exposure.');
    }
    else if (c.partOfGroup === false)
    {
        scores.push(20);
    }

    // listedOrPeOwned — higher scrutiny
    if (c.listedOrPeOwned === true)
    {
        scores.push(55);
        findings.push('Listed or PE-owned — elevated governance and reporting obligations.');
    }
    else if (c.listedOrPeOwned === false)
    {
        scores.push(15);
    }

    const score = avg(...scores);
    return { name: 'Regulatory & Compliance', score, riskLevel: scoreToRiskLevel(score), findings };
}

// ── Category 2: Contractual Risk ────────────────────────────────────────────

function scoreContractual(c: ThirdPartyCompanyObj): CesCategoryReport
{
    const findings: string[] = [];
    const scores: number[] = [];

    if (c.standardContract === false)
    {
        scores.push(65);
        findings.push('No standard contract — bespoke terms increase legal exposure.');
    }
    else if (c.standardContract === true) scores.push(20);

    if (c.slaIncluded === false)
    {
        scores.push(55);
        findings.push('No SLA — service levels and remedies are undefined.');
    }
    else if (c.slaIncluded === true) scores.push(15);

    if (c.professionalProcurement === false)
    {
        scores.push(50);
        findings.push('No professional procurement process — higher risk of supplier non-compliance.');
    }
    else if (c.professionalProcurement === true) scores.push(10);

    const score = avg(...scores);
    return { name: 'Contractual Risk', score, riskLevel: scoreToRiskLevel(score), findings };
}

// ── Category 3: Operational Exposure ─────────────────────────────────────────

function scoreOperational(c: ThirdPartyCompanyObj): CesCategoryReport
{
    const findings: string[] = [];
    const scores: number[] = [];

    const triStateScore: Record<string, number> = { NO: 15, PARTLY: 45, YES: 80 };

    if (c.deliversToRegulated)
    {
        const s = triStateScore[c.deliversToRegulated];
        scores.push(s);
        if (s >= 45) findings.push('Delivers to regulated entities — downstream regulatory obligations apply.');
    }

    if (c.deliversToPublicInfra === true)
    {
        scores.push(80);
        findings.push('Delivers to public infrastructure — critical service disruption risk.');
    }
    else if (c.deliversToPublicInfra === false) scores.push(10);

    if (c.internationalOps === true)
    {
        scores.push(50);
        findings.push('International operations — cross-border legal and operational complexity.');
    }
    else if (c.internationalOps === false) scores.push(15);

    if (c.coreDigital)
    {
        const s = triStateScore[c.coreDigital];
        scores.push(s);
        if (s >= 45) findings.push('Core business is digital — high exposure to cyber incidents.');
    }

    const depScore: Record<string, number> = { LOW: 20, MODERATE: 50, HIGH: 80 };
    if (c.itDependency)
    {
        const s = depScore[c.itDependency];
        scores.push(s);
        if (s >= 50) findings.push(`${c.itDependency} IT dependency — significant operational risk if systems fail.`);
    }

    const score = avg(...scores);
    return { name: 'Operational Exposure', score, riskLevel: scoreToRiskLevel(score), findings };
}

// ── Category 4: Brand & Societal ─────────────────────────────────────────────

function scoreBrand(c: ThirdPartyCompanyObj): CesCategoryReport
{
    const findings: string[] = [];
    const scores: number[] = [];

    if (c.publicBrand === true)
    {
        scores.push(60);
        findings.push('Strong public brand — reputational damage from association is amplified.');
    }
    else if (c.publicBrand === false) scores.push(15);

    if (c.criticalSocietalRole === true)
    {
        scores.push(85);
        findings.push('Critical societal role — disruption has broad societal consequences.');
    }
    else if (c.criticalSocietalRole === false) scores.push(10);

    if (c.mediaExposure === true)
    {
        scores.push(55);
        findings.push('High media exposure — incidents become public quickly.');
    }
    else if (c.mediaExposure === false) scores.push(10);

    const score = avg(...scores);
    return { name: 'Brand & Societal', score, riskLevel: scoreToRiskLevel(score), findings };
}

// ── Category 5: Technical Access & Data ──────────────────────────────────────

function scoreTechnical(c: ThirdPartyCompanyObj): CesCategoryReport
{
    const findings: string[] = [];
    const scores: number[] = [];

    const deliveryScore: Record<string, number> = {
        ADVISORY                : 20,
        SOFTWARE                : 55,
        HOSTING                 : 60,
        MANAGED_IT              : 70,
        OPERATE_CRITICAL_SYSTEM : 90,
        SUBSUPPLIER             : 40,
    };
    if (c.deliveryRole)
    {
        const s = deliveryScore[c.deliveryRole];
        scores.push(s);
        if (s >= 55) findings.push(`Delivery role: ${c.deliveryRole.replace(/_/g, ' ')} — direct system access increases exposure.`);
    }

    const accessScore: Record<string, number> = {
        NONE         : 5,
        READ_ONLY    : 25,
        REMOTE       : 50,
        PRIVILEGED   : 75,
        FULL_CONTROL : 95,
    };
    if (c.accessLevel)
    {
        const s = accessScore[c.accessLevel];
        scores.push(s);
        if (s >= 50) findings.push(`Access level: ${c.accessLevel.replace(/_/g, ' ')} — privileged or full access presents serious risk.`);
    }

    const dataScore: Record<string, number> = {
        NONE              : 5,
        PERSONAL          : 45,
        SENSITIVE         : 65,
        BUSINESS_CRITICAL : 80,
        SOCIETAL_CRITICAL : 95,
    };
    if (c.dataHandled)
    {
        const s = dataScore[c.dataHandled];
        scores.push(s);
        if (s >= 45) findings.push(`Handles ${c.dataHandled.replace(/_/g, ' ').toLowerCase()} data — data breach impact is significant.`);
    }

    const disruptionScore: Record<string, number> = {
        NONE                   : 5,
        TEMPORARY              : 30,
        OPERATIONAL_DISRUPTION : 60,
        PRODUCTION_STOP        : 80,
        SOCIETAL_CRITICAL      : 95,
    };
    if (c.disruptionImpact)
    {
        const s = disruptionScore[c.disruptionImpact];
        scores.push(s);
        if (s >= 60) findings.push(`Disruption impact: ${c.disruptionImpact.replace(/_/g, ' ')} — outage would severely affect operations.`);
    }

    const scmScore: Record<string, number> = {
        DIRECT               : 50,
        SUBSUPPLIER          : 35,
        CRITICAL_SUBSUPPLIER : 80,
        INTEGRATED           : 70,
    };
    if (c.supplyChainRole)
    {
        const s = scmScore[c.supplyChainRole];
        scores.push(s);
        if (s >= 70) findings.push(`Supply chain role: ${c.supplyChainRole.replace(/_/g, ' ')} — deeply embedded supplier risk.`);
    }

    const score = avg(...scores);
    return { name: 'Technical Access & Data', score, riskLevel: scoreToRiskLevel(score), findings };
}

// ── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(categories: CesCategoryReport[], overall: RiskLevel): string[]
{
    const recs: string[] = [];

    for (const cat of categories)
    {
        if (cat.score >= 60)
        {
            if (cat.name === 'Regulatory & Compliance')
                recs.push('Conduct a compliance gap assessment for this customer and establish a shared compliance roadmap.');
            if (cat.name === 'Contractual Risk')
                recs.push('Review and strengthen contract terms: include SLAs, data processing agreements, and liability caps.');
            if (cat.name === 'Operational Exposure')
                recs.push('Perform a business continuity review and ensure robust incident response procedures are in place.');
            if (cat.name === 'Brand & Societal')
                recs.push('Develop a crisis communications protocol specific to this customer relationship.');
            if (cat.name === 'Technical Access & Data')
                recs.push('Apply least-privilege access controls and conduct a data classification review for all shared data.');
        }
    }

    if (overall === 'High' || overall === 'Severe')
    {
        recs.push('Schedule an executive risk review with senior stakeholders for this customer relationship.');
        recs.push('Consider third-party risk insurance or contractual indemnification clauses.');
    }

    if (recs.length === 0)
    {
        recs.push('Maintain current controls and conduct an annual review of this customer exposure profile.');
    }

    return recs;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateCesReport(company: ThirdPartyCompanyObj): CesReport
{
    const categories = [
        scoreRegulatory(company),
        scoreContractual(company),
        scoreOperational(company),
        scoreBrand(company),
        scoreTechnical(company),
    ];

    // Category weights
    const weights = [0.25, 0.15, 0.25, 0.10, 0.25];
    const overallScore = Math.round(
        categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0)
    );
    const riskLevel = scoreToRiskLevel(overallScore);
    const recommendations = buildRecommendations(categories, riskLevel);

    return {
        companyId     : company.id,
        companyName   : company.name,
        generatedDate : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        overallScore,
        riskLevel,
        categories,
        recommendations,
    };
}
