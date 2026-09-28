/** @type {import('tailwindcss').Config} */

/**
 * Every palette colour reads an RGB triplet from a CSS variable declared in
 * web/src/index.css, where `:root` holds the light values and `.dark` the dark
 * ones. Components use `bg-mist-100` or `text-ink-900`; the theme switch
 * changes what those names resolve to.
 *
 * The palette follows design.md (an Apple-style product page): a white gallery
 * canvas, Studio Mist bands, near-black Ink type, and one blue kept for links
 * and compact action pills.
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name, steps) =>
  Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]));

export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ink: 900 headlines and body, 700 strong secondary, 600 Slate secondary copy,
        // 200 hairlines and placeholders, 50–100 the palest tints.
        ink: scale('ink', [50, 100, 200, 600, 700, 800, 900]),
        // Accent blue: 500 Pricing Blue for filled pills, 600 Apple Blue for links.
        accent: scale('accent', [50, 100, 200, 300, 400, 500, 600, 700]),
        // Grounds: 50 Paper Frost, 100 Studio Mist, 200 Control Gray, 300 Hairline Silver.
        mist: scale('mist', [50, 100, 200, 300]),
        // Card and input surface: Gallery White in the light theme.
        surface: v('surface'),
        // Launch Orange, only for small bare status text such as "new".
        launch: v('launch'),
        // Colours that must not follow the theme (brand marks, photo overlays).
        tetap: {
          ink: '#1d1d1f',
          mist: '#f5f5f7',
        },
      },
      fontFamily: {
        // SF Pro where the platform has it; Inter is the published substitute.
        sans: ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Type scale from design.md: [size, { lineHeight, letterSpacing }].
        nav: ['12px', { lineHeight: '1.33', letterSpacing: '-0.12px' }],
        'body-sm': ['14px', { lineHeight: '1.29', letterSpacing: '-0.224px' }],
        body: ['17px', { lineHeight: '1.47', letterSpacing: '-0.374px' }],
        'nav-title': ['19px', { lineHeight: '1.21', letterSpacing: '0.228px' }],
        kicker: ['21px', { lineHeight: '1', letterSpacing: '0.231px' }],
        'feature-sm': ['28px', { lineHeight: '1.14', letterSpacing: '0.196px' }],
        feature: ['40px', { lineHeight: '1.1', letterSpacing: '0px' }],
        hero: ['80px', { lineHeight: '1.05', letterSpacing: '-1.2px' }],
      },
      borderRadius: {
        card: '28px',
        nav: '20px',
      },
      boxShadow: {
        // The only elevation mark in the system: a 1px ring, never a cast shadow.
        subtle: 'rgb(230, 230, 232) 0px 0px 0px 1px',
      },
      spacing: {
        section: '90px',
      },
    },
  },
  plugins: [],
};
