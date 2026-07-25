import React, { createContext, useContext, useEffect, useState } from 'react';

const ColorContext = createContext();

export const colorSchemes = [
    { id: 'navy', name: 'Corporate Navy' },
    { id: 'emerald', name: 'Forest Emerald' },
    { id: 'amethyst', name: 'Royal Amethyst' },
    { id: 'sunset', name: 'Sunset Orange' },
    { id: 'slate', name: 'Slate Gray' }
];

export const ColorProvider = ({ children }) => {
    const [currentColor, setCurrentColor] = useState(() => {
        return localStorage.getItem('app-color-scheme') || 'navy';
    });

    useEffect(() => {
        localStorage.setItem('app-color-scheme', currentColor);
        // Remove all color classes first
        colorSchemes.forEach(c => document.documentElement.classList.remove(`color-${c.id}`));
        // Add the current color class to the HTML element
        document.documentElement.classList.add(`color-${currentColor}`);
    }, [currentColor]);

    return (
        <ColorContext.Provider value={{ currentColor, setCurrentColor, colorSchemes }}>
            {children}
        </ColorContext.Provider>
    );
};

export const useColor = () => useContext(ColorContext);
