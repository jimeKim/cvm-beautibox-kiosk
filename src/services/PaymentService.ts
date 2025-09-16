import { Order } from '@/types';

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  method: 'card' | 'mobile' | 'qr' | 'cash';
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  approvalNumber?: string;
  error?: string;
  errorCode?: string;
  receiptData?: string;
}

export interface PaymentTerminal {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  cancelPayment(transactionId: string): Promise<PaymentResponse>;
  getStatus(): Promise<'connected' | 'disconnected' | 'busy' | 'error'>;
}

// 카드 결제 단말기 (RS232 통신)
export class CardPaymentTerminal implements PaymentTerminal {
  private port: any = null;
  private isConnected = false;

  async connect(): Promise<boolean> {
    try {
      // Electron에서 시리얼 포트 연결
      if (window.electronAPI?.serialPort) {
        this.port = await window.electronAPI.serialPort.open({
          path: 'COM1', // 설정 가능
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        });
        this.isConnected = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('카드 단말기 연결 실패:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      await this.port.close();
      this.isConnected = false;
    }
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        error: '단말기가 연결되지 않았습니다',
        errorCode: 'TERMINAL_NOT_CONNECTED'
      };
    }

    try {
      // 결제 요청 프로토콜 (예시)
      const paymentCommand = this.buildPaymentCommand(request);
      await this.sendCommand(paymentCommand);
      
      // 응답 대기 (타임아웃 30초)
      const response = await this.waitForResponse(30000);
      return this.parsePaymentResponse(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '결제 처리 중 오류 발생',
        errorCode: 'PAYMENT_PROCESSING_ERROR'
      };
    }
  }

  async cancelPayment(transactionId: string): Promise<PaymentResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        error: '단말기가 연결되지 않았습니다',
        errorCode: 'TERMINAL_NOT_CONNECTED'
      };
    }

    try {
      const cancelCommand = this.buildCancelCommand(transactionId);
      await this.sendCommand(cancelCommand);
      
      const response = await this.waitForResponse(30000);
      return this.parsePaymentResponse(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '결제 취소 중 오류 발생',
        errorCode: 'CANCEL_PROCESSING_ERROR'
      };
    }
  }

  async getStatus(): Promise<'connected' | 'disconnected' | 'busy' | 'error'> {
    if (!this.isConnected) return 'disconnected';
    
    try {
      const statusCommand = 'STATUS\r\n';
      await this.sendCommand(statusCommand);
      const response = await this.waitForResponse(5000);
      
      if (response.includes('READY')) return 'connected';
      if (response.includes('BUSY')) return 'busy';
      return 'error';
    } catch {
      return 'error';
    }
  }

  private buildPaymentCommand(request: PaymentRequest): string {
    // 실제 단말기 프로토콜에 맞게 구현
    return `PAY,${request.amount},${request.orderId},${request.method.toUpperCase()}\r\n`;
  }

  private buildCancelCommand(transactionId: string): string {
    return `CANCEL,${transactionId}\r\n`;
  }

  private async sendCommand(command: string): Promise<void> {
    if (!this.port) throw new Error('포트가 열려있지 않습니다');
    await this.port.write(command);
  }

  private async waitForResponse(timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => {
        reject(new Error('응답 타임아웃'));
      }, timeout);

      const onData = (data: string) => {
        buffer += data;
        if (buffer.includes('\r\n')) {
          clearTimeout(timer);
          resolve(buffer.trim());
        }
      };

      this.port?.on('data', onData);
    });
  }

  private parsePaymentResponse(response: string): PaymentResponse {
    const parts = response.split(',');
    
    if (parts[0] === 'SUCCESS') {
      return {
        success: true,
        transactionId: parts[1],
        approvalNumber: parts[2],
        receiptData: parts[3]
      };
    } else {
      return {
        success: false,
        error: parts[1] || '결제 실패',
        errorCode: parts[2] || 'UNKNOWN_ERROR'
      };
    }
  }
}

// QR 결제 (API 통신)
export class QRPaymentTerminal implements PaymentTerminal {
  private baseUrl = 'https://api.qrpay.example.com';
  private apiKey = (window as any).ENV?.VITE_QR_PAY_API_KEY || '';

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // API 연결은 별도 연결 해제 불필요
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency,
          orderId: request.orderId,
          method: 'qr'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          transactionId: data.transactionId,
          approvalNumber: data.approvalNumber
        };
      } else {
        return {
          success: false,
          error: data.message || '결제 실패',
          errorCode: data.errorCode || 'API_ERROR'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 통신 오류',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  async cancelPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        transactionId: data.transactionId,
        error: response.ok ? undefined : data.message,
        errorCode: response.ok ? undefined : data.errorCode
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 통신 오류',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  async getStatus(): Promise<'connected' | 'disconnected' | 'busy' | 'error'> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok ? 'connected' : 'error';
    } catch {
      return 'disconnected';
    }
  }
}

// 현금 결제 (하드웨어 제어)
export class CashPaymentTerminal implements PaymentTerminal {
  private isConnected = false;

  async connect(): Promise<boolean> {
    try {
      // 현금 투입구 및 거스름돈 배출기 연결 확인
      if (window.electronAPI?.cashHandler) {
        const status = await window.electronAPI.cashHandler.getStatus();
        this.isConnected = status === 'ready';
        return this.isConnected;
      }
      return false;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        error: '현금 처리 장치가 연결되지 않았습니다',
        errorCode: 'CASH_HANDLER_NOT_CONNECTED'
      };
    }

    try {
      // 현금 투입 대기
      const result = await window.electronAPI.cashHandler.waitForCash(request.amount, 60000);
      
      if (result.success) {
        // 거스름돈 계산 및 배출
        const change = result.receivedAmount - request.amount;
        if (change > 0) {
          await window.electronAPI.cashHandler.dispenseChange(change);
        }
        
        return {
          success: true,
          transactionId: `CASH_${Date.now()}`,
          receiptData: `현금결제: ${request.amount}원, 받은금액: ${result.receivedAmount}원, 거스름돈: ${change}원`
        };
      } else {
        return {
          success: false,
          error: result.error || '현금 처리 실패',
          errorCode: result.errorCode || 'CASH_PROCESSING_ERROR'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '현금 처리 중 오류 발생',
        errorCode: 'CASH_PROCESSING_ERROR'
      };
    }
  }

  async cancelPayment(transactionId: string): Promise<PaymentResponse> {
    // 현금 결제는 일반적으로 취소 불가
    return {
      success: false,
      error: '현금 결제는 취소할 수 없습니다',
      errorCode: 'CASH_CANCEL_NOT_SUPPORTED'
    };
  }

  async getStatus(): Promise<'connected' | 'disconnected' | 'busy' | 'error'> {
    if (!this.isConnected) return 'disconnected';
    
    try {
      const status = await window.electronAPI.cashHandler.getStatus();
      return status as 'connected' | 'disconnected' | 'busy' | 'error';
    } catch {
      return 'error';
    }
  }
}

// 결제 서비스 매니저
export class PaymentService {
  private terminals: Map<string, PaymentTerminal> = new Map();

  constructor() {
    this.initializeTerminals();
  }

  private initializeTerminals() {
    this.terminals.set('card', new CardPaymentTerminal());
    this.terminals.set('qr', new QRPaymentTerminal());
    this.terminals.set('cash', new CashPaymentTerminal());
  }

  async initializeTerminal(method: string): Promise<boolean> {
    const terminal = this.terminals.get(method);
    if (!terminal) {
      throw new Error(`지원하지 않는 결제 방법: ${method}`);
    }
    
    return await terminal.connect();
  }

  async processPayment(order: Order): Promise<PaymentResponse> {
    const terminal = this.terminals.get(order.paymentMethod);
    if (!terminal) {
      return {
        success: false,
        error: `지원하지 않는 결제 방법: ${order.paymentMethod}`,
        errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
      };
    }

    const request: PaymentRequest = {
      amount: order.total,
      currency: 'KRW',
      orderId: order.id,
      method: order.paymentMethod as any
    };

    return await terminal.processPayment(request);
  }

  async cancelPayment(method: string, transactionId: string): Promise<PaymentResponse> {
    const terminal = this.terminals.get(method);
    if (!terminal) {
      return {
        success: false,
        error: `지원하지 않는 결제 방법: ${method}`,
        errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
      };
    }

    return await terminal.cancelPayment(transactionId);
  }

  async getTerminalStatus(method: string): Promise<'connected' | 'disconnected' | 'busy' | 'error'> {
    const terminal = this.terminals.get(method);
    if (!terminal) {
      return 'error';
    }

    return await terminal.getStatus();
  }

  async getAllTerminalStatus(): Promise<Record<string, 'connected' | 'disconnected' | 'busy' | 'error'>> {
    const status: Record<string, 'connected' | 'disconnected' | 'busy' | 'error'> = {};
    
    for (const [method, terminal] of this.terminals) {
      status[method] = await terminal.getStatus();
    }
    
    return status;
  }

  async disconnectAll(): Promise<void> {
    for (const terminal of this.terminals.values()) {
      await terminal.disconnect();
    }
  }
}

// 싱글톤 인스턴스
export const paymentService = new PaymentService(); 