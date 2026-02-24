'use client';

import { Download, FileSpreadsheet, FileText, Copy, FileJson, FileDown } from 'lucide-react';
import { toast }            from 'sonner';
import { useTranslations }  from 'next-intl';
import { Button }           from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    exportToCSV,
    exportToExcel,
    exportToPDF,
    exportToJSON,
    copyToClipboard,
    type ExportColumn,
} from '@/lib/export';

interface ExportMenuProps
{
    data     : any[];
    columns  : ExportColumn[];
    filename : string;
}

export function ExportMenu({ data, columns, filename }: ExportMenuProps)
{
    const t = useTranslations('Export');

    const handleExport = async (format: string) =>
    {
        try
        {
            switch (format)
            {
                case 'csv':
                    exportToCSV(data, columns, filename);
                    toast.success(t('toast.csvSuccess'));
                    break;
                case 'excel':
                    exportToExcel(data, columns, filename);
                    toast.success(t('toast.excelSuccess'));
                    break;
                case 'pdf':
                    await exportToPDF(data, columns, filename);
                    toast.success(t('toast.pdfSuccess'));
                    break;
                case 'json':
                    exportToJSON(data, filename);
                    toast.success(t('toast.jsonSuccess'));
                    break;
                case 'clipboard':
                    await copyToClipboard(data, columns);
                    toast.success(t('toast.clipboardSuccess'));
                    break;
            }
        }
        catch (err)
        {
            console.error('Export error:', err);
            toast.error(t('toast.exportError'));
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                    <Download className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('formats.csv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {t('formats.excel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('formats.pdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="mr-2 h-4 w-4" />
                    {t('formats.json')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('clipboard')}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('formats.clipboard')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
