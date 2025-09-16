import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
  AppState, 
  SystemStatus, 
  Product, 
  Order, 
  Language, 
  DistanceReading 
} from '@/types';

interface AppStore extends AppState {
  // 시스템 상태 액션
  setSystemStatus: (status: SystemStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 언어 설정 액션
  setLanguage: (language: Language) => void;
  
  // 센서 관련 액션
  setCurrentDistance: (distance: number | null) => void;
  setMonitoring: (monitoring: boolean) => void;
  updateDistance: (reading: DistanceReading) => void;
  
  // 제품 관련 액션
  setProducts: (products: Product[]) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  
  // 장바구니 액션
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // 주문 관련 액션
  createOrder: (paymentMethod: Order['paymentMethod']) => void;
  updateOrder: (updates: Partial<Order>) => void;
  completeOrder: () => void;
  
  // UI 상태 액션
  setCurrentStep: (step: AppState['currentStep']) => void;
  setFullscreen: (fullscreen: boolean) => void;
  
  // 타이머 관련 액션
  startIdleTimer: () => void;
  resetIdleTimer: () => void;
  clearIdleTimer: () => void;
  
  // 리셋 액션
  resetApp: () => void;
}

// 초기 상태
const initialState: AppState = {
  systemStatus: null,
  isLoading: false, // 로딩 없이 바로 시작
  error: null,
  language: 'ko',
  currentDistance: null,
  isMonitoring: false,
  products: [],
  cart: [],
  currentOrder: null,
  currentStep: 'home',
  isFullscreen: false,
  idleTimer: null,
  autoResetMinutes: 5,
};

// 실제 화장품 제품 데이터 (20개 제품)
const sampleProducts: Product[] = [
  // 스킨케어 - 토너/에센스
  {
    id: 'prod-001',
    name: '하이드레이팅 토너',
    nameKo: '하이드레이팅 토너',
    nameEn: 'Hydrating Toner',
    brand: 'COSRX',
    category: '스킨케어',
    price: 28000,
    image: '/images/products/hydrating-toner.jpg',
    description: '히알루론산 성분으로 깊은 수분 공급하는 토너',
    descriptionKo: '히알루론산 성분으로 깊은 수분 공급하는 토너',
    descriptionEn: 'Hydrating toner with hyaluronic acid for deep moisture',
    slot: 1,
    stock: 12,
    isAvailable: true,
    tags: ['토너', '수분', '히알루론산']
  },
  {
    id: 'prod-002',
    name: '나이아신아마이드 에센스',
    nameKo: '나이아신아마이드 에센스',
    nameEn: 'Niacinamide Essence',
    brand: 'THE ORDINARY',
    category: '스킨케어',
    price: 35000,
    image: '/images/products/niacinamide-essence.jpg',
    description: '모공 케어와 피부 톤 개선을 위한 나이아신아마이드 에센스',
    descriptionKo: '모공 케어와 피부 톤 개선을 위한 나이아신아마이드 에센스',
    descriptionEn: 'Niacinamide essence for pore care and skin tone improvement',
    slot: 2,
    stock: 8,
    isAvailable: true,
    tags: ['에센스', '모공케어', '나이아신아마이드']
  },
  {
    id: 'prod-003',
    name: '비타민C 세럼',
    nameKo: '비타민C 세럼',
    nameEn: 'Vitamin C Serum',
    brand: 'klairs',
    category: '스킨케어',
    price: 42000,
    image: '/images/products/vitamin-c-serum.jpg',
    description: '브라이트닝과 안티에이징 효과의 비타민C 세럼',
    descriptionKo: '브라이트닝과 안티에이징 효과의 비타민C 세럼',
    descriptionEn: 'Vitamin C serum for brightening and anti-aging',
    slot: 3,
    stock: 6,
    isAvailable: true,
    tags: ['세럼', '비타민C', '브라이트닝']
  },
  {
    id: 'prod-004',
    name: '레티놀 나이트 크림',
    nameKo: '레티놀 나이트 크림',
    nameEn: 'Retinol Night Cream',
    brand: 'SOME BY MI',
    category: '스킨케어',
    price: 52000,
    image: '/images/products/retinol-night-cream.jpg',
    description: '밤사이 피부 재생을 돕는 레티놀 나이트 크림',
    descriptionKo: '밤사이 피부 재생을 돕는 레티놀 나이트 크림',
    descriptionEn: 'Retinol night cream for overnight skin renewal',
    slot: 4,
    stock: 4,
    isAvailable: true,
    tags: ['크림', '레티놀', '안티에이징']
  },
  {
    id: 'prod-005',
    name: '센텔라 수딩 젤',
    nameKo: '센텔라 수딩 젤',
    nameEn: 'Centella Soothing Gel',
    brand: 'PURITO',
    category: '스킨케어',
    price: 26000,
    image: '/images/products/centella-soothing-gel.jpg',
    description: '민감한 피부를 진정시키는 센텔라 수딩 젤',
    descriptionKo: '민감한 피부를 진정시키는 센텔라 수딩 젤',
    descriptionEn: 'Centella soothing gel for sensitive skin',
    slot: 5,
    stock: 10,
    isAvailable: true,
    tags: ['젤', '센텔라', '진정']
  },

  // 클렌징
  {
    id: 'prod-006',
    name: '살리실릭 폼 클렌저',
    nameKo: '살리실릭 폼 클렌저',
    nameEn: 'Salicylic Foam Cleanser',
    brand: 'COSRX',
    category: '클렌징',
    price: 24000,
    image: '/images/products/salicylic-foam-cleanser.jpg',
    description: '각질 제거와 모공 정리를 위한 살리실릭 폼 클렌저',
    descriptionKo: '각질 제거와 모공 정리를 위한 살리실릭 폼 클렌저',
    descriptionEn: 'Salicylic foam cleanser for exfoliation and pore care',
    slot: 6,
    stock: 15,
    isAvailable: true,
    tags: ['클렌저', '살리실릭', '각질제거']
  },
  {
    id: 'prod-007',
    name: '그린티 오일 클렌저',
    nameKo: '그린티 오일 클렌저',
    nameEn: 'Green Tea Oil Cleanser',
    brand: 'INNISFREE',
    category: '클렌징',
    price: 32000,
    image: '/images/products/green-tea-oil-cleanser.jpg',
    description: '순한 그린티 성분의 오일 클렌저',
    descriptionKo: '순한 그린티 성분의 오일 클렌저',
    descriptionEn: 'Gentle green tea oil cleanser',
    slot: 7,
    stock: 9,
    isAvailable: true,
    tags: ['오일클렌저', '그린티', '순한']
  },
  {
    id: 'prod-008',
    name: '미셀라 클렌징 워터',
    nameKo: '미셀라 클렌징 워터',
    nameEn: 'Micellar Cleansing Water',
    brand: 'BIODERMA',
    category: '클렌징',
    price: 29000,
    image: '/images/products/micellar-cleansing-water.jpg',
    description: '민감한 피부를 위한 미셀라 클렌징 워터',
    descriptionKo: '민감한 피부를 위한 미셀라 클렌징 워터',
    descriptionEn: 'Micellar cleansing water for sensitive skin',
    slot: 8,
    stock: 11,
    isAvailable: true,
    tags: ['클렌징워터', '미셀라', '민감성']
  },

  // 마스크
  {
    id: 'prod-009',
    name: '히알루론산 시트 마스크',
    nameKo: '히알루론산 시트 마스크',
    nameEn: 'Hyaluronic Acid Sheet Mask',
    brand: 'MEDIHEAL',
    category: '마스크',
    price: 18000,
    image: '/images/products/hyaluronic-sheet-mask.jpg',
    description: '즉각적인 수분 충전을 위한 히알루론산 시트 마스크',
    descriptionKo: '즉각적인 수분 충전을 위한 히알루론산 시트 마스크',
    descriptionEn: 'Hyaluronic acid sheet mask for instant hydration',
    slot: 9,
    stock: 20,
    isAvailable: true,
    tags: ['시트마스크', '히알루론산', '수분']
  },
  {
    id: 'prod-010',
    name: '골드 하이드로겔 마스크',
    nameKo: '골드 하이드로겔 마스크',
    nameEn: 'Gold Hydrogel Mask',
    brand: 'SHANGPREE',
    category: '마스크',
    price: 45000,
    image: '/images/products/gold-hydrogel-mask.jpg',
    description: '프리미엄 골드 성분의 하이드로겔 마스크',
    descriptionKo: '프리미엄 골드 성분의 하이드로겔 마스크',
    descriptionEn: 'Premium gold hydrogel mask',
    slot: 10,
    stock: 7,
    isAvailable: true,
    tags: ['하이드로겔마스크', '골드', '프리미엄']
  },
  {
    id: 'prod-011',
    name: '클레이 퍼리파잉 마스크',
    nameKo: '클레이 퍼리파잉 마스크',
    nameEn: 'Clay Purifying Mask',
    brand: 'ORIGINS',
    category: '마스크',
    price: 38000,
    image: '/images/products/clay-purifying-mask.jpg',
    description: '모공 정화를 위한 클레이 퍼리파잉 마스크',
    descriptionKo: '모공 정화를 위한 클레이 퍼리파잉 마스크',
    descriptionEn: 'Clay purifying mask for pore cleansing',
    slot: 11,
    stock: 8,
    isAvailable: true,
    tags: ['클레이마스크', '퍼리파잉', '모공정화']
  },

  // 메이크업
  {
    id: 'prod-012',
    name: '쿠션 파운데이션',
    nameKo: '쿠션 파운데이션',
    nameEn: 'Cushion Foundation',
    brand: 'IOPE',
    category: '메이크업',
    price: 48000,
    image: '/images/products/cushion-foundation.jpg',
    description: '자연스러운 커버력의 쿠션 파운데이션',
    descriptionKo: '자연스러운 커버력의 쿠션 파운데이션',
    descriptionEn: 'Cushion foundation with natural coverage',
    slot: 12,
    stock: 6,
    isAvailable: true,
    tags: ['쿠션', '파운데이션', '커버력']
  },
  {
    id: 'prod-013',
    name: '매트 립스틱',
    nameKo: '매트 립스틱',
    nameEn: 'Matte Lipstick',
    brand: '3CE',
    category: '메이크업',
    price: 25000,
    image: '/images/products/matte-lipstick.jpg',
    description: '오래 지속되는 매트 립스틱',
    descriptionKo: '오래 지속되는 매트 립스틱',
    descriptionEn: 'Long-lasting matte lipstick',
    slot: 13,
    stock: 14,
    isAvailable: true,
    tags: ['립스틱', '매트', '지속력']
  },
  {
    id: 'prod-014',
    name: '아이섀도 팔레트',
    nameKo: '아이섀도 팔레트',
    nameEn: 'Eyeshadow Palette',
    brand: 'ETUDE HOUSE',
    category: '메이크업',
    price: 35000,
    image: '/images/products/eyeshadow-palette.jpg',
    description: '다양한 컬러의 아이섀도 팔레트',
    descriptionKo: '다양한 컬러의 아이섀도 팔레트',
    descriptionEn: 'Multi-color eyeshadow palette',
    slot: 14,
    stock: 5,
    isAvailable: true,
    tags: ['아이섀도', '팔레트', '컬러']
  },
  {
    id: 'prod-015',
    name: '틴트 블러셔',
    nameKo: '틴트 블러셔',
    nameEn: 'Tint Blusher',
    brand: 'PERIPERA',
    category: '메이크업',
    price: 22000,
    image: '/images/products/tint-blusher.jpg',
    description: '자연스러운 혈색을 연출하는 틴트 블러셔',
    descriptionKo: '자연스러운 혈색을 연출하는 틴트 블러셔',
    descriptionEn: 'Tint blusher for natural flush',
    slot: 15,
    stock: 12,
    isAvailable: true,
    tags: ['블러셔', '틴트', '혈색']
  },

  // 선케어
  {
    id: 'prod-016',
    name: 'SPF50+ 선크림',
    nameKo: 'SPF50+ 선크림',
    nameEn: 'SPF50+ Sunscreen',
    brand: 'MISSHA',
    category: '선케어',
    price: 32000,
    image: '/images/products/spf50-sunscreen.jpg',
    description: '강력한 자외선 차단 효과의 SPF50+ 선크림',
    descriptionKo: '강력한 자외선 차단 효과의 SPF50+ 선크림',
    descriptionEn: 'SPF50+ sunscreen with strong UV protection',
    slot: 16,
    stock: 18,
    isAvailable: true,
    tags: ['선크림', 'SPF50+', '자외선차단']
  },
  {
    id: 'prod-017',
    name: '논케미컬 선스틱',
    nameKo: '논케미컬 선스틱',
    nameEn: 'Non-Chemical Sun Stick',
    brand: 'ROUND LAB',
    category: '선케어',
    price: 28000,
    image: '/images/products/non-chemical-sun-stick.jpg',
    description: '민감한 피부를 위한 논케미컬 선스틱',
    descriptionKo: '민감한 피부를 위한 논케미컬 선스틱',
    descriptionEn: 'Non-chemical sun stick for sensitive skin',
    slot: 17,
    stock: 13,
    isAvailable: true,
    tags: ['선스틱', '논케미컬', '민감성']
  },

  // 스페셜 케어
  {
    id: 'prod-018',
    name: '아이 크림',
    nameKo: '아이 크림',
    nameEn: 'Eye Cream',
    brand: 'SULWHASOO',
    category: '스킨케어',
    price: 85000,
    image: '/images/products/eye-cream.jpg',
    description: '주름과 다크서클 케어를 위한 아이 크림',
    descriptionKo: '주름과 다크서클 케어를 위한 아이 크림',
    descriptionEn: 'Eye cream for wrinkle and dark circle care',
    slot: 18,
    stock: 3,
    isAvailable: true,
    tags: ['아이크림', '주름케어', '다크서클']
  },
  {
    id: 'prod-019',
    name: '립 밤',
    nameKo: '립 밤',
    nameEn: 'Lip Balm',
    brand: 'LANEIGE',
    category: '립케어',
    price: 18000,
    image: '/images/products/lip-balm.jpg',
    description: '촉촉한 입술을 위한 립 밤',
    descriptionKo: '촉촉한 입술을 위한 립 밤',
    descriptionEn: 'Lip balm for moisturized lips',
    slot: 19,
    stock: 16,
    isAvailable: true,
    tags: ['립밤', '보습', '입술케어']
  },
  {
    id: 'prod-020',
    name: '네일 케어 오일',
    nameKo: '네일 케어 오일',
    nameEn: 'Nail Care Oil',
    brand: 'OLIVE YOUNG',
    category: '네일케어',
    price: 15000,
    image: '/images/products/nail-care-oil.jpg',
    description: '큐티클과 네일 케어를 위한 오일',
    descriptionKo: '큐티클과 네일 케어를 위한 오일',
    descriptionEn: 'Oil for cuticle and nail care',
    slot: 20,
    stock: 22,
    isAvailable: true,
    tags: ['네일케어', '큐티클', '오일']
  }
];

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        ...initialState,
        products: sampleProducts,
        
        // 시스템 상태 액션
        setSystemStatus: (status) => 
          set({ systemStatus: status }, false, 'setSystemStatus'),
        
        setLoading: (loading) => 
          set({ isLoading: loading }, false, 'setLoading'),
        
        setError: (error) => 
          set({ error }, false, 'setError'),
        
        // 언어 설정 액션
        setLanguage: (language) => 
          set({ language }, false, 'setLanguage'),
        
        // 센서 관련 액션
        setCurrentDistance: (distance) => 
          set({ currentDistance: distance }, false, 'setCurrentDistance'),
        
        setMonitoring: (monitoring) => 
          set({ isMonitoring: monitoring }, false, 'setMonitoring'),
        
        updateDistance: (reading) => 
          set({ 
            currentDistance: reading.distance 
          }, false, 'updateDistance'),
        
        // 제품 관련 액션
        setProducts: (products) => 
          set({ products }, false, 'setProducts'),
        
        updateProduct: (productId, updates) => 
          set((state) => ({
            products: state.products.map(p => 
              p.id === productId ? { ...p, ...updates } : p
            )
          }), false, 'updateProduct'),
        
        // 장바구니 액션
        addToCart: (product, quantity = 1) => 
          set((state) => {
            const existingItem = state.cart.find(item => item.product.id === product.id);
            if (existingItem) {
              return {
                cart: state.cart.map(item =>
                  item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                )
              };
            }
            return {
              cart: [...state.cart, { product, quantity }]
            };
          }, false, 'addToCart'),
        
        removeFromCart: (productId) => 
          set((state) => ({
            cart: state.cart.filter(item => item.product.id !== productId)
          }), false, 'removeFromCart'),
        
        updateCartQuantity: (productId, quantity) => 
          set((state) => ({
            cart: quantity > 0 
              ? state.cart.map(item =>
                  item.product.id === productId
                    ? { ...item, quantity }
                    : item
                )
              : state.cart.filter(item => item.product.id !== productId)
          }), false, 'updateCartQuantity'),
        
        clearCart: () => 
          set({ cart: [] }, false, 'clearCart'),
        
        // 주문 관련 액션
        createOrder: (paymentMethod) => 
          set((state) => {
            const totalAmount = state.cart.reduce(
              (sum, item) => sum + (item.product.price * item.quantity), 0
            );
            const order: Order = {
              id: `order-${Date.now()}`,
              items: [...state.cart],
              totalAmount,
              total: totalAmount, // PaymentService를 위해 total 속성도 설정
              paymentMethod,
              paymentStatus: 'pending',
              timestamp: Date.now(),
              dispensedItems: []
            };
            return { currentOrder: order };
          }, false, 'createOrder'),
        
        updateOrder: (updates) => 
          set((state) => ({
            currentOrder: state.currentOrder 
              ? { ...state.currentOrder, ...updates }
              : null
          }), false, 'updateOrder'),
        
        completeOrder: () => 
          set({ 
            currentOrder: null, 
            cart: [], 
            currentStep: 'complete' 
          }, false, 'completeOrder'),
        
        // UI 상태 액션
        setCurrentStep: (step) => 
          set({ currentStep: step }, false, 'setCurrentStep'),
        
        setFullscreen: (fullscreen) => 
          set({ isFullscreen: fullscreen }, false, 'setFullscreen'),
        
        // 타이머 관련 액션
        startIdleTimer: () => {
          const { idleTimer, autoResetMinutes } = get();
          if (idleTimer) {
            clearTimeout(idleTimer);
          }
          const timer = setTimeout(() => {
            // resetApp() 대신 필요한 상태만 정리하여 로딩 문제 방지
            set({
              currentOrder: null,
              cart: [],
              currentStep: 'home',
              error: null,
              // isLoading은 초기화하지 않음
            }, false, 'idleReset');
          }, autoResetMinutes * 60 * 1000) as unknown as number;
          
          set({ idleTimer: timer }, false, 'startIdleTimer');
        },
        
        resetIdleTimer: () => {
          const { idleTimer } = get();
          if (idleTimer) {
            clearTimeout(idleTimer);
          }
          get().startIdleTimer();
        },
        
        clearIdleTimer: () => {
          const { idleTimer } = get();
          if (idleTimer) {
            clearTimeout(idleTimer);
            set({ idleTimer: null }, false, 'clearIdleTimer');
          }
        },
        
        // 리셋 액션
        resetApp: () => 
          set({
            ...initialState,
            products: sampleProducts,
            systemStatus: get().systemStatus, // 시스템 상태는 유지
            isLoading: false, // 로딩 상태를 false로 설정하여 무한 로딩 방지
          }, false, 'resetApp'),
      })
    ),
    {
      name: 'cvm-app-store',
    }
  )
);

// 특정 상태 선택을 위한 셀렉터들
export const useSystemStatus = () => useAppStore(state => state.systemStatus);
export const useCurrentStep = () => useAppStore(state => state.currentStep);
export const useCart = () => useAppStore(state => state.cart);
export const useProducts = () => useAppStore(state => state.products);
export const useCurrentOrder = () => useAppStore(state => state.currentOrder);
export const useLanguage = () => useAppStore(state => state.language);
export const useDistance = () => useAppStore(state => state.currentDistance);
export const useLoading = () => useAppStore(state => state.isLoading); 