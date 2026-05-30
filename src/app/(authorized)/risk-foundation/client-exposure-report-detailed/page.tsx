'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type CesReport, type RiskLevel } from '@/lib/ces/ces-report-generator';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Low      : { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Moderate : { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Elevated : { bg: '#d97706', text: '#ffffff', border: '#d97706' },
  High     : { bg: '#ad423f', text: '#ffffff', border: '#ad423f' },
  Severe   : { bg: '#7f1d1d', text: '#ffffff', border: '#7f1d1d' },
};

const MENU_BTN_CLASS =
  'cursor-pointer rounded-none border-b-2 border-transparent ' +
  'hover:border-foreground hover:bg-transparent';

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = RISK_COLORS[level];
  return (
    <Badge
      variant="outline"
      className="font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {level}
    </Badge>
  );
}

function CesReportDetailedContent() {
  const t      = useTranslations('CES');
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [company, setCompany]     = useState<ThirdPartyCompanyObj | null>(null);
  const [report, setReport]       = useState<CesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detailed view reads the same persisted report as the summary so the two
  // stay in sync. If no report has been generated yet, the summary page is
  // where the user can produce one.
  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const [companyRes, reportRes] = await Promise.all([
          fetch(`/api/third-party/${id}`),
          fetch(`/api/client-exposure-report?thirdPartyCompanyId=${id}`),
        ]);
        const companyJson = await companyRes.json();
        const reportJson  = await reportRes.json();
        if (cancelled) return;

        if (companyJson.success && companyJson.data) {
          setCompany(companyJson.data);
        }
        if (reportJson.success && reportJson.data) {
          setReport(reportJson.data.report as CesReport);
        }
      }
      catch {
        if (cancelled) return;
        toast.error('Failed to load report');
      }
      finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!id || !company) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Company not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/risk-foundation')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No client exposure report yet</p>
          <p className="text-sm mt-1">
            Generate the report for <span className="font-semibold text-foreground">{company.name}</span> first.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/risk-foundation/client-exposure-report?id=${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 max-w-4xl mx-auto print:p-4">
        <div className="flex items-start justify-between gap-6 mb-2">
          <h1 className="text-2xl font-bold">Detailed Assessment</h1>

          <div className="flex items-center gap-2 print:hidden shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={MENU_BTN_CLASS}
              onClick={() => router.push(`/risk-foundation/client-exposure-report?id=${id}`)}
            >
              Back to Report
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          Category-level breakdown for <span className="font-semibold text-foreground">{report.companyName}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t('report.generated')}: {report.generatedDate}
        </p>

        <Separator className="my-6" />

        <section className="mb-10">
          <h3 className="text-lg font-semibold italic mb-4">{t('report.categories')}</h3>
          <div className="space-y-4">
            {report.categories.map(cat => (
              <div key={cat.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground tabular-nums">{cat.score}/100</span>
                    <RiskBadge level={cat.riskLevel} />
                  </div>
                </div>
                {cat.findings.length > 0 ? (
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {cat.findings.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t('report.noFindings')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 2cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function CesReportDetailedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CesReportDetailedContent />
    </Suspense>
  );
}
