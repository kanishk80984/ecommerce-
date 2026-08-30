import React from 'react';

// Common stroke color and white accent
const S_COLOR = "#cc0000"; // Red borders
const Y_FILL = "#ffffff2d"; // White fill

export const SparklesTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 3L12 8L17 10L12 12L10 17L8 12L3 10L8 8L10 3Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 15L20 17.5L22.5 18.5L20 19.5L19 22L18 19.5L15.5 18.5L18 17.5L19 15Z" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchTwoTone = ({ size = 24, className = "", fillColor = Y_FILL }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="halfSearchFill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="50%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor={fillColor} />
      </linearGradient>
    </defs>
    <circle cx="11" cy="11" r="8" fill="url(#halfSearchFill)" stroke={S_COLOR} strokeWidth="1.2" />
    <path d="M21 21L16.65 16.65" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShirtTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 20V9L15 5H9L4 9V20H20Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 5V8L12 10L15 8V5" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 10V20" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 20H15V13L12 10L9 13V20Z" fill={Y_FILL} />
  </svg>
);

export const MobileTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="5.5" y="5" width="13" height="12" fill={Y_FILL} />
    <path d="M11 19H13" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MonitorTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="4" width="18" height="12" rx="2" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 20H16" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16V20" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3.5" y="4.5" width="17" height="11" fill={Y_FILL} />
  </svg>
);

export const BeautyTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="3" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
    <path d="M12 9C12 9 10 4 12 4C14 4 12 9 12 9Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M12 15C12 15 10 20 12 20C14 20 12 15 12 15Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M9 12C9 12 4 10 4 12C4 14 9 12 9 12Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M15 12C15 12 20 10 20 12C20 14 15 12 15 12Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

export const HomeTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 21V12H15V21H9Z" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TvTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="7" width="20" height="14" rx="2" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 21H16" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17V21" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 3L12 7L16 3" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2.5" y="7.5" width="19" height="13" fill={Y_FILL} />
  </svg>
);

export const PuzzleTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19.439 7.842C19.439 6.22 18.125 4.906 16.503 4.906C14.88 4.906 13.567 6.22 13.567 7.842V9H10.16C10.16 7.378 8.847 6.064 7.225 6.064C5.602 6.064 4.289 7.378 4.289 9H3V21H15V19.711C15 18.089 16.313 16.775 17.935 16.775C19.558 16.775 20.871 18.089 20.871 19.711V21H21V7.842H19.439Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="7.225" cy="9.45" r="2.5" fill={Y_FILL} />
  </svg>
);

export const BasketTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 8L6 20C6 20.5523 6.44772 21 7 21H17C17.5523 21 18 20.5523 18 20L19 8" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 8V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V8" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 8H19" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="6.2" y="16" width="11.6" height="4.5" fill={Y_FILL} />
  </svg>
);

export const CarTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 10L5 6H19L21 10V17C21 17.5523 20.5523 18 20 18H4C3.44772 18 3 17.5523 3 17V10Z" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 10H21" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="14" r="2" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
    <circle cx="17" cy="14" r="2" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
  </svg>
);

export const DumbbellTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 5V19" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 5V19" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 12H18" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2" y="8" width="4" height="8" rx="1" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
    <rect x="18" y="8" width="4" height="8" rx="1" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
  </svg>
);

export const SofaTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 14V17C4 17.5523 4.44772 18 5 18H19C19.5523 18 20 17.5523 20 17V14" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 14C4 12.8954 4.89543 12 6 12H18C19.1046 12 20 12.8954 20 14V14H4V14Z" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 12V7C6 5.89543 6.89543 5 8 5H16C17.1046 5 18 5.89543 18 7V12" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 18V21" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 18V21" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BooksTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 19C4 19 4 6 4 5C4 3.89543 4.89543 3 6 3H20V17H6C4.89543 17 4 17.8954 4 19ZM4 19C4 20.1046 4.89543 21 6 21H20V17" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="7" y="6" width="9" height="3" fill={Y_FILL} />
  </svg>
);

export const BikeTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="5.5" cy="15.5" r="3.5" stroke={S_COLOR} strokeWidth="1.2" />
    <circle cx="18.5" cy="15.5" r="3.5" stroke={S_COLOR} strokeWidth="1.2" />
    <circle cx="18.5" cy="15.5" r="1.5" fill={Y_FILL} />
    <circle cx="5.5" cy="15.5" r="1.5" fill={Y_FILL} />
    <path d="M15 6V11L18.5 15.5" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 15.5L9 9H15" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 6H16" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 9H11" stroke={S_COLOR} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GridTwoTone = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="6" height="6" rx="1" stroke={S_COLOR} strokeWidth="1.2" />
    <rect x="14" y="4" width="6" height="6" rx="1" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
    <rect x="4" y="14" width="6" height="6" rx="1" fill={Y_FILL} stroke={S_COLOR} strokeWidth="1.2" />
    <rect x="14" y="14" width="6" height="6" rx="1" stroke={S_COLOR} strokeWidth="1.2" />
  </svg>
);