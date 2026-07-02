declare const google: {
  script: {
    host: {
      close: () => void;
    };
    run: {
      withSuccessHandler: (handler: (value: unknown) => void) => typeof google.script.run;
      withFailureHandler: (handler: (error: unknown) => void) => typeof google.script.run;
      getBootstrapState: () => void;
      runWorkspaceAgent: (prompt: string) => void;
    };
  };
};
