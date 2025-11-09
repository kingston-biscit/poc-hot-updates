export {};

declare global {
  interface Window {
    cordova?: any;
    resolveLocalFileSystemURL?: (
      url: string,
      successCallback: (entry: any) => void,
      errorCallback?: (error: any) => void
    ) => void;
  }
}
