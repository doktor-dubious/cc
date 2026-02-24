// src/lib/export.ts — Client-side table data export utilities

import * as XLSX    from 'xlsx';
import { saveAs }   from 'file-saver';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExportColumn
{
    header   : string;
    accessor : string | ((row: any) => string);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveValue(row: any, accessor: string | ((row: any) => string)): string
{
    if (typeof accessor === 'function') return accessor(row);
    return accessor.split('.').reduce((obj, key) => obj?.[key], row)?.toString() ?? '';
}

function buildMatrix(data: any[], columns: ExportColumn[]): string[][]
{
    const headers = columns.map(c => c.header);
    const rows    = data.map(row => columns.map(col => resolveValue(row, col.accessor)));
    return [headers, ...rows];
}

function escapeCSV(value: string): string
{
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r'))
    {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

function triggerDownload(blob: Blob, filename: string): void
{
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ── Export functions ─────────────────────────────────────────────────────────

export function exportToCSV(data: any[], columns: ExportColumn[], filename: string): void
{
    const matrix = buildMatrix(data, columns);
    const csv    = matrix.map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename + '.csv');
}

export function exportToExcel(data: any[], columns: ExportColumn[], filename: string): void
{
    const matrix    = buildMatrix(data, columns);
    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), filename + '.xlsx');
}

export async function exportToPDF(data: any[], columns: ExportColumn[], filename: string): Promise<void>
{
    const jspdfModule = await import('jspdf');
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
    const autotableModule = await import('jspdf-autotable');
    const autoTable = autotableModule.default || autotableModule.applyPlugin;

    const matrix  = buildMatrix(data, columns);
    const headers = matrix[0];
    const body    = matrix.slice(1);

    const doc = new jsPDF();

    if (typeof autoTable === 'function')
    {
        autoTable(doc, {
            head: [headers],
            body: body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });
    }
    else
    {
        (doc as any).autoTable({
            head: [headers],
            body: body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });
    }

    doc.save(filename + '.pdf');
}

export function exportToJSON(data: any[], filename: string): void
{
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, filename + '.json');
}

export async function copyToClipboard(data: any[], columns: ExportColumn[]): Promise<void>
{
    const matrix = buildMatrix(data, columns);
    const text   = matrix.map(row => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(text);
}
