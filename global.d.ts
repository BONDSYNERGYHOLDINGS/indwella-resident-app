declare global {
  var global: GlobalThis & {
    __turboModuleProxy?: unknown;
  };

  var __turboModuleProxy: unknown | undefined;
}

export {};
