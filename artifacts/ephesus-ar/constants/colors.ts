/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F4F7F6',
    tint: '#66E3D0',
    background: '#07110F',
    foreground: '#F4F7F6',
    card: '#10201D',
    cardForeground: '#F4F7F6',
    primary: '#66E3D0',
    primaryForeground: '#07110F',
    secondary: '#19312D',
    secondaryForeground: '#D8E7E3',
    muted: '#122521',
    mutedForeground: '#8EA7A1',
    accent: '#E7AD5A',
    accentForeground: '#07110F',
    destructive: '#F0655B',
    destructiveForeground: '#FFF6F5',
    border: '#24413B',
    input: '#1B342F',
    ink: '#07110F',
    panel: '#0D1B18',
    cyan: '#66E3D0',
    amber: '#E7AD5A',
    signal: '#F0655B',
    paper: '#D8E7E3',
    overlay: 'rgba(7,17,15,0.82)',
  },
  radius: 18,
};

export default colors;
