/**
 * 이미지 최적화 및 관리를 위한 유틸리티 함수들
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * 이미지 URL을 최적화된 형태로 변환
 */
export const optimizeImageUrl = (
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string => {
  // 실제 이미지 최적화 서비스 사용 시 구현
  // 예: Cloudinary, ImageKit, 또는 자체 이미지 서버
  // const { width = 400, height = 400, quality = 85, format = 'webp' } = options;
  
  // 현재는 원본 URL 반환 (개발 환경)
  return originalUrl;
};

/**
 * 제품 이미지 경로 생성
 */
export const getProductImagePath = (
  productId: string,
  filename: string,
  size: 'thumbnail' | 'medium' | 'large' = 'medium'
): string => {
  const sizeMap = {
    thumbnail: '150x150',
    medium: '400x400',
    large: '800x800'
  };
  
  return `/images/products/${size}/${productId}/${filename}`;
};

/**
 * 플레이스홀더 이미지 생성
 */
export const generatePlaceholderImage = (
  width: number = 400,
  height: number = 400,
  backgroundColor: string = '#f0f0f0',
  textColor: string = '#999999',
  text: string = 'Product Image'
): string => {
  // SVG 기반 플레이스홀더 이미지 생성
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
            font-family="Arial, sans-serif" font-size="16" fill="${textColor}">
        ${text}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * 이미지 사전 로딩
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * 여러 이미지 사전 로딩
 */
export const preloadImages = (sources: string[]): Promise<void[]> => {
  return Promise.all(sources.map(preloadImage));
};

/**
 * 이미지 압축 (클라이언트 사이드)
 */
export const compressImage = (
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 크기 계산
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // 캔버스 설정
      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx?.drawImage(img, 0, 0, width, height);

      // Blob 생성
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 이미지 메타데이터 추출
 */
export const getImageMetadata = (file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
  name: string;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
        name: file.name
      });
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 이미지 URL 유효성 검증
 */
export const validateImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * 카테고리별 기본 이미지 매핑
 */
export const getCategoryPlaceholder = (category: string): string => {
  const placeholderMap: Record<string, string> = {
    '스킨케어': generatePlaceholderImage(400, 400, '#e3f2fd', '#1976d2', 'SKINCARE'),
    '클렌징': generatePlaceholderImage(400, 400, '#e8f5e8', '#388e3c', 'CLEANSING'),
    '마스크': generatePlaceholderImage(400, 400, '#f3e5f5', '#7b1fa2', 'MASK'),
    '메이크업': generatePlaceholderImage(400, 400, '#fce4ec', '#c2185b', 'MAKEUP'),
    '선케어': generatePlaceholderImage(400, 400, '#fff3e0', '#f57c00', 'SUNCARE'),
    '립케어': generatePlaceholderImage(400, 400, '#ffebee', '#d32f2f', 'LIP CARE'),
    '네일케어': generatePlaceholderImage(400, 400, '#e8eaf6', '#3f51b5', 'NAIL CARE')
  };
  
  return placeholderMap[category] || generatePlaceholderImage(400, 400, '#f5f5f5', '#9e9e9e', 'PRODUCT');
};

/**
 * 이미지 리사이징 (클라이언트 사이드)
 */
export const resizeImage = (
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> => {
  return compressImage(file, {
    maxWidth: targetWidth,
    maxHeight: targetHeight,
    quality: 1,
    format: 'png'
  });
}; 