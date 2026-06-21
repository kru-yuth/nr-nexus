import { Font } from '@react-pdf/renderer';

const isBrowser = typeof window !== 'undefined';
const regularPath = isBrowser ? '/fonts/Sarabun-Regular.ttf' : './public/fonts/Sarabun-Regular.ttf';
const boldPath = isBrowser ? '/fonts/Sarabun-Bold.ttf' : './public/fonts/Sarabun-Bold.ttf';

Font.register({
    family: 'Sarabun',
    fonts: [
        { src: regularPath, fontWeight: 'normal' },
        { src: boldPath, fontWeight: 'bold' }
    ]
});
