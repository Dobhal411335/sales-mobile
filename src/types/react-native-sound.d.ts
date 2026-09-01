declare module 'react-native-sound' {
  export default class Sound {
    static MAIN_BUNDLE: string;
    static setCategory: (category: string) => void;

    constructor(
      filename: string,
      basePath: string,
      onError?: (error: Error | null) => void,
    );

    play: (onEnd?: (success: boolean) => void) => void;
    stop: (callback?: () => void) => void;
    release: () => void;
  }
}
