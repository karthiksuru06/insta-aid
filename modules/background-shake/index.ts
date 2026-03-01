// Reexport the native module. On web, it will be resolved to BackgroundShakeModule.web.ts
// and on native platforms to BackgroundShakeModule.ts
export { default } from './src/BackgroundShakeModule';
export { default as BackgroundShakeView } from './src/BackgroundShakeView';
export * from  './src/BackgroundShake.types';
