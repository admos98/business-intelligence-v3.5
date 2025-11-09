// FIX: Add missing React import
import React from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../translations';

declare const jspdf: any;
declare const html2canvas: any;

const applyPrintStyles = (): HTMLStyleElement => {
  const styleId = 'pdf-print-styles';
  let style = document.getElementById(styleId) as HTMLStyleElement;
  if (style) return style;

  style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    .pdf-render-container {
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-render-container * {
      background-color: transparent !important;
      color: #000000 !important;
      border-color: #dee2e6 !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
  return style;
};

const createAndRenderComponent = (
  component: React.ReactElement
): { container: HTMLElement; root: ReactDOM.Root } => {
  const container = document.createElement('div');
  container.id = `pdf-container-${Date.now()}`;
  Object.assign(container.style, {
    position: 'absolute',
    top: '0',
    left: '-9999px', // Position off-screen instead of using opacity
    width: '210mm', // A4 width
    fontFamily: "'Vazirmatn', sans-serif",
  });
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(component);

  return { container, root };
};

const cleanupComponent = (container: HTMLElement, root: ReactDOM.Root) => {
  root.unmount();
  document.body.removeChild(container);
};

export const exportComponentAsPdf = async (
  component: React.ReactElement,
  filename: string
): Promise<void> => {
  const styleElement = applyPrintStyles();
  const { container, root } = createAndRenderComponent(component);

  // Give React a moment to render and for images to load
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const { jsPDF } = jspdf;
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasAspectRatio = canvas.width / canvas.height;

    const imgWidth = pdfWidth;
    const imgHeight = imgWidth / canvasAspectRatio;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw new Error(`${t.downloadingPdf} failed.`);
  } finally {
    cleanupComponent(container, root);
    styleElement.remove();
  }
};

export const exportElementAsPdf = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
    const styleElement = applyPrintStyles();
    element.classList.add('pdf-render-container');

    // Give a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasAspectRatio = canvas.width / canvas.height;

        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / canvasAspectRatio;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(filename);
    } catch (error) {
        console.error("PDF generation failed:", error);
        throw new Error(`${t.downloadingPdf} failed.`);
    } finally {
        element.classList.remove('pdf-render-container');
        styleElement.remove();
    }
}