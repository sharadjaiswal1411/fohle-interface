import { rootCssString } from 'nft/css/cssStringFromTheme'
import React, { useMemo } from 'react'
import { Text, TextProps } from 'rebass'
import styled, { createGlobalStyle, css, ThemeProvider as StyledComponentsThemeProvider } from 'styled-components/macro'

import { useIsDarkMode } from '../state/user/hooks'
import { darkTheme, lightTheme } from './colors'
import { darkDeprecatedTheme, lightDeprecatedTheme } from './deprecatedColors'
import { Colors } from './styled'
// todo - remove and replace imports with a new path
export * from './components'
export * from './components/text'

export const MEDIA_WIDTHS = {
  deprecated_upToExtraSmall: 500,
  deprecated_upToSmall: 720,
  deprecated_upToMedium: 960,
  deprecated_upToLarge: 1280,
}

const deprecated_mediaWidthTemplates: {
  [width in keyof typeof MEDIA_WIDTHS]: typeof css
} = Object.keys(MEDIA_WIDTHS).reduce((acc, size) => {
  acc[size] = (a: any, b: any, c: any) => css`
    @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
      ${css(a, b, c)}
    }
  `
  return acc
}, {} as any)

export const BREAKPOINTS = {
  xs: 396,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
  xxxl: 1920,
}

// deprecated - please use the ones in styles.ts file
const transitions = {
  duration: {
    slow: '500ms',
    medium: '250ms',
    fast: '125ms',
  },
  timing: {
    ease: 'ease',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
  },
}

const opacities = {
  hover: 0.6,
  click: 0.4,
  disabled: 0.5,
  enabled: 1,
}

const fonts = {
  code: 'courier, courier new, serif',
}

function getSettings(darkMode: boolean) {
  return {
    grids: {
      sm: '8px',
      md: '12px',
      lg: '24px',
      xl: '32px',
    },
    fonts,

    // shadows
    shadow1: darkMode ? '#000' : '#2F80ED',

    // media queries
    deprecated_mediaWidth: deprecated_mediaWidthTemplates,

    navHeight: 72,
    mobileBottomBarHeight: 52,

    // deprecated - please use hardcoded exported values instead of
    // adding to the theme object
    breakpoint: BREAKPOINTS,
    transition: transitions,
    opacity: opacities,
  }
}

// eslint-disable-next-line import/no-unused-modules -- used in styled.d.ts
export function getTheme(darkMode: boolean) {
  return {
    darkMode,
    ...(darkMode ? darkTheme : lightTheme),
    ...(darkMode ? darkDeprecatedTheme : lightDeprecatedTheme),
    ...getSettings(darkMode),
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useIsDarkMode()
  const themeObject = useMemo(() => getTheme(darkMode), [darkMode])
  return <StyledComponentsThemeProvider theme={themeObject}>{children}</StyledComponentsThemeProvider>
}

export const ThemedGlobalStyle = createGlobalStyle`
  html {
    color: ${({ theme }) => theme.textPrimary};
    background-color: ${({ theme }) => theme.background} !important;
  }

  summary::-webkit-details-marker {
    display:none;
  }

  a {
    color: ${({ theme }) => theme.accentAction}; 
  }

  :root {
    ${({ theme }) => rootCssString(theme.darkMode)}
  }
`
const TextWrapper = styled(Text)<{ color: keyof Colors }>`
  color: ${({ color, theme }) => (theme as any)[color]};
`

export const TYPE = {
  main(props: TextProps) {
    return <TextWrapper fontWeight={500} color="text2" {...props} />
  },
  link(props: TextProps) {
    return <TextWrapper fontWeight={500} color="primary1" {...props} />
  },
  label(props: TextProps) {
    return <TextWrapper fontWeight={500} color="white" {...props} />
  },
  black(props: TextProps) {
    return <TextWrapper fontWeight={500} color="text1" {...props} />
  },
  white(props: TextProps) {
    return <TextWrapper fontWeight={500} color="white" {...props} />
  },
  body(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={16} color="text1" {...props} />
  },
  largeHeader(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={24} color="text1" {...props} />
  },
  mediumHeader(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={20} color="text3" {...props} />
  },
  subHeader(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={14} {...props} />
  },
  small(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={11} {...props} />
  },
  blue(props: TextProps) {
    return <TextWrapper fontWeight={500} color="blue1" {...props} />
  },
  yellow(props: TextProps) {
    return <TextWrapper fontWeight={500} color="yellow3" {...props} />
  },
  darkGray(props: TextProps) {
    return <TextWrapper fontWeight={500} color="text3" {...props} />
  },
  gray(props: TextProps) {
    return <TextWrapper fontWeight={500} color="bg3" {...props} />
  },
  italic(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={12} fontStyle="italic" color="text2" {...props} />
  },
  error({ error, ...props }: { error: boolean } & TextProps) {
    return <TextWrapper fontWeight={500} color={error ? 'red1' : 'text2'} {...props} />
  },
}
