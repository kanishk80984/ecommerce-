import React from 'react';

export const Shimmer = ({ className = '' }) => (
  <div className={`animate-shimmer rounded-md ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="border border-gray-150 rounded-2xl p-3.5 flex flex-col bg-white h-full">
    <Shimmer className="h-36 md:h-44 w-full mb-3 rounded-xl" />
    <Shimmer className="h-4 w-3/4 mb-2" />
    <Shimmer className="h-3 w-1/2 mb-3" />
    <div className="flex items-center gap-1 mb-3">
      <Shimmer className="h-4 w-8 rounded" />
      <Shimmer className="h-3 w-10 rounded" />
    </div>
    <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
      <div>
        <Shimmer className="h-5 w-16 mb-1" />
        <Shimmer className="h-3 w-12" />
      </div>
      <Shimmer className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

export const BusinessCardSkeleton = () => (
  <div className="flex-shrink-0 w-52 md:w-60 bg-white border border-gray-100 rounded-xl overflow-hidden p-3">
    <Shimmer className="h-20 w-full rounded-lg mb-3" />
    <Shimmer className="h-4 w-3/4 mb-1" />
    <Shimmer className="h-3 w-1/2 mb-2" />
    <div className="flex items-center gap-2 mb-3">
      <Shimmer className="h-4 w-10" />
      <Shimmer className="h-3 w-12" />
    </div>
    <Shimmer className="h-3 w-full mb-1" />
    <Shimmer className="h-3 w-5/6 mb-3" />
    <Shimmer className="h-4 w-16" />
  </div>
);

export const CategoryNavSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-2 min-w-[70px] md:min-w-[100px]">
        <Shimmer className="w-16 h-16 rounded-full" />
        <Shimmer className="h-3 w-12" />
      </div>
    ))}
  </div>
);

export const CarouselSkeleton = ({ title }) => (
  <div className="bg-white shadow-sm md:rounded-xl p-4 w-full">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <Shimmer className="h-3 w-32 mt-1" />
      </div>
      <Shimmer className="h-8 w-20 rounded-md" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 4 }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <Shimmer className="h-4 w-full" />
      </td>
    ))}
  </tr>
);
