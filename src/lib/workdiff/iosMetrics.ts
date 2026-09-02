/**
 * iOS Human Interface Guidelines–aligned layout tokens for WorkDiff mobile surfaces.
 * @see https://developer.apple.com/design/human-interface-guidelines
 */

/** Minimum tappable control (44×44 pt). */
export const IOS_TOUCH_MIN = 44;

/** Comfortable primary action target. */
export const IOS_TOUCH_COMFORT = 48;

/** Standard list row height for file / navigation rows. */
export const IOS_LIST_ROW = 52;

/** Dense secondary row (stats, metadata). */
export const IOS_LIST_ROW_DENSE = 44;

/** Bottom sheet top corner radius (iOS sheet ~20pt). */
export const IOS_SHEET_RADIUS = 20;

/** Grabber pill dimensions. */
export const IOS_GRABBER = { width: 36, height: 5 } as const;

/** Typography scale (SF Pro–like). */
export const IOS_TYPE = {
  largeTitle: 'text-[28px] leading-[34px] font-semibold tracking-tight',
  title2: 'text-[22px] leading-[28px] font-semibold tracking-tight',
  headline: 'text-[17px] leading-[22px] font-semibold',
  body: 'text-[17px] leading-[22px] font-normal',
  callout: 'text-[16px] leading-[21px] font-normal',
  subhead: 'text-[15px] leading-[20px] font-normal',
  footnote: 'text-[13px] leading-[18px] font-normal',
  caption1: 'text-[12px] leading-[16px] font-normal',
  caption2: 'text-[11px] leading-[13px] font-normal',
  monoFile: 'text-[15px] leading-[20px] font-mono',
} as const;

/** Tailwind class bundles for consistent touch zones. */
export const IOS_CLASSES = {
  touchMin: 'min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.97]',
  touchRow: 'min-h-[52px] touch-manipulation active:bg-white/[0.06]',
  safeBottom: 'pb-[max(1rem,env(safe-area-inset-bottom))]',
  safeTop: 'pt-[max(0.75rem,env(safe-area-inset-top))]',
  sheet: `rounded-t-[${IOS_SHEET_RADIUS}px]`,
} as const;
