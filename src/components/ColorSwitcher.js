import React from 'react';
import { useColor } from '../ColorContext';

const ColorSwitcher = () => {
    const { currentColor, setCurrentColor, colorSchemes } = useColor();

    return (
        <div className="fixed top-24 right-8 z-[9999] flex flex-col items-end gap-1 p-3 rounded-xl shadow-2xl bg-theme-smallBoxBg text-theme-smallBoxText border-2 border-theme-accent">
            <label className="text-[10px] font-semibold tracking-wider text-theme-textMuted uppercase mr-1">
                Color Scheme
            </label>
            <select 
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="bg-theme-smallBoxBg text-theme-smallBoxText border border-theme-borderColor rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all outline-none cursor-pointer"
            >
                {colorSchemes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        </div>
    );
};

export default ColorSwitcher;
