import React, { useState, useEffect, useRef } from 'react';

// Helper to parse working hours string into start and end time objects
const parseWorkingHours = (str) => {
  const defaultStart = { hour: '03', minute: '00', period: 'AM' };
  const defaultEnd = { hour: '09', minute: '00', period: 'PM' };
  if (!str) return { start: defaultStart, end: defaultEnd };

  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const matches = [...str.matchAll(timeRegex)];

  if (matches.length >= 2) {
    const startHour = parseInt(matches[0][1]);
    const startMin = matches[0][2] || '00';
    const startPeriod = matches[0][3].toUpperCase();

    const endHour = parseInt(matches[1][1]);
    const endMin = matches[1][2] || '00';
    const endPeriod = matches[1][3].toUpperCase();

    return {
      start: {
        hour: String(startHour).padStart(2, '0'),
        minute: String(startMin).padStart(2, '0'),
        period: startPeriod,
      },
      end: {
        hour: String(endHour).padStart(2, '0'),
        minute: String(endMin).padStart(2, '0'),
        period: endPeriod,
      },
    };
  }
  return { start: defaultStart, end: defaultEnd };
};

const ScrollWheel = ({ items, value, onChange }) => {
  const containerRef = useRef(null);
  const itemHeight = 40; // height of each item in px
  const [isReady, setIsReady] = useState(false);

  // Sync scroll position with value
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = items.indexOf(value);
    if (index !== -1) {
      const targetScroll = index * itemHeight;
      if (container.scrollTop !== targetScroll) {
        container.scrollTo({
          top: targetScroll,
          behavior: isReady ? 'smooth' : 'auto',
        });
      }
    }
    if (!isReady) {
      const t = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(t);
    }
  }, [value, items, isReady]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < items.length) {
      const selectedValue = items[index];
      if (selectedValue !== value) {
        onChange(selectedValue);
      }
    }
  };

  const scrollUp = () => {
    const container = containerRef.current;
    if (!container) return;
    const currentIndex = items.indexOf(value);
    const targetIndex = Math.max(0, currentIndex - 1);
    container.scrollTo({
      top: targetIndex * itemHeight,
      behavior: 'smooth',
    });
    onChange(items[targetIndex]);
  };

  const scrollDown = () => {
    const container = containerRef.current;
    if (!container) return;
    const currentIndex = items.indexOf(value);
    const targetIndex = Math.min(items.length - 1, currentIndex + 1);
    container.scrollTo({
      top: targetIndex * itemHeight,
      behavior: 'smooth',
    });
    onChange(items[targetIndex]);
  };

  return (
    <div className="relative flex flex-col items-center bg-white border border-gray-200 rounded-2xl w-[90px] md:w-[100px] overflow-hidden select-none shadow-sm">
      {/* Up Caret */}
      <button
        type="button"
        onClick={scrollUp}
        className="w-full h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-colors z-20 border-b border-gray-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      <div className="relative h-[120px] w-full bg-white overflow-hidden">
        {/* Selected row background highlight pill */}
        <div className="absolute top-[40px] left-2 right-2 h-[40px] bg-blue-50 rounded-xl pointer-events-none z-10" />

        {/* Scrollable list */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[40px]"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {items.map((item, idx) => {
            const isSelected = item === value;
            return (
              <div
                key={item}
                onClick={() => {
                  const container = containerRef.current;
                  if (container) {
                    container.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
                  }
                  onChange(item);
                }}
                className={`h-[40px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 relative z-20 ${
                  isSelected
                    ? 'text-blue-600 text-lg font-bold font-sans'
                    : 'text-gray-300 text-sm hover:text-gray-400'
                }`}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* Down Caret */}
      <button
        type="button"
        onClick={scrollDown}
        className="w-full h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-colors z-20 border-t border-gray-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

const WorkingHoursPickerModal = ({ isOpen, onClose, value, onChange }) => {
  const [activeTab, setActiveTab] = useState('start'); // 'start' | 'end'
  const [tempStart, setTempStart] = useState({ hour: '03', minute: '00', period: 'AM' });
  const [tempEnd, setTempEnd] = useState({ hour: '09', minute: '00', period: 'PM' });

  // Initialize values when opening
  useEffect(() => {
    if (isOpen) {
      const { start, end } = parseWorkingHours(value);
      setTempStart(start);
      setTempEnd(end);
      setActiveTab('start');
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const handleSave = () => {
    const startStr = `${tempStart.hour}:${tempStart.minute} ${tempStart.period}`;
    const endStr = `${tempEnd.hour}:${tempEnd.minute} ${tempEnd.period}`;
    onChange(`${startStr} - ${endStr}`);
    onClose();
  };

  const currentVal = activeTab === 'start' ? tempStart : tempEnd;
  const updateCurrentVal = (key, val) => {
    if (activeTab === 'start') {
      setTempStart((prev) => ({ ...prev, [key]: val }));
    } else {
      setTempEnd((prev) => ({ ...prev, [key]: val }));
    }
  };

  const activeTimeStr = `${currentVal.hour}:${currentVal.minute} ${currentVal.period}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-3xl w-full max-w-[440px] overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900">Select Working Hours</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-100 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'start'
                ? 'text-blue-600 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" />
              </svg>
              <span>Start Time ({tempStart.hour}:{tempStart.minute} {tempStart.period})</span>
            </div>
            {activeTab === 'start' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('end')}
            className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'end'
                ? 'text-blue-600 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" />
              </svg>
              <span>End Time ({tempEnd.hour}:{tempEnd.minute} {tempEnd.period})</span>
            </div>
            {activeTab === 'end' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 bg-gray-50/30">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Select Time</span>

          {/* Wheel Picker Container */}
          <div className="flex justify-center items-center gap-4 py-2">
            {/* Period Column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider">PERIOD</span>
              <ScrollWheel
                items={periods}
                value={currentVal.period}
                onChange={(val) => updateCurrentVal('period', val)}
              />
            </div>

            {/* Hour Column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider">HOUR</span>
              <ScrollWheel
                items={hours}
                value={currentVal.hour}
                onChange={(val) => updateCurrentVal('hour', val)}
              />
            </div>

            {/* Minute Column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider">MINUTE</span>
              <ScrollWheel
                items={minutes}
                value={currentVal.minute}
                onChange={(val) => updateCurrentVal('minute', val)}
              />
            </div>
          </div>

          {/* Info Status Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-700 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.063 1.06l-.041.02-.082.043a4.09 4.09 0 0 1-2.03.377 3.625 3.625 0 0 1-1.307-.323l-.088-.042a.75.75 0 1 1 .66-1.344l.088.042c.119.056.27.095.424.116.155.02.325.006.49-.033l.085-.022ZM12 9a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm0-5.25a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z" />
            </svg>
            <span>Selected {activeTab === 'start' ? 'Start' : 'End'} Time: <strong className="font-semibold">{activeTimeStr}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-gray-100 flex gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkingHoursPickerModal;
