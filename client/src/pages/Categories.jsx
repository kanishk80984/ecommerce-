import React from 'react';
import * as rrdPkg from 'react-router-dom';
const { useNavigate } = rrdPkg;
import {
  SparklesTwoTone,
  ShirtTwoTone,
  MobileTwoTone,
  MonitorTwoTone,
  BeautyTwoTone,
  HomeTwoTone,
  TvTwoTone,
  PuzzleTwoTone,
  BasketTwoTone,
  CarTwoTone,
  DumbbellTwoTone,
  SofaTwoTone,
  BooksTwoTone,
  BikeTwoTone,
  GridTwoTone
} from '../components/TwoToneIcons';

const TOP_BAR_CATEGORIES = [
  { id: 'cat1', name: 'For You', dbName: 'For You' },
  { id: 'cat2', name: 'Fashion', dbName: 'Fashion' },
  { id: 'cat3', name: 'Mobiles', dbName: 'Mobiles' },
  { id: 'cat4', name: 'Electronics', dbName: 'Electronics' },
  { id: 'cat5', name: 'Beauty', dbName: 'Beauty' },
  { id: 'cat6', name: 'Home', dbName: 'Home' },
  { id: 'cat7', name: 'Appliances', dbName: 'Appliances' },
  { id: 'cat8', name: 'Toys, baby', dbName: 'Toys & Baby' },
  { id: 'cat9', name: 'Food', dbName: 'Food & Grocery' },
  { id: 'cat10', name: 'Auto', dbName: 'Auto Accessories' },
  { id: 'cat11', name: 'Sports', dbName: 'Sports & Fitness' },
  { id: 'cat12', name: 'Furniture', dbName: 'Furniture' },
  { id: 'cat13', name: 'Books', dbName: 'Books' },
  { id: 'cat14', name: '2 Wheelers', dbName: 'Two Wheelers' }
];

const iconMap = {
  'For You': SparklesTwoTone,
  'Fashion': ShirtTwoTone,
  'Mobiles': MobileTwoTone,
  'Electronics': MonitorTwoTone,
  'Beauty': BeautyTwoTone,
  'Home': HomeTwoTone,
  'Appliances': TvTwoTone,
  'Toys & Baby': PuzzleTwoTone,
  'Food & Grocery': BasketTwoTone,
  'Auto Accessories': CarTwoTone,
  'Sports & Fitness': DumbbellTwoTone,
  'Furniture': SofaTwoTone,
  'Books': BooksTwoTone,
  'Two Wheelers': BikeTwoTone
};

const Categories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
          <GridTwoTone className="text-[var(--color-primary)]" size={24} />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Categories</h1>
        </div>

        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {TOP_BAR_CATEGORIES.map((cat) => {
            const IconComponent = iconMap[cat.dbName] || GridTwoTone;
            
            return (
              <div
                key={cat.id}
                className="bg-white border border-gray-100 md:border-gray-200 rounded-lg md:rounded-xl p-1.5 md:p-4 flex flex-col items-center justify-start text-center hover:shadow-md hover:border-yellow-200 transition-all cursor-pointer group"
                onClick={() => navigate(`/products?category=${encodeURIComponent(cat.dbName)}`)}
              >
                <div className="w-11 h-11 md:w-14 md:h-14 bg-white border border-gray-50 md:border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-1.5 md:mb-3 group-hover:scale-110 group-hover:border-yellow-400 transition-transform">
                  <IconComponent size={22} className="drop-shadow-sm md:w-[30px] md:h-[30px]" />
                </div>
                <h3 className="font-semibold md:font-bold text-gray-700 md:text-gray-800 text-[10px] md:text-sm leading-tight md:leading-normal group-hover:text-[var(--color-primary)] line-clamp-2">{cat.name}</h3>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
