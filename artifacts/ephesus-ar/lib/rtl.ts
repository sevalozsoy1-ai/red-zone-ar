import { Platform, type ViewStyle } from 'react-native';

/**
 * React Native accepts `direction` on native layout containers, while
 * react-native-web expects the CSS writing direction property. Keeping the
 * platform split here prevents RNW's invalid-style LogBox warning.
 */
export const rtlLayout = Platform.OS === 'web'
  ? ({ writingDirection: 'rtl' } as unknown as ViewStyle)
  : ({ direction: 'rtl' } as ViewStyle);