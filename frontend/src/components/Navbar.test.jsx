import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from './Navbar';

const renderWithProviders = (component) => {
    return render(
        <ThemeProvider>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </ThemeProvider>
    );
};

describe('Navbar Component', () => {
    it('renders correctly', () => {
        renderWithProviders(<Navbar />);
        expect(screen.getByText('Nexus Monitor')).toBeInTheDocument();
        expect(screen.getByText('Features')).toBeInTheDocument();
        expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('toggles theme when button is clicked', () => {
        renderWithProviders(<Navbar />);
        const toggleButton = screen.getByLabelText('Toggle Theme');

        // Initial state (Dark) - Icon should be sun (to switch to light) or moon?
        // In my code: isDark ? 'fa-sun' : 'fa-moon'
        // So initially isDark=true, icon is sun.
        expect(toggleButton.innerHTML).toContain('fa-sun');

        fireEvent.click(toggleButton);

        // After click (Light) - Icon should be moon
        expect(toggleButton.innerHTML).toContain('fa-moon');
    });
});
