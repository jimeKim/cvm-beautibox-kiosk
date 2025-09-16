import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order } from '@/types';

export interface DatabaseProduct extends Product {
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private cmsApiUrl: string = '';
  private cmsApiKey: string = '';
  private isOnline = false;
  private offlineMode = true;
  private databaseMode: 'supabase' | 'cms' | 'offline' = 'offline';
  private cache: Map<string, any> = new Map();
  
  constructor() {
    this.initializeDatabase();
    this.initializeDemoData();
  }

  private initializeDatabase(): void {
    try {
      // 데이터베이스 모드 결정
      this.databaseMode = (window as any).ENV?.VITE_DATABASE_MODE || 'offline';
      
      if (this.databaseMode === 'cms') {
        this.initializeCMS();
      } else if (this.databaseMode === 'supabase') {
        this.initializeSupabase();
      } else {
        console.warn('오프라인 모드로 실행됩니다.');
      }
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
    }
  }

  private initializeSupabase(): void {
    const supabaseUrl = (window as any).ENV?.VITE_SUPABASE_URL || '';
    const supabaseKey = (window as any).ENV?.VITE_SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseKey && supabaseUrl !== '' && supabaseKey !== '') {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.testSupabaseConnection();
    } else {
      console.warn('Supabase 환경 변수가 설정되지 않았습니다.');
      this.databaseMode = 'offline';
    }
  }

  private initializeCMS(): void {
    this.cmsApiUrl = (window as any).ENV?.VITE_CMS_API_URL || '';
    this.cmsApiKey = (window as any).ENV?.VITE_CMS_API_KEY || '';
    
    if (this.cmsApiUrl && this.cmsApiKey) {
      this.testCMSConnection();
    } else {
      console.warn('CMS 환경 변수가 설정되지 않았습니다.');
      this.databaseMode = 'offline';
    }
  }

  private async testSupabaseConnection(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase.from('products').select('count', { count: 'exact', head: true });
      if (!error) {
        this.isOnline = true;
        this.offlineMode = false;
        console.log('Supabase 연결 성공');
      }
    } catch (err) {
      console.warn('Supabase 연결 실패, 오프라인 모드로 실행됩니다.');
      this.databaseMode = 'offline';
    }
  }

  private async testCMSConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.cmsApiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cmsApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.isOnline = true;
        this.offlineMode = false;
        console.log('CMS 서버 연결 성공');
      } else {
        throw new Error(`CMS 서버 응답 오류: ${response.status}`);
      }
    } catch (err) {
      console.warn('CMS 서버 연결 실패, 오프라인 모드로 실행됩니다.');
      this.databaseMode = 'offline';
    }
  }

  private initializeDemoData(): void {
    // 더미 상품 데이터
    const demoProducts: Product[] = [
      {
        id: '1',
        name: '보습 로션',
        nameKo: '보습 로션',
        nameEn: 'Moisturizing Lotion',
        brand: 'BeautyLab',
        category: '스킨케어',
        price: 25000,
        image: '/images/products/placeholder.svg',
        description: '깊은 보습 효과를 제공하는 로션',
        descriptionKo: '피부에 깊은 보습을 제공하는 로션입니다.',
        descriptionEn: 'A lotion that provides deep moisturization to the skin.',
        slot: 1,
        stock: 10,
        isAvailable: true,
        tags: ['moisturizing', 'daily-care']
      },
      {
        id: '2',
        name: '매트 립스틱',
        nameKo: '매트 립스틱',
        nameEn: 'Matte Lipstick',
        brand: 'ColorPop',
        category: '메이크업',
        price: 18000,
        image: '/images/products/placeholder.svg',
        description: '오래 지속되는 매트 립스틱',
        descriptionKo: '오래 지속되는 매트한 질감의 립스틱입니다.',
        descriptionEn: 'Long-lasting matte finish lipstick.',
        slot: 2,
        stock: 8,
        isAvailable: true,
        tags: ['long-lasting', 'matte']
      },
      {
        id: '3',
        name: '선크림',
        nameKo: '자외선 차단 크림',
        nameEn: 'Sunscreen Cream',
        brand: 'SunCare',
        category: '선케어',
        price: 22000,
        image: '/images/products/placeholder.svg',
        description: 'SPF50+ 자외선 차단',
        descriptionKo: 'SPF50+로 강력한 자외선 차단 효과를 제공합니다.',
        descriptionEn: 'Provides strong UV protection with SPF50+.',
        slot: 3,
        stock: 12,
        isAvailable: true,
        tags: ['sun-protection', 'spf50']
      },
      {
        id: '4',
        name: '아이섀도 팔레트',
        nameKo: '아이섀도 팔레트',
        nameEn: 'Eyeshadow Palette',
        brand: 'ColorStory',
        category: '메이크업',
        price: 35000,
        image: '/images/products/placeholder.svg',
        description: '12가지 컬러 아이섀도',
        descriptionKo: '12가지 다양한 컬러로 구성된 아이섀도 팔레트입니다.',
        descriptionEn: 'Eyeshadow palette with 12 versatile colors.',
        slot: 4,
        stock: 6,
        isAvailable: true,
        tags: ['eyeshadow', 'palette', 'colorful']
      },
      {
        id: '5',
        name: '클렌징 폼',
        nameKo: '딥클린 클렌징 폼',
        nameEn: 'Deep Clean Cleansing Foam',
        brand: 'PureSkin',
        category: '클렌징',
        price: 15000,
        image: '/images/products/placeholder.svg',
        description: '깊숙한 모공 클렌징',
        descriptionKo: '모공 깊숙한 노폐물까지 깔끔하게 제거하는 클렌징 폼입니다.',
        descriptionEn: 'Cleansing foam that removes impurities deep in pores.',
        slot: 5,
        stock: 15,
        isAvailable: true,
        tags: ['deep-clean', 'pore-care']
      },
      {
        id: '6',
        name: '하이드로겔 마스크',
        nameKo: '하이드로겔 페이스 마스크',
        nameEn: 'Hydrogel Face Mask',
        brand: 'MaskLab',
        category: '마스크',
        price: 8000,
        image: '/images/products/placeholder.svg',
        description: '즉석 수분 충전 마스크',
        descriptionKo: '즉석으로 피부에 수분을 공급하는 하이드로겔 마스크입니다.',
        descriptionEn: 'Hydrogel mask that instantly provides moisture to the skin.',
        slot: 6,
        stock: 20,
        isAvailable: true,
        tags: ['hydrating', 'instant-care']
      }
    ];
    
    this.cache.set('products', demoProducts);
    this.cache.set('orders', []);
  }

  // 연결 상태 확인
  async isConnected(): Promise<boolean> {
    return this.isOnline;
  }

  // 상품 목록 조회
  async getProducts(): Promise<Product[]> {
    if (this.offlineMode) {
      return this.cache.get('products') || [];
    }

    try {
      if (this.databaseMode === 'cms') {
        return await this.getCMSProducts();
      } else if (this.databaseMode === 'supabase') {
        return await this.getSupabaseProducts();
      }
      
      return this.cache.get('products') || [];
    } catch (error) {
      console.error('상품 조회 실패:', error);
      return this.cache.get('products') || [];
    }
  }

  private async getSupabaseProducts(): Promise<Product[]> {
    if (!this.supabase) throw new Error('Supabase 연결 없음');
    
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  private async getCMSProducts(): Promise<Product[]> {
    const response = await fetch(`${this.cmsApiUrl}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.cmsApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CMS API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.products || data || [];
  }

  // 특정 상품 조회
  async getProductById(id: string): Promise<Product | null> {
    if (this.offlineMode) {
      const products = this.cache.get('products') || [];
      return products.find((p: Product) => p.id === id) || null;
    }

    try {
      if (!this.supabase) throw new Error('데이터베이스 연결 없음');
      
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('상품 조회 실패:', error);
      const products = this.cache.get('products') || [];
      return products.find((p: Product) => p.id === id) || null;
    }
  }

  // 주문 생성
  async createOrder(orderData: any): Promise<string> {
    const orderId = `order_${Date.now()}`;
    
    if (this.offlineMode) {
      console.log('오프라인 모드 - 주문 생성:', orderId);
      
      const orders = this.cache.get('orders') || [];
      orders.push({
        id: orderId,
        ...orderData,
        created_at: new Date().toISOString(),
        status: 'pending'
      });
      this.cache.set('orders', orders);
      
      return orderId;
    }

    try {
      if (this.databaseMode === 'cms') {
        return await this.createCMSOrder(orderData);
      } else if (this.databaseMode === 'supabase') {
        return await this.createSupabaseOrder(orderData);
      }
      
      return orderId;
    } catch (error) {
      console.error('주문 생성 실패:', error);
      return orderId;
    }
  }

  private async createSupabaseOrder(orderData: any): Promise<string> {
    if (!this.supabase) throw new Error('Supabase 연결 없음');
    
    const orderId = `order_${Date.now()}`;
    console.log('Supabase 모드 - 주문 생성:', orderId);
    // Supabase 주문 생성 로직 구현
    return orderId;
  }

  private async createCMSOrder(orderData: any): Promise<string> {
    const response = await fetch(`${this.cmsApiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.cmsApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      throw new Error(`CMS 주문 생성 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('CMS 모드 - 주문 생성 성공:', data.id);
    return data.id || data.orderId || `order_${Date.now()}`;
  }

  // 재고 업데이트
  async updateStock(productId: string, quantity: number): Promise<boolean> {
    if (this.offlineMode) {
      console.log('오프라인 모드 - 재고 업데이트:', productId, quantity);
      
      const products = this.cache.get('products') || [];
      const productIndex = products.findIndex((p: Product) => p.id === productId);
      if (productIndex !== -1) {
        products[productIndex].stock = Math.max(0, products[productIndex].stock - quantity);
        this.cache.set('products', products);
      }
      
      return true;
    }

    try {
      if (!this.supabase) throw new Error('데이터베이스 연결 없음');
      
      console.log('온라인 모드 - 재고 업데이트:', productId, quantity);
      return true;
    } catch (error) {
      console.error('재고 업데이트 실패:', error);
      return false;
    }
  }

  // 오프라인 모드 활성화
  async enableOfflineMode(): Promise<void> {
    this.offlineMode = true;
    this.isOnline = false;
    console.log('오프라인 모드 활성화');
  }

  // 초기화
  async initialize(): Promise<void> {
    await this.testConnection();
    console.log(`DatabaseService 초기화 완료 (${this.offlineMode ? '오프라인' : '온라인'} 모드)`);
  }

  // 정리
  async cleanup(): Promise<void> {
    this.cache.clear();
    console.log('DatabaseService 정리 완료');
  }
}

// 싱글톤 인스턴스
export const databaseService = new DatabaseService(); 