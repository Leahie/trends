// Maybe define types better later 
export function useColorScheme(scheme:any) {
  return {
    "--color-black": scheme.black,
    "--color-dark": scheme.dark,
    "--color-highlight": scheme.highlight,
    "--color-accent": scheme.accent,
    "--color-light-accent": scheme["light-accent"],
    "--color-white": scheme.white,
    "--color-light-hover": scheme["light-hover"],
  };
}
