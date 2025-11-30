/**
 * Type declarations for pino-roll
 */

declare module 'pino-roll' {
  import { DestinationStream } from 'pino';

  interface PinoRollOptions {
    file: string;
    frequency?: 'daily' | 'hourly' | number;
    size?: string;
    dateFormat?: string;
  }

  function pinoRoll(options: PinoRollOptions): DestinationStream;

  export = pinoRoll;
}
