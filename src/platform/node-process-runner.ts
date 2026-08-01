import { spawn } from "node:child_process";

import type { ProcessRequest, ProcessResult, ProcessRunner } from "./process-runner.ts";

const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

export const nodeProcessRunner: ProcessRunner = {
  run: (request: ProcessRequest): Promise<ProcessResult> =>
    new Promise((resolve, reject) => {
      const child = spawn(request.executable, request.arguments, {
        cwd: request.workingDirectory,
        env: request.environment === undefined ? process.env : { ...process.env, ...request.environment },
        shell: false,
        stdio: "pipe",
      });
      const standardOutput: Uint8Array[] = [];
      const standardError: Uint8Array[] = [];
      const maximum = request.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
      let outputBytes = 0;
      let settled = false;
      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        reject(error);
      };
      const collect = (target: Uint8Array[], chunk: Buffer): void => {
        outputBytes += chunk.length;
        if (outputBytes > maximum) {
          fail(new Error("Process output exceeded the configured byte limit."));
          return;
        }
        target.push(new Uint8Array(chunk));
      };
      child.stdout.on("data", (chunk: Buffer) => collect(standardOutput, chunk));
      child.stderr.on("data", (chunk: Buffer) => collect(standardError, chunk));
      child.on("error", (error) => fail(error));
      const timeout =
        request.timeoutMilliseconds === undefined
          ? undefined
          : setTimeout(() => fail(new Error("Process exceeded the configured timeout.")), request.timeoutMilliseconds);
      child.on("close", (exitCode, signal) => {
        if (timeout !== undefined) clearTimeout(timeout);
        if (settled) return;
        settled = true;
        resolve({
          exitCode,
          signal,
          standardOutput: Buffer.concat(standardOutput),
          standardError: Buffer.concat(standardError),
        });
      });
      if (request.standardInput === undefined) child.stdin.end();
      else child.stdin.end(request.standardInput);
    }),
};
