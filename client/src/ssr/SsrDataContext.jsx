import React, { createContext, useContext, useState } from 'react';

const SsrDataContext = createContext(null);

export const SsrDataProvider = ({ children, initialData }) => {
  const [data, setData] = useState(initialData);

  return (
    <SsrDataContext.Provider value={{ data, setData }}>
      {children}
    </SsrDataContext.Provider>
  );
};

export const useSsrData = () => {
  return useContext(SsrDataContext);
};
