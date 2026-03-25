import React from 'react';

export const ThemeContext = React.createContext<boolean>(true); // true = dark (default)

export const useAdminTheme = () => React.useContext(ThemeContext);
