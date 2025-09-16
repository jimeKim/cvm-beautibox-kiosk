import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  brand?: string;
  category?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  brand = '',
  category = '',
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // 카테고리별 색상 설정
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case '스킨케어':
        return 'bg-blue-100 text-blue-600';
      case '클렌징':
        return 'bg-green-100 text-green-600';
      case '마스크':
        return 'bg-purple-100 text-purple-600';
      case '메이크업':
        return 'bg-pink-100 text-pink-600';
      case '선케어':
        return 'bg-yellow-100 text-yellow-600';
      case '립케어':
        return 'bg-red-100 text-red-600';
      case '네일케어':
        return 'bg-indigo-100 text-indigo-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 플레이스홀더 이미지 생성
  const generatePlaceholder = () => {
    const categoryColor = getCategoryColor(category);
    
    return (
      <div className={`${className} ${categoryColor} flex flex-col items-center justify-center p-4 rounded-lg`}>
        <Package className="w-12 h-12 mb-2 opacity-50" />
        <div className="text-center">
          <div className="font-semibold text-sm mb-1">{brand}</div>
          <div className="text-xs opacity-70">{category}</div>
        </div>
      </div>
    );
  };

  if (hasError) {
    return generatePlaceholder();
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      
      {/* 브랜드 라벨 */}
      {brand && !isLoading && !hasError && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {brand}
        </div>
      )}
    </div>
  );
};

export default ProductImage; 