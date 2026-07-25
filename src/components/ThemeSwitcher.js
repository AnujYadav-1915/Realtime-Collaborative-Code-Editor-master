import React from 'react';
import { useTheme } from '../ThemeContext';

const ThemeSwitcher = () => {
    const { currentTheme, setCurrentTheme, themes } = useTheme();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
            <label className="text-[10px] font-semibold tracking-wider text-[var(--tw-text-muted,theme('colors.slate.500'))] uppercase mr-1">
                UI Theme
            </label>
            <select 
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value)}
                className="bg-[var(--tw-bg-surface,theme('colors.slate.800'))] text-[var(--tw-text-primary,theme('colors.slate.100'))] border border-[var(--tw-border-color,theme('colors.slate.700'))] rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all outline-none cursor-pointer"
            >
                {themes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
        </div>
    );
};

export default ThemeSwitcher;
