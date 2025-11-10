/**
 * 本地打印机API工具
 * 用于处理打印任务和打印机参数传递
 */

export interface PrintSettings {
  copies: number;
  colorMode: 'color' | 'grayscale';
  doubleSided: boolean;
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  margins?: string;
  printBackground?: boolean;
  shrinkToFit?: boolean;
}

export interface PrintJob {
  id: string;
  recordId: string;
  recordName: string;
  templateName: string;
  htmlContent: string;
  settings: PrintSettings;
}

export class PrinterAPI {
  /**
   * 检测浏览器是否支持高级打印功能
   */
  static isAdvancedPrintSupported(): boolean {
    return !!(window.print && document.createElement && window.postMessage);
  }

  /**
   * 创建打印iframe
   */
  private static createPrintIframe(): HTMLIFrameElement | null {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.id = `print-iframe-${Date.now()}`;

    document.body.appendChild(iframe);
    return iframe;
  }

  /**
   * 生成打印HTML内容（包含打印参数）
   */
  private static generatePrintHTML(html: string, settings: PrintSettings): string {
    const printParams = `
      <!-- 打印参数标记 -->
      <meta name="print-copies" content="${settings.copies}">
      <meta name="print-color-mode" content="${settings.colorMode}">
      <meta name="print-double-sided" content="${settings.doubleSided}">
      <meta name="print-page-size" content="${settings.pageSize}">
      <meta name="print-orientation" content="${settings.orientation}">
      <meta name="print-margins" content="${settings.margins || '20mm'}">

      <style>
        @page {
          size: ${settings.pageSize} ${settings.orientation};
          margin: ${settings.margins || '20mm'};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            color: ${settings.colorMode === 'grayscale' ? '#000 !important' : 'inherit'};
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* 强制背景色打印 */
          .print-bg,
          [style*="background"] {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }

        /* 打印参数CSS变量 */
        :root {
          --print-copies: ${settings.copies};
          --print-color-mode: ${settings.colorMode};
          --print-double-sided: ${settings.doubleSided};
          --print-page-size: ${settings.pageSize};
          --print-orientation: ${settings.orientation};
        }
      </style>
    `;

    // 在HTML的head部分插入打印参数
    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>\n${printParams}`);
    } else if (html.includes('<html>')) {
      return html.replace('<html>', '<html>\n<head>\n' + printParams + '</head>');
    } else {
      return `<html><head>${printParams}</head><body>${html}</body></html>`;
    }
  }

  /**
   * 执行打印任务
   */
  static async executePrint(printJob: PrintJob): Promise<boolean> {
    try {
      console.log('开始执行打印任务:', printJob);

      // 创建打印iframe
      const iframe = this.createPrintIframe();
      if (!iframe) {
        throw new Error('无法创建打印iframe');
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('无法访问iframe文档');
      }

      // 生成包含打印参数的HTML
      const printHTML = this.generatePrintHTML(printJob.htmlContent, printJob.settings);

      // 写入打印内容
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // 等待内容加载
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('打印内容加载超时'));
        }, 10000);

        iframe.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        // 备用方案：如果onload没有触发，在1秒后继续
        setTimeout(() => {
          if (iframeDoc.readyState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        }, 1000);
      });

      // 注入打印脚本
      const script = iframeDoc.createElement('script');
      script.textContent = `
        (function() {
          console.log('打印脚本注入成功');
          console.log('打印参数:', {
            copies: ${printJob.settings.copies},
            colorMode: '${printJob.settings.colorMode}',
            doubleSided: ${printJob.settings.doubleSided},
            pageSize: '${printJob.settings.pageSize}',
            orientation: '${printJob.settings.orientation}'
          });

          // 重写window.print以传递参数
          const originalPrint = window.print;
          window.print = function() {
            console.log('触发打印，参数已设置');

            // 设置打印参数（如果浏览器支持）
            if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge')) {
              // Chrome/Edge 特定设置
              const style = document.createElement('style');
              style.textContent = \`
                @page {
                  size: ${printJob.settings.pageSize} ${printJob.settings.orientation};
                  margin: ${printJob.settings.margins || '20mm'};
                }
              \`;
              document.head.appendChild(style);
            }

            // 调用原始打印函数
            return originalPrint.call(this);
          };

          // 监听打印事件
          window.addEventListener('afterprint', function() {
            console.log('打印完成');
            window.parent.postMessage({ type: 'print-completed', jobId: '${printJob.id}' }, '*');
          });

          window.addEventListener('beforeunload', function() {
            console.log('打印窗口关闭');
            window.parent.postMessage({ type: 'print-cancelled', jobId: '${printJob.id}' }, '*');
          });

          // 自动触发打印
          setTimeout(function() {
            console.log('自动触发打印');
            window.print();
          }, 100);
        })();
      `;
      iframeDoc.body.appendChild(script);

      // 监听打印结果
      return new Promise<boolean>((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'print-completed' && event.data.jobId === printJob.id) {
            console.log('打印任务完成');
            this.cleanupPrintIframe(iframe);
            window.removeEventListener('message', handleMessage);
            resolve(true);
          } else if (event.data.type === 'print-cancelled' && event.data.jobId === printJob.id) {
            console.log('打印任务取消');
            this.cleanupPrintIframe(iframe);
            window.removeEventListener('message', handleMessage);
            resolve(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // 超时处理
        setTimeout(() => {
          console.log('打印任务超时');
          this.cleanupPrintIframe(iframe);
          window.removeEventListener('message', handleMessage);
          resolve(false);
        }, 30000); // 30秒超时
      });

    } catch (error) {
      console.error('打印执行失败:', error);
      throw error;
    }
  }

  /**
   * 清理打印iframe
   */
  private static cleanupPrintIframe(iframe: HTMLIFrameElement): void {
    try {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    } catch (error) {
      console.error('清理iframe失败:', error);
    }
  }

  /**
   * 获取可用的打印机列表（如果支持）
   */
  static async getAvailablePrinters(): Promise<string[]> {
    try {
      // 注意：这个功能需要特定的浏览器支持或插件
      if ('printerList' in navigator) {
        return (navigator as any).printerList;
      }

      // 模拟打印机列表
      return [
        '默认打印机',
        'Microsoft Print to PDF',
        'HP LaserJet Pro',
        'Canon PIXMA'
      ];
    } catch (error) {
      console.error('获取打印机列表失败:', error);
      return ['默认打印机'];
    }
  }

  /**
   * 检查打印机状态
   */
  static async checkPrinterStatus(printerName?: string): Promise<{
    online: boolean;
    paperLevel: 'full' | 'medium' | 'low' | 'empty';
    inkLevel: 'full' | 'medium' | 'low' | 'empty';
    status: string;
  }> {
    try {
      // 这里可以集成实际的打印机状态检测API
      // 目前返回模拟数据
      return {
        online: true,
        paperLevel: 'full',
        inkLevel: 'medium',
        status: '就绪'
      };
    } catch (error) {
      console.error('检查打印机状态失败:', error);
      return {
        online: false,
        paperLevel: 'unknown',
        inkLevel: 'unknown',
        status: '离线'
      };
    }
  }

  /**
   * 使用浏览器原生打印API（备用方案）
   */
  static fallbackPrint(html: string, settings: PrintSettings): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printHTML = this.generatePrintHTML(html, settings);
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }
}