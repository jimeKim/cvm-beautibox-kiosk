export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  version?: string;
  environment?: string;
  stackTrace?: string;
  context?: {
    url?: string;
    userAgent?: string;
    screen?: {
      width: number;
      height: number;
    };
    memory?: {
      used: number;
      total: number;
    };
  };
}

export interface LogFilter {
  level?: LogEntry['level'][];
  category?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userId?: string;
  sessionId?: string;
  deviceId?: string;
}

export interface LogStatistics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByCategory: Record<string, number>;
  errorRate: number;
  averageLogsPerHour: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogSize = 10000; // 최대 로그 개수
  private sessionId: string;
  private deviceId: string;
  private version: string;
  private environment: string;
  private uploadQueue: LogEntry[] = [];
  private isUploading = false;
  private uploadInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceId = this.getDeviceId();
    this.version = this.getAppVersion();
    this.environment = this.getEnvironment();
    
    this.loadLogsFromStorage();
    
    // 개발 모드에서는 자동 업로드 비활성화
    if (this.getEnvironment() !== 'development') {
      this.setupPeriodicUpload();
    }
    
    this.setupErrorHandlers();
  }

  /**
   * 로그 기록
   */
  log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    userId?: string
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      userId,
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      version: this.version,
      environment: this.environment,
      stackTrace: level === 'error' || level === 'critical' ? this.getStackTrace() : undefined,
      context: this.getContext()
    };

    this.logs.push(logEntry);
    this.uploadQueue.push(logEntry);

    // 로그 크기 관리
    if (this.logs.length > this.maxLogSize) {
      this.logs.splice(0, this.logs.length - this.maxLogSize);
    }

    // 콘솔 출력
    this.outputToConsole(logEntry);

    // 로컬 저장소에 저장
    this.saveLogsToStorage();

    // 중요한 로그는 즉시 업로드 (개발 모드 제외)
    if ((level === 'error' || level === 'critical') && this.getEnvironment() !== 'development') {
      this.uploadLogs();
    }
  }

  /**
   * 디버그 로그
   */
  debug(category: string, message: string, data?: any, userId?: string): void {
    this.log('debug', category, message, data, userId);
  }

  /**
   * 정보 로그
   */
  info(category: string, message: string, data?: any, userId?: string): void {
    this.log('info', category, message, data, userId);
  }

  /**
   * 경고 로그
   */
  warn(category: string, message: string, data?: any, userId?: string): void {
    this.log('warn', category, message, data, userId);
  }

  /**
   * 에러 로그
   */
  error(category: string, message: string, data?: any, userId?: string): void {
    this.log('error', category, message, data, userId);
  }

  /**
   * 치명적 에러 로그
   */
  critical(category: string, message: string, data?: any, userId?: string): void {
    this.log('critical', category, message, data, userId);
  }

  /**
   * 사용자 행동 로그
   */
  userAction(action: string, data?: any, userId?: string): void {
    this.info('user_action', `User action: ${action}`, data, userId);
  }

  /**
   * 시스템 이벤트 로그
   */
  systemEvent(event: string, data?: any): void {
    this.info('system_event', `System event: ${event}`, data);
  }

  /**
   * 성능 로그
   */
  performance(operation: string, duration: number, data?: any): void {
    this.info('performance', `${operation} took ${duration}ms`, { duration, ...data });
  }

  /**
   * 보안 로그
   */
  security(event: string, data?: any, userId?: string): void {
    this.warn('security', `Security event: ${event}`, data, userId);
  }

  /**
   * 비즈니스 로그
   */
  business(event: string, data?: any, userId?: string): void {
    this.info('business', `Business event: ${event}`, data, userId);
  }

  /**
   * 로그 조회
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }

      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
      }

      if (filter.dateRange) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.dateRange!.start && 
          log.timestamp <= filter.dateRange!.end
        );
      }

      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }

      if (filter.sessionId) {
        filteredLogs = filteredLogs.filter(log => log.sessionId === filter.sessionId);
      }

      if (filter.deviceId) {
        filteredLogs = filteredLogs.filter(log => log.deviceId === filter.deviceId);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 로그 통계
   */
  getStatistics(filter?: LogFilter): LogStatistics {
    const logs = this.getLogs(filter);
    const totalLogs = logs.length;

    // 레벨별 통계
    const logsByLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 카테고리별 통계
    const logsByCategory = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 에러율 계산
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'critical');
    const errorRate = totalLogs > 0 ? (errorLogs.length / totalLogs) * 100 : 0;

    // 시간당 평균 로그 수
    const timeSpan = logs.length > 0 ? 
      (logs[0].timestamp.getTime() - logs[logs.length - 1].timestamp.getTime()) / (1000 * 60 * 60) : 0;
    const averageLogsPerHour = timeSpan > 0 ? totalLogs / timeSpan : 0;

    // 상위 에러 메시지
    const errorMessages = new Map<string, { count: number; lastOccurrence: Date }>();
    errorLogs.forEach(log => {
      const existing = errorMessages.get(log.message) || { count: 0, lastOccurrence: log.timestamp };
      existing.count++;
      if (log.timestamp > existing.lastOccurrence) {
        existing.lastOccurrence = log.timestamp;
      }
      errorMessages.set(log.message, existing);
    });

    const topErrors = Array.from(errorMessages.entries())
      .map(([message, stats]) => ({ message, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs,
      logsByLevel,
      logsByCategory,
      errorRate,
      averageLogsPerHour,
      topErrors
    };
  }

  /**
   * 로그 내보내기
   */
  exportLogs(format: 'json' | 'csv' | 'txt', filter?: LogFilter): string {
    const logs = this.getLogs(filter);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.logsToCSV(logs);
      
      case 'txt':
        return this.logsToText(logs);
      
      default:
        throw new Error(`지원하지 않는 형식: ${format}`);
    }
  }

  /**
   * 오래된 로그 정리
   */
  cleanup(olderThan?: Date): void {
    const cutoffDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 기본 7일
    
    const beforeCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    const afterCount = this.logs.length;
    
    if (beforeCount !== afterCount) {
      this.saveLogsToStorage();
      console.log(`Log cleanup completed: ${beforeCount - afterCount} logs deleted`);
    }
  }

  /**
   * 최근 로그 가져오기
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 로그 업로드 (비활성화됨 - 개발 모드)
   */
  private async uploadLogs(): Promise<void> {
    // 개발 모드에서는 로그 업로드 비활성화
    if (this.getEnvironment() === 'development') {
      console.log('Log upload is disabled in development mode.');
      return;
    }

    try {
      const logsToUpload = this.logs.slice(-100); // 최근 100개 로그만 업로드
      
      if (logsToUpload.length === 0) return;

      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToUpload,
          deviceId: this.getDeviceId(),
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        console.log(`${logsToUpload.length} logs uploaded successfully`);
        
        // 업로드된 로그는 로컬에서 제거
        this.logs = this.logs.slice(logsToUpload.length);
        this.saveLogsToStorage();
      } else {
        console.warn('Log upload failed:', response.status);
      }
    } catch (error) {
      console.warn('Error during log upload:', error);
    }
  }

  /**
   * 주기적 업로드 설정
   */
  private setupPeriodicUpload(): void {
    this.uploadInterval = setInterval(() => {
      this.uploadLogs();
    }, 60000); // 1분마다 업로드
  }

  /**
   * 에러 핸들러 설정
   */
  private setupErrorHandlers(): void {
    // 전역 에러 핸들러
    window.addEventListener('error', (event) => {
      this.error('global_error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Promise 거부 핸들러
    window.addEventListener('unhandledrejection', (event) => {
      this.error('unhandled_promise_rejection', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  /**
   * 유틸리티 메서드들
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private getAppVersion(): string {
    return (window as any).ENV?.VITE_APP_VERSION || '1.0.0';
  }

  private getEnvironment(): string {
    return (window as any).ENV?.NODE_ENV || 'production';
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2).join('\n') : '';
  }

  private getContext(): LogEntry['context'] {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize
      } : undefined
    };
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // 민감한 정보 제거
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'cardNumber', 'cvv', 'pin'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const message = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}] ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 'debug':
        console.debug(message, logEntry.data);
        break;
      case 'info':
        console.info(message, logEntry.data);
        break;
      case 'warn':
        console.warn(message, logEntry.data);
        break;
      case 'error':
      case 'critical':
        console.error(message, logEntry.data);
        break;
    }
  }

  private saveLogsToStorage(): void {
    try {
      const recentLogs = this.logs.slice(-1000); // 최근 1000개만 저장
      const serializedLogs = recentLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }));
      
      localStorage.setItem('appLogs', JSON.stringify(serializedLogs));
    } catch (error) {
      console.error('Log save failed:', error);
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('appLogs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs = logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Log load failed:', error);
    }
  }

  private logsToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'sessionId', 'deviceId'];
    const rows = logs.map(log => headers.map(header => 
      header === 'timestamp' ? log.timestamp.toISOString() : (log as any)[header] || ''
    ));
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private logsToText(logs: LogEntry[]): string {
    return logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`
    ).join('\n');
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    
    // 남은 로그 업로드 시도
    this.uploadLogs();
    
    // 로컬 스토리지에 저장
    this.saveLogsToStorage();
    
    console.log('LoggingService cleanup completed');
  }
}

// 싱글톤 인스턴스
export const loggingService = new LoggingService(); 