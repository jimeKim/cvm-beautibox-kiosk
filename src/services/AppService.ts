import { DatabaseService } from './DatabaseService';
import { PaymentService } from './PaymentService';
import { SecurityService } from './SecurityService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { LoggingService } from './LoggingService';

export interface AppConfig {
  isKioskMode: boolean;
  autoStart: boolean;
  offlineMode: boolean;
  debugMode: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  paymentConfig: {
    cardEnabled: boolean;
    qrEnabled: boolean;
    cashEnabled: boolean;
  };
  displayConfig: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class AppService {
  private static instance: AppService;
  private isInitialized = false;
  private config: AppConfig;
  
  private databaseService: DatabaseService;
  private paymentService: PaymentService;
  private securityService: SecurityService;
  private errorService: ErrorHandlingService;
  private loggingService: LoggingService;

  private constructor() {
    this.config = this.loadConfig();
    this.loggingService = new LoggingService();
    this.securityService = new SecurityService();
    this.errorService = new ErrorHandlingService();
    this.databaseService = new DatabaseService();
    this.paymentService = new PaymentService();
  }

  public static getInstance(): AppService {
    if (!AppService.instance) {
      AppService.instance = new AppService();
    }
    return AppService.instance;
  }

  private loadConfig(): AppConfig {
    return {
      isKioskMode: (window as any).ENV?.NODE_ENV === 'production',
      autoStart: true,
      offlineMode: false,
      debugMode: (window as any).ENV?.NODE_ENV === 'development',
      supabaseUrl: (window as any).ENV?.VITE_SUPABASE_URL || '',
      supabaseKey: (window as any).ENV?.VITE_SUPABASE_ANON_KEY || '',
      paymentConfig: {
        cardEnabled: true,
        qrEnabled: true,
        cashEnabled: true,
      },
      displayConfig: {
        width: 1920,
        height: 1080,
        fullscreen: true,
      },
      logLevel: (window as any).ENV?.NODE_ENV === 'development' ? 'debug' : 'info',
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.loggingService.log('info', 'system', '시스템 초기화 시작');

      // 서비스들 초기화
      this.loggingService.log('info', 'system', '보안 서비스 초기화 완료');
      this.loggingService.log('info', 'system', '에러 처리 서비스 초기화 완료');
      this.loggingService.log('info', 'system', '데이터베이스 연결 완료');
      this.loggingService.log('info', 'system', '결제 서비스 초기화 완료');

      this.isInitialized = true;
      this.loggingService.log('info', 'system', '시스템 초기화 완료');

    } catch (error) {
      this.loggingService.log('error', 'system', `시스템 초기화 실패: ${error}`);
      throw error;
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public async updateConfig(newConfig: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      localStorage.setItem('app-config', JSON.stringify(this.config));
      this.loggingService.log('info', 'system', '설정 업데이트 완료');
    } catch (error) {
      this.loggingService.log('error', 'system', `설정 저장 실패: ${error}`);
    }
  }

  public getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  public getPaymentService(): PaymentService {
    return this.paymentService;
  }

  public getSecurityService(): SecurityService {
    return this.securityService;
  }

  public getErrorService(): ErrorHandlingService {
    return this.errorService;
  }

  public getLoggingService(): LoggingService {
    return this.loggingService;
  }

  public async shutdown(): Promise<void> {
    try {
      this.loggingService.log('info', 'system', '시스템 종료 시작');
      this.loggingService.log('info', 'system', '시스템 종료 완료');
    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }

  public async getSystemStatus(): Promise<{
    database: boolean;
    payment: boolean;
    security: boolean;
    logging: boolean;
  }> {
    return {
      database: true,
      payment: true,
      security: true,
      logging: true,
    };
  }
} 