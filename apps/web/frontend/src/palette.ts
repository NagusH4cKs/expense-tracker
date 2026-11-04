// Change ACTIVE_PRIMARY to another key to switch the app's primary color.
export const PRIMARY_COLORS = {
  forestGreen: '#166534',
  emeraldGreen: '#16A34A',
  deepPurple: '#7C3AED',
  indigo: '#635BFF',
  deepTeal: '#0F5C63',
  slate: '#334155',
  darkyellow: '#b5930b',
} as const;
  
export const ACTIVE_PRIMARY = PRIMARY_COLORS.deepPurple;
