import jsPDF from 'jspdf';

const COLORS = {
  bg: '#0A0A0A',
  cardBg: '#1A1A1A',
  accent: '#FF6A00',
  white: '#FFFFFF',
  gray: '#888888',
  darkGray: '#2A2A2A',
  border: '#333333',
};

const A4 = { w: 210, h: 297 };
const MARGIN = 15;
const CONTENT_W = A4.w - MARGIN * 2;

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function setColor(pdf: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  pdf.setTextColor(r, g, b);
}

function setFillColor(pdf: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  pdf.setFillColor(r, g, b);
}

function setDrawColor(pdf: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  pdf.setDrawColor(r, g, b);
}

function fillPage(pdf: jsPDF) {
  setFillColor(pdf, COLORS.bg);
  pdf.rect(0, 0, A4.w, A4.h, 'F');
}

function addHeader(pdf: jsPDF) {
  setColor(pdf, COLORS.accent);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DEEPSET', MARGIN, 10);
  setColor(pdf, COLORS.gray);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Alta Performance', MARGIN + 20, 10);
  // Separator
  setDrawColor(pdf, COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, 13, A4.w - MARGIN, 13);
}

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  setDrawColor(pdf, COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, A4.h - 15, A4.w - MARGIN, A4.h - 15);
  setColor(pdf, COLORS.gray);
  pdf.setFontSize(7);
  pdf.text(`DEEPSET — Confidencial`, MARGIN, A4.h - 10);
  pdf.text(`${pageNum}/${totalPages}`, A4.w - MARGIN, A4.h - 10, { align: 'right' });
}

function addNewPage(pdf: jsPDF) {
  pdf.addPage();
  fillPage(pdf);
  addHeader(pdf);
}

function drawCard(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  setFillColor(pdf, COLORS.cardBg);
  pdf.roundedRect(x, y, w, h, 3, 3, 'F');
  setDrawColor(pdf, COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, w, h, 3, 3, 'S');
}

function drawAccentBar(pdf: jsPDF, x: number, y: number, h: number) {
  setFillColor(pdf, COLORS.accent);
  pdf.roundedRect(x, y, 2, h, 1, 1, 'F');
}

function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth);
}

function drawProgressBar(pdf: jsPDF, x: number, y: number, w: number, h: number, value: number) {
  // Background
  setFillColor(pdf, COLORS.darkGray);
  pdf.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  // Fill
  if (value > 0) {
    setFillColor(pdf, COLORS.accent);
    const fillW = Math.max(h, w * (value / 100));
    pdf.roundedRect(x, y, fillW, h, h / 2, h / 2, 'F');
  }
}

// ============ COVER PAGE ============
function addCoverPage(pdf: jsPDF, subtitle: string, userName?: string) {
  fillPage(pdf);
  
  // Decorative accent lines
  setFillColor(pdf, COLORS.accent);
  pdf.rect(0, 0, 4, A4.h, 'F');
  
  // Large accent circle
  setFillColor(pdf, COLORS.accent);
  pdf.circle(A4.w - 30, 60, 40, 'F');
  setFillColor(pdf, COLORS.bg);
  pdf.circle(A4.w - 30, 60, 37, 'F');
  
  // DEEPSET logo
  setColor(pdf, COLORS.accent);
  pdf.setFontSize(48);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DEEPSET', MARGIN + 10, 100);
  
  // Separator
  setFillColor(pdf, COLORS.accent);
  pdf.rect(MARGIN + 10, 108, 60, 2, 'F');
  
  // Subtitle
  setColor(pdf, COLORS.white);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(subtitle, MARGIN + 10, 122);
  
  // Tagline
  setColor(pdf, COLORS.gray);
  pdf.setFontSize(10);
  pdf.text('O sistema de governo que reseta seus bloqueios', MARGIN + 10, 135);
  
  // User info
  if (userName) {
    setColor(pdf, COLORS.white);
    pdf.setFontSize(11);
    pdf.text(`Preparado para: ${userName}`, MARGIN + 10, A4.h - 60);
  }
  
  // Date
  setColor(pdf, COLORS.gray);
  pdf.setFontSize(9);
  const date = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(date, MARGIN + 10, A4.h - 50);
  
  // Confidential
  setFillColor(pdf, COLORS.cardBg);
  pdf.roundedRect(MARGIN + 10, A4.h - 35, 80, 12, 3, 3, 'F');
  setColor(pdf, COLORS.accent);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DOCUMENTO CONFIDENCIAL', MARGIN + 15, A4.h - 27);
}

// ============ SECTION PAGE ============
interface Section {
  title: string;
  content: string;
  type?: 'insight' | 'action' | 'alert' | 'box' | 'checklist';
  icon?: string;
}

function addContentPage(pdf: jsPDF, title: string, sections: Section[], startY: number = 20): number {
  let y = startY;

  // Page title
  setColor(pdf, COLORS.accent);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, MARGIN, y);
  y += 4;
  
  // Title underline
  setFillColor(pdf, COLORS.accent);
  pdf.rect(MARGIN, y, 40, 1.5, 'F');
  y += 10;

  for (const section of sections) {
    const lines = wrapText(pdf, section.content, CONTENT_W - 16);
    const cardH = Math.max(20, lines.length * 5 + 18);

    // Check page break
    if (y + cardH + 10 > A4.h - 20) {
      addNewPage(pdf);
      y = 20;
    }

    // Draw card
    drawCard(pdf, MARGIN, y, CONTENT_W, cardH);

    // Accent bar based on type
    const accentColor = section.type === 'alert' ? '#FF3B30' : 
                        section.type === 'insight' ? COLORS.accent :
                        section.type === 'action' ? '#34C759' : COLORS.accent;
    setFillColor(pdf, accentColor);
    pdf.roundedRect(MARGIN, y, 2.5, cardH, 1, 1, 'F');

    // Section title
    const { r, g, b } = hexToRgb(accentColor);
    pdf.setTextColor(r, g, b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const typeLabel = section.type === 'insight' ? '● INSIGHT' :
                      section.type === 'action' ? '▶ AÇÃO' :
                      section.type === 'alert' ? '⚠ ALERTA' :
                      section.type === 'checklist' ? '☑ CHECKLIST' : '■';
    pdf.text(`${typeLabel}  ${section.title}`, MARGIN + 6, y + 7);

    // Content
    setColor(pdf, COLORS.white);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(lines, MARGIN + 6, y + 14);

    y += cardH + 5;
  }

  return y;
}

// ============ PUBLIC API ============

export interface PDFReportData {
  userName?: string;
  subtitle: string;
  pages: {
    title: string;
    sections: Section[];
  }[];
}

export function generatePremiumPDF(data: PDFReportData, filename: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover
  addCoverPage(pdf, data.subtitle, data.userName);

  // Table of contents
  addNewPage(pdf);
  setColor(pdf, COLORS.accent);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Sumário', MARGIN, 30);
  setFillColor(pdf, COLORS.accent);
  pdf.rect(MARGIN, 34, 30, 1.5, 'F');

  data.pages.forEach((page, i) => {
    const tocY = 45 + i * 12;
    drawCard(pdf, MARGIN, tocY, CONTENT_W, 9);
    setColor(pdf, COLORS.accent);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${String(i + 1).padStart(2, '0')}`, MARGIN + 5, tocY + 6.5);
    setColor(pdf, COLORS.white);
    pdf.setFont('helvetica', 'normal');
    pdf.text(page.title, MARGIN + 18, tocY + 6.5);
  });

  // Content pages
  data.pages.forEach((page) => {
    addNewPage(pdf);
    addContentPage(pdf, page.title, page.sections);
  });

  // Add footers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i - 1, totalPages - 1);
  }

  pdf.save(filename);
}

// Helper to generate Map PDF
export function generateMapPDF(analysis: Record<string, string>, userName?: string) {
  const data: PDFReportData = {
    userName,
    subtitle: 'Mapa da Pessoa — Diagnóstico Profundo',
    pages: [
      {
        title: 'Análise Comportamental',
        sections: [
          { title: 'Análise Comportamental', content: analysis.behavioral_analysis || '', type: 'box' },
          { title: 'Padrão Identificado', content: analysis.pattern || '', type: 'insight' },
        ]
      },
      {
        title: 'Bloqueios e Riscos',
        sections: [
          { title: 'Bloqueio Principal', content: analysis.main_block || '', type: 'alert' },
          { title: 'Previsão Futura', content: analysis.future_prediction || '', type: 'insight' },
        ]
      },
      {
        title: 'Direcionamento',
        sections: [
          { title: 'Direcionamento Estratégico', content: analysis.direction || '', type: 'action' },
        ]
      }
    ]
  };
  generatePremiumPDF(data, 'DeepSet_Mapa_da_Pessoa.pdf');
}

// Helper to generate Report PDF
export function generateReportPDF(report: Record<string, string>, userName?: string) {
  const data: PDFReportData = {
    userName,
    subtitle: 'Relatório Final de Evolução',
    pages: [
      {
        title: 'Antes vs Depois',
        sections: [
          { title: 'Comparativo de Evolução', content: report.antes_vs_depois || '', type: 'insight' },
        ]
      },
      {
        title: 'Padrões Identificados',
        sections: [
          { title: 'Padrões Comportamentais', content: report.padroes_identificados || '', type: 'box' },
        ]
      },
      {
        title: 'Evolução por Fase',
        sections: [
          { title: 'Reset → Recalibração → Domínio', content: report.evolucao || '', type: 'insight' },
        ]
      },
      {
        title: 'Pontos Fortes & Áreas de Melhoria',
        sections: [
          { title: 'Pontos Fortes', content: report.pontos_fortes || '', type: 'action' },
          { title: 'Áreas de Melhoria', content: report.areas_melhoria || '', type: 'alert' },
        ]
      },
      {
        title: 'Recomendações Estratégicas',
        sections: [
          { title: 'Recomendações Pós-Protocolo', content: report.recomendacoes || '', type: 'action' },
        ]
      }
    ]
  };
  generatePremiumPDF(data, 'DeepSet_Relatorio_Final.pdf');
}
