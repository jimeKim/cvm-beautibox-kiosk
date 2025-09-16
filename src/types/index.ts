// CMS API 타입 정의
export interface CMSApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CMSProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  brand: string;
  description: string;
  image: string;
  stock: number;
  isAvailable: boolean;
  slot?: number;
  tags?: string[];
}

export interface CMSOrder {
  id: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed';
  customerInfo?: any;
  createdAt: string;
}

// BeautiBox API 타입 정의
export interface BeautiBoxAPI {
  system: {
    getStatus: () => Promise<ApiResponse<SystemStatus>>;
  };
  sensor: {
    readDistance: () => Promise<ApiResponse<number>>;
    startMonitoring: (intervalMs?: number) => Promise<ApiResponse<void>>;
    stopMonitoring: () => Promise<ApiResponse<void>>;
    onDistanceUpdate: (callback: (data: DistanceReading) => void) => void;
    removeDistanceListener: () => void;
  };
  camera: {
    capture: (filename?: string) => Promise<ApiResponse<ImageCaptureResult>>;
    getImages: () => Promise<ApiResponse<string[]>>;
  };
  controller: {
    ledOn: () => Promise<ApiResponse<boolean>>;
    ledOff: () => Promise<ApiResponse<boolean>>;
    rotateMotor: (angle: number, speed?: number) => Promise<ApiResponse<boolean>>;
    matrixButton: (buttonNumber: number) => Promise<ApiResponse<boolean>>;
  };
  printer: {
    printSilent: (content: string) => Promise<ApiResponse<void>>;
  };
  app: {
    quit: () => Promise<ApiResponse<void>>;
    adminShutdown: () => Promise<ApiResponse<{ success: boolean; message: string }>>;
  };
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
}

// 시스템 상태
export interface SystemStatus {
  sensor: DeviceStatus;
  camera: DeviceStatus;
  controller: DeviceStatus;
  overall: 'connected' | 'partial' | 'disconnected';
}

// 디바이스 상태
export interface DeviceStatus {
  connected: boolean;
  deviceType: 'camera' | 'sensor' | 'controller';
  port?: string;
  error?: string;
  lastActivity: number;
}

// 거리 측정 데이터
export interface DistanceReading {
  distance: number;
  timestamp: number;
  isInRange: boolean;
}

// 이미지 캡처 결과
export interface ImageCaptureResult {
  success: boolean;
  path?: string;
  error?: string;
  timestamp: number;
}

// 제품 정보
export interface Product {
  id: string;
  name: string;
  nameKo: string;
  nameEn: string;
  brand: string;
  category: '스킨케어' | '클렌징' | '마스크' | '메이크업' | '선케어' | '립케어' | '네일케어';
  price: number;
  image: string;
  description: string;
  descriptionKo: string;
  descriptionEn: string;
  slot: number;
  stock: number;
  isAvailable: boolean;
  tags: string[];
}

// 장바구니 아이템
export interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, any>;
}

// 주문 정보
export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  total: number; // PaymentService에서 사용하는 total 속성 추가 (totalAmount와 동일한 값)
  paymentMethod: 'card' | 'cash' | 'mobile';
  paymentStatus: 'pending' | 'completed' | 'failed';
  customerPhoto?: string;
  timestamp: number;
  dispensedItems: string[];
}

// 언어 설정
export type Language = 'ko' | 'en';

// 앱 상태
export interface AppState {
  // 시스템 상태
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // 언어 설정
  language: Language;
  
  // 현재 거리 측정값
  currentDistance: number | null;
  isMonitoring: boolean;
  
  // 제품 및 장바구니
  products: Product[];
  cart: CartItem[];
  
  // 현재 주문
  currentOrder: Order | null;
  
  // UI 상태
  currentStep: 'home' | 'products' | 'cart' | 'payment' | 'photo' | 'dispensing' | 'complete' | 'admin' | 'camera-test' | 'printer-test' | 'hardware-config';
  isFullscreen: boolean;
  
  // 타이머 및 자동 리셋
  idleTimer: number | null;
  autoResetMinutes: number;
}

// 키오스크 설정
export interface KioskSettings {
  autoResetMinutes: number;
  defaultLanguage: Language;
  enableSound: boolean;
  enableVibration: boolean;
  maxItemsPerOrder: number;
  simulationMode: boolean;
}

// 이벤트 타입
export type AppEvent = 
  | { type: 'SYSTEM_STATUS_UPDATE'; payload: SystemStatus }
  | { type: 'DISTANCE_UPDATE'; payload: DistanceReading }
  | { type: 'PRODUCT_SELECTED'; payload: Product }
  | { type: 'CART_UPDATED'; payload: CartItem[] }
  | { type: 'ORDER_CREATED'; payload: Order }
  | { type: 'PAYMENT_COMPLETED'; payload: Order }
  | { type: 'PHOTO_CAPTURED'; payload: string }
  | { type: 'DISPENSING_STARTED'; payload: string[] }
  | { type: 'DISPENSING_COMPLETED'; payload: string[] }
  | { type: 'ERROR_OCCURRED'; payload: string }
  | { type: 'IDLE_TIMEOUT'; payload: null }
  | { type: 'LANGUAGE_CHANGED'; payload: Language };

// 전역 Window 타입 확장
declare global {
  interface Window {
    beautiBoxAPI: BeautiBoxAPI;
    electronAPI?: {
      serialPort?: {
        open: (config: any) => Promise<any>;
      };
      cashHandler?: {
        getStatus: () => Promise<any>;
        waitForCash: (amount: number, timeout: number) => Promise<any>;
        dispenseChange: (amount: number) => Promise<any>;
      };
      notification?: {
        show: (options: any) => Promise<any>;
      };
      securityLogger?: {
        log: (entry: any) => void;
      };
    };
    ENV?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_QR_PAY_API_KEY?: string;
      [key: string]: any;
    };
  }
} 