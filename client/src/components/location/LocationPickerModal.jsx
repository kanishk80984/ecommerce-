import React from 'react';
import LocationPicker from './LocationPicker';

const LocationPickerModal = ({
  isOpen,
  initialLocation,
  onSave,
  onCancel,
  darkMode = false,
  title = "Select Location on Map",
  subtitle = "Search location or drag marker to set precise address"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-5xl h-[85vh] max-h-[750px] animate-[fadeIn_0.2s_ease-out]">
        <LocationPicker
          initialLocation={initialLocation}
          onSave={onSave}
          onCancel={onCancel}
          darkMode={darkMode}
          title={title}
          subtitle={subtitle}
        />
      </div>
    </div>
  );
};

export default LocationPickerModal;
