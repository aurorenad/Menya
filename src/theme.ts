// Menya design tokens. Every screen and the Design System page read from here.

export const colors = {
  // Brand gradient (from the reference screenshot)
  gradientTop: '#5FA8B5',
  gradientBottom: '#8CC3CE',
  gradientDeep: '#2F7F8F', // deeper teal: buttons + key text

  teal: '#2F7F8F',
  tealDark: '#1F5F6D', // pressed state
  ink: '#0E3B45', // high-contrast text on gradient / glass (>= 4.5:1)
  inkSoft: '#1D5260', // secondary text on glass (>= 4.5:1)
  white: '#FFFFFF',

  glass: 'rgba(255,255,255,0.26)',
  glassStrong: 'rgba(255,255,255,0.42)',
  glassBorder: 'rgba(255,255,255,0.55)',
  glassDark: 'rgba(14,59,69,0.28)',

  // Status colours. Always paired with an icon and a text label.
  normal: '#1E9E6A',
  normalText: '#0F6B47',
  normalBg: '#E4F6EE',
  watch: '#E8A317',
  watchText: '#7A4F00',
  watchBg: '#FFF3D6',
  alert: '#E5645A',
  alertText: '#A62E25',
  alertBg: '#FDE7E4',

  danger: '#C2362B',
  offline: '#33474D',
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30 },
  h3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
} as const;

export const radius = { card: 24, small: 16, pill: 999 };

export const shadow = {
  shadowColor: '#0E3B45',
  shadowOpacity: 0.16,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const MIN_TAP = 48;

export type Status = 'normal' | 'watch' | 'followup';

export const statusMeta: Record<
  Status,
  { icon: 'check-circle' | 'eye' | 'phone-call'; color: string; text: string; bg: string; labelKey: string }
> = {
  normal: { icon: 'check-circle', color: colors.normal, text: colors.normalText, bg: colors.normalBg, labelKey: 'status.normal' },
  watch: { icon: 'eye', color: colors.watch, text: colors.watchText, bg: colors.watchBg, labelKey: 'status.watch' },
  followup: { icon: 'phone-call', color: colors.alert, text: colors.alertText, bg: colors.alertBg, labelKey: 'status.followup' },
};
