import {
  createLogger, transports as Transports, format,
} from 'winston';
import 'winston-daily-rotate-file';

const {
  combine, json, timestamp,
} = format;

/**
 * Logger for the bot with split transports.
 *
 * Logger saves colorized output to standard out and creates a daily rotated log file
 * of the same logs for safekeeping purposes.
 */
export default createLogger({
  format: json(),
  transports: [
    new Transports.Console({
      level: 'debug',
      format: combine(timestamp(), json()),
    }),
    new Transports.DailyRotateFile({
      level: 'info',
      format: combine(timestamp(), json()),
      filename: 'logs/BreadBot-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
