import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const themes = [
    { id: 'dracula', name: 'VS Code Dracula' },
    { id: 'vercel', name: 'Minimalist Monochrome' },
    { id: 'cyberpunk', name: 'Cyberpunk Terminal' },
    { id: 'notion', name: 'Notion Light' },
    { id: 'nord', name: 'Nord Arctic' },
];

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('app-ui-theme') || 'dracula';
    });

    useEffect(() => {
        localStorage.setItem('app-ui-theme', currentTheme);
        // Remove all theme classes first
        themes.forEach(t => document.documentElement.classList.remove(`theme-${t.id}`));
        // Add the current theme class to the HTML element
        document.documentElement.classList.add(`theme-${currentTheme}`);
    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
