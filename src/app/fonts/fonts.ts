import localFont from 'next/font/local';

export const inter = localFont({
  src: [
    {
      path: './inter.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-inter-sans',
  display: 'swap',
});

export const geograph = localFont({
  src: [
    // Normal (upright)
    { path: './geograph/geograph-light.woff2', weight: '300', style: 'normal' },
    { path: './geograph/geograph-regular.woff2', weight: '400', style: 'normal' },
    { path: './geograph/geograph-medium.woff2', weight: '500', style: 'normal' },
    { path: './geograph/geograph-bold.woff2', weight: '700', style: 'normal' },

    // Italic
    { path: './geograph/geograph-light-italic.woff2', weight: '300', style: 'italic' },
    { path: './geograph/geograph-regular-italic.woff2', weight: '400', style: 'italic' },
    { path: './geograph/geograph-medium-italic.woff2', weight: '500', style: 'italic' },
    { path: './geograph/geograph-bold-italic.woff2', weight: '700', style: 'italic' },
  ],
  variable: '--font-geograph',
  display: 'swap',
});

export const playfair = localFont({
  src: [
    {
      path: './playfair/PlayfairDisplay-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './playfair/PlayfairDisplay-Italic-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'italic',
    }
  ],
  variable: '--font-playfair',
  display: 'swap',
});
