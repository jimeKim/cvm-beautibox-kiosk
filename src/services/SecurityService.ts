import CryptoJS from 'crypto-js';

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  iterations: number;
}

export interface CardInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  holderName: string;
}

export interface MaskedCardInfo {
  maskedCardNumber: string;
  expiryDate: string;
  holderName: string;
}

export class SecurityService {
  private readonly encryptionConfig: EncryptionConfig = {
    algorithm: 'AES',
    keySize: 256,
    ivSize: 16,
    iterations: 10000
  };

  private readonly secretKey = (window as any).ENV?.VITE_ENCRYPTION_SECRET_KEY || 'default-secret-key';

  /**
   * 카드 번호 마스킹
   * 예: 1234-5678-9012-3456 -> 1234-****-****-3456
   */
  maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) return '*'.repeat(cleaned.length);
    
    const first4 = cleaned.substring(0, 4);
    const last4 = cleaned.substring(cleaned.length - 4);
    const middle = '*'.repeat(cleaned.length - 8);
    
    return `${first4}-${middle.substring(0, 4)}-${middle.substring(4, 8)}-${last4}`;
  }

  /**
   * 카드 정보 마스킹
   */
  maskCardInfo(cardInfo: CardInfo): MaskedCardInfo {
    return {
      maskedCardNumber: this.maskCardNumber(cardInfo.cardNumber),
      expiryDate: cardInfo.expiryDate,
      holderName: cardInfo.holderName
    };
  }

  /**
   * 민감한 데이터 암호화
   */
  encrypt(data: string): string {
    try {
      const salt = CryptoJS.lib.WordArray.random(16);
      const key = CryptoJS.PBKDF2(this.secretKey, salt, {
        keySize: this.encryptionConfig.keySize / 32,
        iterations: this.encryptionConfig.iterations
      });
      
      const iv = CryptoJS.lib.WordArray.random(this.encryptionConfig.ivSize);
      const encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
      
      const encryptedData = {
        salt: salt.toString(),
        iv: iv.toString(),
        encrypted: encrypted.toString()
      };
      
      return btoa(JSON.stringify(encryptedData));
    } catch (error) {
      throw new Error('암호화 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }

  /**
   * 암호화된 데이터 복호화
   */
  decrypt(encryptedData: string): string {
    try {
      const data = JSON.parse(atob(encryptedData));
      const salt = CryptoJS.enc.Hex.parse(data.salt);
      const iv = CryptoJS.enc.Hex.parse(data.iv);
      
      const key = CryptoJS.PBKDF2(this.secretKey, salt, {
        keySize: this.encryptionConfig.keySize / 32,
        iterations: this.encryptionConfig.iterations
      });
      
      const decrypted = CryptoJS.AES.decrypt(data.encrypted, key, { iv: iv });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('복호화 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }

  /**
   * 카드 정보 암호화
   */
  encryptCardInfo(cardInfo: CardInfo): string {
    const cardData = JSON.stringify(cardInfo);
    return this.encrypt(cardData);
  }

  /**
   * 암호화된 카드 정보 복호화
   */
  decryptCardInfo(encryptedCardInfo: string): CardInfo {
    const cardData = this.decrypt(encryptedCardInfo);
    return JSON.parse(cardData);
  }

  /**
   * 해시 생성 (결제 검증용)
   */
  generateHash(data: string): string {
    return CryptoJS.SHA256(data + this.secretKey).toString();
  }

  /**
   * 해시 검증
   */
  verifyHash(data: string, hash: string): boolean {
    const expectedHash = this.generateHash(data);
    return expectedHash === hash;
  }

  /**
   * 결제 데이터 무결성 검증
   */
  createPaymentSignature(orderId: string, amount: number, timestamp: number): string {
    const data = `${orderId}:${amount}:${timestamp}`;
    return this.generateHash(data);
  }

  /**
   * 결제 서명 검증
   */
  verifyPaymentSignature(orderId: string, amount: number, timestamp: number, signature: string): boolean {
    const expectedSignature = this.createPaymentSignature(orderId, amount, timestamp);
    return expectedSignature === signature;
  }

  /**
   * 랜덤 토큰 생성
   */
  generateToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 세션 토큰 생성
   */
  generateSessionToken(): string {
    const timestamp = Date.now();
    const random = this.generateToken(16);
    const data = `${timestamp}:${random}`;
    return btoa(data);
  }

  /**
   * 세션 토큰 검증
   */
  verifySessionToken(token: string, maxAge: number = 3600000): boolean {
    try {
      const data = atob(token);
      const [timestamp, random] = data.split(':');
      const tokenAge = Date.now() - parseInt(timestamp);
      
      return tokenAge <= maxAge && random.length === 16;
    } catch {
      return false;
    }
  }

  /**
   * PCI DSS 준수를 위한 카드 번호 검증
   */
  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // 길이 검증
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }
    
    // Luhn 알고리즘 검증
    return this.luhnCheck(cleaned);
  }

  /**
   * Luhn 알고리즘 구현
   */
  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * 카드 타입 식별
   */
  identifyCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleaned)) return 'VISA';
    if (/^5[1-5]/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47]/.test(cleaned)) return 'AMEX';
    if (/^6(?:011|5)/.test(cleaned)) return 'DISCOVER';
    if (/^(?:2131|1800|35\d{3})\d{11}$/.test(cleaned)) return 'JCB';
    
    return 'UNKNOWN';
  }

  /**
   * 보안 로그 생성
   */
  createSecurityLog(action: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details: this.sanitizeLogData(details),
      hash: this.generateHash(JSON.stringify({ action, timestamp: Date.now() }))
    };
    
    console.log('[SECURITY LOG]', logEntry);
    
    // 실제 환경에서는 보안 로그를 안전한 저장소에 저장
    if (window.electronAPI?.securityLogger) {
      window.electronAPI.securityLogger.log(logEntry);
    }
  }

  /**
   * 로그 데이터 민감정보 제거
   */
  private sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    
    // 민감한 필드 마스킹
    const sensitiveFields = ['cardNumber', 'cvv', 'password', 'pin', 'token'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        if (field === 'cardNumber') {
          sanitized[field] = this.maskCardNumber(sanitized[field]);
        } else {
          sanitized[field] = '*'.repeat(sanitized[field].length);
        }
      }
    }
    
    return sanitized;
  }

  /**
   * 결제 환경 보안 검증
   */
  validateSecurityEnvironment(): { isSecure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // HTTPS 검증
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('HTTPS 연결이 필요합니다');
    }
    
    // 개발자 도구 검증
    if (this.isDevToolsOpen()) {
      issues.push('개발자 도구가 열려있습니다');
    }
    
    // 메모리 사용량 검증
    if (this.isMemoryUsageHigh()) {
      issues.push('메모리 사용량이 높습니다');
    }
    
    return {
      isSecure: issues.length === 0,
      issues
    };
  }

  /**
   * 개발자 도구 열림 감지
   */
  private isDevToolsOpen(): boolean {
    const threshold = 160;
    return window.outerHeight - window.innerHeight > threshold || 
           window.outerWidth - window.innerWidth > threshold;
  }

  /**
   * 메모리 사용량 검증
   */
  private isMemoryUsageHigh(): boolean {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / memory.totalJSHeapSize;
      return usedMemory > 0.8; // 80% 이상 사용 시 경고
    }
    return false;
  }
}

// 싱글톤 인스턴스
export const securityService = new SecurityService(); 