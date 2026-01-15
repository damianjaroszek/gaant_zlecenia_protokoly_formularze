import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-theme-toggle"
      title={theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
      aria-label={theme === 'light' ? 'Przełącz na tryb ciemny' : 'Przełącz na tryb jasny'}
    >
      {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
    </button>
  );
}
