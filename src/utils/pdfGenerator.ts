/**
 * PDF生成工具
 * 用于将HTML内容转换为PDF格式，确保预览和打印效果一致
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import templateDataManager from './templateDataManager';

export interface PDFSettings {
  pageSize: 'A4' | 'A3' | 'A5';
  orientation: 'portrait' | 'landscape';
  copies: number;
  colorMode: 'color' | 'grayscale';
  doubleSided: boolean;
  scale?: number; // 缩放比例，默认1.0
}

export class PDFGenerator {
  private static PAGE_SIZES = {
    A4: { width: 210, height: 297 }, // mm
    A3: { width: 297, height: 420 }, // mm
    A5: { width: 148, height: 210 }, // mm
  };

  /**
   * 生成PDF预览
   * @param templateId 模板ID
   * @param data 数据
   * @param settings PDF设置
   * @returns PDF Blob对象
   */
  static async generatePDFPreview(
    templateId: string,
    data: Record<string, any>,
    settings: PDFSettings
  ): Promise<Blob> {
    const template = templateDataManager.getTemplateById(templateId);
    if (!template) {
      throw new Error('模板不存在');
    }

    // 生成HTML内容
    const htmlContent = templateDataManager.generatePrintHTML(templateId, data);

    // 创建临时容器
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: ${this.PAGE_SIZES[settings.pageSize].width}mm;
      min-height: ${this.PAGE_SIZES[settings.pageSize].height}mm;
      background: white;
      padding: 20mm;
      box-sizing: border-box;
    `;
    tempContainer.innerHTML = htmlContent;

    document.body.appendChild(tempContainer);

    try {
      // 转换为Canvas
      const canvas = await html2canvas(tempContainer, {
        scale: settings.scale || 2, // 高清输出
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: this.PAGE_SIZES[settings.pageSize].width * 3.78, // mm to px (96dpi: 1mm ≈ 3.78px)
        height: this.PAGE_SIZES[settings.pageSize].height * 3.78,
      });

      // 创建PDF
      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.pageSize,
      });

      // 计算图片尺寸
      const imgWidth = this.PAGE_SIZES[settings.pageSize].width - 40; // 减去左右边距
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 添加图片到PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);

      // 生成PDF Blob
      const pdfBlob = pdf.output('blob');

      return pdfBlob;
    } finally {
      // 清理临时容器
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * 生成打印用的PDF
   * @param templateId 模板ID
   * @param data 数据
   * @param settings PDF设置
   * @param copies 打印份数
   * @returns PDF Blob对象（包含多份）
   */
  static async generatePrintPDF(
    templateId: string,
    data: Record<string, any>,
    settings: PDFSettings,
    copies: number = 1
  ): Promise<Blob> {
    if (copies <= 1) {
      return this.generatePDFPreview(templateId, data, settings);
    }

    const template = templateDataManager.getTemplateById(templateId);
    if (!template) {
      throw new Error('模板不存在');
    }

    // 生成HTML内容
    const htmlContent = templateDataManager.generatePrintHTML(templateId, data);

    // 创建临时容器
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: ${this.PAGE_SIZES[settings.pageSize].width}mm;
      min-height: ${this.PAGE_SIZES[settings.pageSize].height}mm;
      background: white;
      padding: 20mm;
      box-sizing: border-box;
    `;
    tempContainer.innerHTML = htmlContent;

    document.body.appendChild(tempContainer);

    try {
      // 转换为Canvas
      const canvas = await html2canvas(tempContainer, {
        scale: settings.scale || 3, // 打印质量更高
        useCORS: true,
        logging: false,
        backgroundColor: settings.colorMode === 'grayscale' ? '#ffffff' : '#ffffff',
        width: this.PAGE_SIZES[settings.pageSize].width * 3.78,
        height: this.PAGE_SIZES[settings.pageSize].height * 3.78,
      });

      // 如果是灰度模式，处理图片
      let imgData = canvas.toDataURL('image/png');
      if (settings.colorMode === 'grayscale') {
        imgData = await this.convertToGrayscale(canvas);
      }

      // 创建PDF
      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.pageSize,
      });

      // 计算图片尺寸
      const imgWidth = this.PAGE_SIZES[settings.pageSize].width - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 添加多份到PDF
      for (let i = 0; i < copies; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
      }

      return pdf.output('blob');
    } finally {
      // 清理临时容器
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * 转换为灰度图像
   * @param canvas Canvas元素
   * @returns 灰度图像的Data URL
   */
  private static async convertToGrayscale(canvas: HTMLCanvasElement): Promise<string> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 转换为灰度
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;     // red
      data[i + 1] = gray; // green
      data[i + 2] = gray; // blue
      // alpha通道保持不变
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * 获取PDF的预览URL
   * @param pdfBlob PDF Blob对象
   * @returns PDF URL
   */
  static getPDFURL(pdfBlob: Blob): string {
    return URL.createObjectURL(pdfBlob);
  }

  /**
   * 清理PDF URL
   * @param url PDF URL
   */
  static cleanupPDFURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * 直接打印PDF
   * @param pdfBlob PDF Blob对象
   */
  static async printPDF(pdfBlob: Blob): Promise<void> {
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          URL.revokeObjectURL(url);
        }, 500);
      };
    } else {
      URL.revokeObjectURL(url);
      throw new Error('无法打开打印窗口');
    }
  }

  /**
   * 下载PDF文件
   * @param pdfBlob PDF Blob对象
   * @param filename 文件名
   */
  static downloadPDF(pdfBlob: Blob, filename: string): void {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export default PDFGenerator;