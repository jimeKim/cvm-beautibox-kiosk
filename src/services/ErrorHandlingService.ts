export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  error: Error;
  context: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class ErrorHandlingService {
  private errorLogs: ErrorLog[] = [];
  private retryQueue: Map<string, RetryOperation> = new Map();

  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryCondition: (error: Error) => {
      // 네트워크 오류, 타임아웃, 서버 오류는 재시도
      return error.message.includes('network') ||
             error.message.includes('timeout') ||
             error.message.includes('500') ||
             error.message.includes('502') ||
             error.message.includes('503') ||
             error.message.includes('504');
    }
  };

  /**
   * 재시도 로직과 함께 함수 실행
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // 성공 시 재시도 큐에서 제거
        this.retryQueue.delete(context);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 재시도 조건 확인
        if (finalConfig.retryCondition && !finalConfig.retryCondition(lastError)) {
          break;
        }

        // 마지막 시도인 경우 재시도하지 않음
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // 재시도 대기
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
          finalConfig.maxDelay
        );

        console.warn(`${context} 실패 (${attempt}/${finalConfig.maxAttempts}), ${delay}ms 후 재시도:`, lastError);
        
        await this.delay(delay);
      }
    }

    // 모든 재시도 실패
    this.logError(lastError!, context, 'high');
    throw lastError!;
  }

  /**
   * 백그라운드에서 재시도 작업 실행
   */
  async scheduleRetry(
    operation: () => Promise<void>,
    context: string,
    config: Partial<RetryConfig> = {}
  ): Promise<void> {
    const operationId = `${context}_${Date.now()}`;
    
    const retryOperation: RetryOperation = {
      id: operationId,
      operation,
      context,
      config: { ...this.defaultRetryConfig, ...config },
      attempts: 0,
      lastAttempt: null,
      nextAttempt: new Date(),
      status: 'pending'
    };

    this.retryQueue.set(operationId, retryOperation);
    
    // 백그라운드에서 실행
    this.processRetryQueue();
  }

  /**
   * 재시도 큐 처리
   */
  private async processRetryQueue(): Promise<void> {
    for (const [id, operation] of this.retryQueue) {
      if (operation.status === 'processing' || operation.nextAttempt > new Date()) {
        continue;
      }

      operation.status = 'processing';
      operation.attempts++;
      operation.lastAttempt = new Date();

      try {
        await operation.operation();
        
        // 성공 시 큐에서 제거
        this.retryQueue.delete(id);
        console.log(`재시도 작업 성공: ${operation.context}`);
      } catch (error) {
        const err = error as Error;
        
        // 재시도 조건 확인
        if (operation.config.retryCondition && !operation.config.retryCondition(err)) {
          this.retryQueue.delete(id);
          this.logError(err, operation.context, 'high');
          continue;
        }

        // 최대 시도 횟수 확인
        if (operation.attempts >= operation.config.maxAttempts) {
          this.retryQueue.delete(id);
          this.logError(err, operation.context, 'critical');
          continue;
        }

        // 다음 재시도 시간 계산
        const delay = Math.min(
          operation.config.baseDelay * Math.pow(operation.config.backoffFactor, operation.attempts - 1),
          operation.config.maxDelay
        );

        operation.nextAttempt = new Date(Date.now() + delay);
        operation.status = 'pending';
        
        console.warn(`재시도 작업 실패: ${operation.context} (${operation.attempts}/${operation.config.maxAttempts})`);
      }
    }

    // 5초 후 다시 처리
    setTimeout(() => this.processRetryQueue(), 5000);
  }

  /**
   * 에러 로깅
   */
  logError(
    error: Error,
    context: string,
    severity: ErrorLog['severity'] = 'medium',
    additionalInfo?: any
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      error,
      context,
      severity,
      resolved: false,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorLogs.push(errorLog);

    // 콘솔에 에러 출력
    console.error(`[${severity.toUpperCase()}] ${context}:`, error, additionalInfo);

    // 심각한 에러는 즉시 보고
    if (severity === 'critical') {
      this.reportCriticalError(errorLog);
    }

    // 로컬 스토리지에 저장
    this.saveErrorLogsToStorage();

    // 서버로 전송 (백그라운드)
    this.sendErrorToServer(errorLog);
  }

  /**
   * 심각한 에러 즉시 보고
   */
  private async reportCriticalError(errorLog: ErrorLog): Promise<void> {
    try {
      // 관리자에게 알림 전송
      if (window.electronAPI?.notification) {
        await window.electronAPI.notification.show({
          title: '심각한 오류 발생',
          body: `${errorLog.context}: ${errorLog.error.message}`,
          urgency: 'critical'
        });
      }

      // 이메일 알림 (실제 환경에서는 서버 API 호출)
      console.error('CRITICAL ERROR REPORTED:', errorLog);
    } catch (reportError) {
      console.error('심각한 에러 보고 실패:', reportError);
    }
  }

  /**
   * 서버로 에러 전송
   */
  private async sendErrorToServer(errorLog: ErrorLog): Promise<void> {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...errorLog,
          error: {
            message: errorLog.error.message,
            stack: errorLog.error.stack,
            name: errorLog.error.name
          }
        })
      });

      if (!response.ok) {
        throw new Error(`에러 전송 실패: ${response.status}`);
      }
    } catch (error) {
      // 에러 전송 실패는 로컬에만 저장
      console.warn('서버로 에러 전송 실패:', error);
    }
  }

  /**
   * 에러 복구 시도
   */
  async attemptRecovery(errorId: string): Promise<boolean> {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (!errorLog) return false;

    try {
      // 컨텍스트에 따른 복구 시도
      switch (errorLog.context) {
        case 'payment':
          return await this.recoverPaymentError(errorLog);
        case 'database':
          return await this.recoverDatabaseError(errorLog);
        case 'network':
          return await this.recoverNetworkError(errorLog);
        default:
          return await this.genericRecovery(errorLog);
      }
    } catch (recoveryError) {
      console.error('복구 시도 실패:', recoveryError);
      return false;
    }
  }

  /**
   * 결제 에러 복구
   */
  private async recoverPaymentError(errorLog: ErrorLog): Promise<boolean> {
    try {
      // 결제 상태 확인
      const paymentStatus = await this.checkPaymentStatus();
      
      if (paymentStatus === 'pending') {
        // 결제 재시도
        await this.retryPayment();
        errorLog.resolved = true;
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 데이터베이스 에러 복구
   */
  private async recoverDatabaseError(errorLog: ErrorLog): Promise<boolean> {
    try {
      // 연결 상태 확인
      const isConnected = await this.checkDatabaseConnection();
      
      if (isConnected) {
        // 오프라인 데이터 동기화
        await this.syncOfflineData();
        errorLog.resolved = true;
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 네트워크 에러 복구
   */
  private async recoverNetworkError(errorLog: ErrorLog): Promise<boolean> {
    try {
      // 네트워크 상태 확인
      if (navigator.onLine) {
        // 네트워크 복구됨
        errorLog.resolved = true;
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 일반적인 복구 시도
   */
  private async genericRecovery(errorLog: ErrorLog): Promise<boolean> {
    try {
      // 앱 상태 초기화
      await this.resetAppState();
      errorLog.resolved = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 에러 통계 조회
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByContext: Record<string, number>;
    resolvedErrors: number;
    recentErrors: ErrorLog[];
  } {
    const totalErrors = this.errorLogs.length;
    const resolvedErrors = this.errorLogs.filter(log => log.resolved).length;
    
    const errorsBySeverity = this.errorLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByContext = this.errorLogs.reduce((acc, log) => {
      acc[log.context] = (acc[log.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = this.errorLogs
      .filter(log => !log.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalErrors,
      errorsBySeverity,
      errorsByContext,
      resolvedErrors,
      recentErrors
    };
  }

  /**
   * 에러 로그 정리
   */
  cleanupErrorLogs(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    this.errorLogs = this.errorLogs.filter(log => 
      log.timestamp > oneWeekAgo || 
      log.severity === 'critical' ||
      !log.resolved
    );
    
    this.saveErrorLogsToStorage();
  }

  // 유틸리티 메서드들
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentUserId(): string | undefined {
    // 실제 구현에서는 현재 사용자 ID 반환
    return undefined;
  }

  private getSessionId(): string | undefined {
    return sessionStorage.getItem('sessionId') || undefined;
  }

  private saveErrorLogsToStorage(): void {
    try {
      const serializedLogs = this.errorLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        error: {
          message: log.error.message,
          stack: log.error.stack,
          name: log.error.name
        }
      }));
      
      localStorage.setItem('errorLogs', JSON.stringify(serializedLogs));
    } catch (error) {
      console.error('에러 로그 저장 실패:', error);
    }
  }

  private loadErrorLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('errorLogs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.errorLogs = logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          error: new Error(log.error.message)
        }));
      }
    } catch (error) {
      console.error('에러 로그 로드 실패:', error);
    }
  }

  // 복구 관련 헬퍼 메서드들
  private async checkPaymentStatus(): Promise<string> {
    // 실제 구현에서는 결제 상태 확인
    return 'pending';
  }

  private async retryPayment(): Promise<void> {
    // 실제 구현에서는 결제 재시도
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    // 실제 구현에서는 데이터베이스 연결 확인
    return true;
  }

  private async syncOfflineData(): Promise<void> {
    // 실제 구현에서는 오프라인 데이터 동기화
  }

  private async resetAppState(): Promise<void> {
    // 실제 구현에서는 앱 상태 초기화
  }

  // 초기화
  constructor() {
    this.loadErrorLogsFromStorage();
    
    // 주기적으로 에러 로그 정리
    setInterval(() => this.cleanupErrorLogs(), 24 * 60 * 60 * 1000);
    
    // 재시도 큐 처리 시작
    this.processRetryQueue();
  }
}

interface RetryOperation {
  id: string;
  operation: () => Promise<void>;
  context: string;
  config: RetryConfig;
  attempts: number;
  lastAttempt: Date | null;
  nextAttempt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// 싱글톤 인스턴스
export const errorHandlingService = new ErrorHandlingService(); 