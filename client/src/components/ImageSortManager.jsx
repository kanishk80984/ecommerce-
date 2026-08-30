import React from 'react';
import EnterpriseImageUploader from './EnterpriseImageUploader';

/**
 * ImageSortManager — Backward-compatible wrapper around EnterpriseImageUploader.
 * All existing usages in ProductUpload.jsx and other files automatically get
 * the new enterprise upload experience (crop editor, optimization, drag & drop).
 *
 * Original props preserved:
 *   images, onChange, maxFileSizeMB
 */
const ImageSortManager = ({ images = [], onChange, maxFileSizeMB = 5, ...rest }) => {
  return (
    <EnterpriseImageUploader
      images={images}
      onChange={onChange}
      maxFileSizeMB={maxFileSizeMB}
      module="products"
      aspectRatio="1:1"
      allowedRatios={['1:1', '4:5', '16:9', 'free']}
      showAltText={true}
      showImageType={true}
      showSeoTitle={false}
      {...rest}
    />
  );
};

export default ImageSortManager;
