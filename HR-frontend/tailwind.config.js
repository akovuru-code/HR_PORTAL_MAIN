/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'employee': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                // Employee-specific font sizes
                'emp-h1': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
                'emp-h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
                'emp-h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                'emp-h4': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                'emp-base': ['1rem', { lineHeight: '1.5rem' }],
                'emp-sm': ['0.875rem', { lineHeight: '1.25rem' }],

                //  Admin-specific font sizes
                'admin-h1': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
                'admin-h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
                'admin-h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                'admin-h4': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                'admin-base': ['1rem', { lineHeight: '1.5rem' }],
                'admin-sm': ['0.875rem', { lineHeight: '1.25rem' }],
            },
        },
    },
    plugins: [],
}