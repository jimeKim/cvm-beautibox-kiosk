import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { Product } from '@/types';
import ProductImage from '@/components/ProductImage';
import LanguageSelector from '@/components/LanguageSelector';

const ProductsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { 
    products, 
    addToCart, 
    setCurrentStep, 
    resetIdleTimer,
    cart
  } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'brand'>('name');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  // 카테고리 목록 생성
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return ['all', ...uniqueCategories];
  }, [products]);

  // 브랜드 목록 생성
  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(products.map(p => p.brand))];
    return ['all', ...uniqueBrands];
  }, [products]);

  // 가격 범위 계산
  const [minPrice, maxPrice] = useMemo(() => {
    if (products.length === 0) return [0, 100000];
    const prices = products.map(p => p.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [products]);

  // 초기 가격 범위 설정
  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice]);

  // 필터링 및 정렬된 제품 목록
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // 카테고리 필터
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }
      
      // 브랜드 필터
      if (selectedBrand !== 'all' && product.brand !== selectedBrand) {
        return false;
      }
      
      // 가격 범위 필터
      if (product.price < priceRange[0] || product.price > priceRange[1]) {
        return false;
      }
      
      // 검색 필터
      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(search) ||
          product.brand.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search)
        );
      }
      
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'brand':
          return a.brand.localeCompare(b.brand);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, selectedBrand, priceRange, searchTerm, sortBy]);

  // 장바구니 아이템 수
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 상품 추가 핸들러
  const handleAddToCart = (product: Product) => {
    addToCart(product);
    resetIdleTimer();
  };

  // 장바구니로 이동
  const handleGoToCart = () => {
    setCurrentStep('cart');
  };

  // 뒤로 가기
  const handleGoBack = () => {
    setCurrentStep('home');
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSortBy('name');
    setSearchTerm('');
    setPriceRange([minPrice, maxPrice]);
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button 
          onClick={handleGoBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        
        <h1 className="text-2xl font-bold text-gray-800">
          {t('products.title')}
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* 하드웨어 설정 버튼 (언어 선택기 왼쪽) */}
          <button
            onClick={() => setCurrentStep('hardware-config')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors shadow-sm border border-gray-300"
            title="하드웨어 설정 (Ctrl+Alt+H)"
          >
            <span className="text-lg">⚙️</span>
          </button>
          <LanguageSelector size="sm" />
          <button 
            onClick={handleGoToCart}
            className="relative bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
          >
            {t('cart.goToCart')}
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 필터 및 검색 섹션 */}
      <div className="bg-white shadow-sm p-4 border-b">
        <div className="max-w-7xl mx-auto">
          {/* 검색바 */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder={t('products.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 필터 옵션 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* 카테고리 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('products.category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {t(`products.categories.${category}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* 브랜드 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('products.brand')}
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              >
                <option value="all">{t('products.brands.all')}</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* 정렬 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('products.sortBy.label')}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'brand')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              >
                <option value="name">{t('products.sortBy.name')}</option>
                <option value="price">{t('products.sortBy.price')}</option>
                <option value="brand">{t('products.sortBy.brand')}</option>
              </select>
            </div>

            {/* 필터 초기화 버튼 */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('products.resetFilters')}
              </button>
            </div>
          </div>

          {/* 가격 범위 슬라이더 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('products.priceRange')}: ₩{priceRange[0].toLocaleString()} - ₩{priceRange[1].toLocaleString()}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                className="flex-1"
              />
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 제품 그리드 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* 결과 수 표시 */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {t('products.resultCount', { count: filteredProducts.length })}
            </p>
            {searchTerm && (
              <p className="text-gray-600">
                "{searchTerm}" {t('products.searchResults')}
              </p>
            )}
          </div>

          {/* 제품 목록 */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4L9 5" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('products.noResults')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('products.noResultsDescription')}
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('products.resetFilters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
                >
                  {/* 제품 이미지 */}
                  <div className="aspect-square bg-gray-100 relative">
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      category={product.category}
                      className="w-full h-full object-cover"
                    />
                    {!product.isAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {t('products.outOfStock')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 제품 정보 */}
                  <div className="p-4">
                    <div className="mb-3">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {t(`products.categories.${product.category}`)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-2">
                      {product.brand}
                    </p>
                    
                    <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                      {product.description}
                    </p>

                    {/* 가격 및 재고 정보 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-purple-600">
                          ₩{product.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {t('products.stockCount', { count: product.stock || 0 })}
                        </span>
                      </div>
                      {product.isAvailable && (
                        <span className="text-green-600 text-sm font-medium">
                          {t('products.inStock')}
                        </span>
                      )}
                    </div>

                    {/* 장바구니 버튼 */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.isAvailable}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                        product.isAvailable
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {product.isAvailable ? t('products.addToCart') : t('products.outOfStock')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsScreen; 