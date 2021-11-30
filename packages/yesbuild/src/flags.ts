
// flags are only used internally, do NOT expose it

export enum Stage {
  Configure = 1,
  Build = 2,
}

export const FLAGS_CONFIGURE    = 0x1;
export const FLAGS_BUILD        = 0x2;
export const FLAGS_STAGE_MASK   = 0xF;
export const FLAGS_FORCE_UPDATE = 0x10;
export const FLAGS_IGNORE_META  = 0x20;
