import { DateTime, Interval } from 'luxon';
import { QuarterYearsData } from '../types';
import data from '../assets/quartersAndYears.json';

/**
 * JSON file containing start and end time for all academic quarters and years from
 * Fall Quarter 2020 to Spring Quarter 2029.
 *
 * The structure of the JSON file is found in the type.
 */
const quartersAndYears: QuarterYearsData = data;

/**
 * Gets the start and end time bounds for the quarter with the provided "quarter code".
 *
 * "Quarter code" is simply how quarters are shortened at UCSD. For instance,
 * "SP21" is Spring Quarter 2021.
 *
 * @param code The quarter code to find time bounds for.
 */
export function getQuarterBounds(code: string): [DateTime, DateTime] {
  const quarterInfo = quartersAndYears.quarters[code];
  if (!quarterInfo) {
    throw new Error('Invalid quarter code!');
  }
  return [
    DateTime.fromFormat(quarterInfo.start, 'EEEE, MMMM d, yyyy'),
    DateTime.fromFormat(quarterInfo.end, 'EEEE, MMMM d, yyyy'),
  ];
}

/**
 * Gets the start and end time bounds for the academic year with the provided
 * calendar years as bounds.
 *
 * The "code" here would be a sequence of years in the format "20xx-20xx".
 * Examples include "2021-2022", etc.
 *
 * Note that they must be consecutive years; there are no academic years
 * spanning 3 calendar years.
 *
 * @param code The year to find time bounds for.
 */
export function getYearBounds(code: string): [DateTime, DateTime] {
  const yearInfo = quartersAndYears.years[code];
  if (!yearInfo) {
    throw new Error('Invalid year code!');
  }
  return [
    DateTime.fromFormat(yearInfo.start, 'EEEE, MMMM d, yyyy'),
    DateTime.fromFormat(yearInfo.end, 'EEEE, MMMM d, yyyy'),
  ];
}

/**
 * Returns the quarter code for the academic quarter we are currently in.
 */
export function getCurrentQuarter(): string {
  const currentQuarter = Object.entries(quartersAndYears.quarters)
    .filter(([, quarterInfo]) => {
      const quarterStartTime = DateTime.fromFormat(quarterInfo.start, 'EEEE, MMMM d, yyyy');
      const quarterEndTime = DateTime.fromFormat(quarterInfo.end, 'EEEE, MMMM d, yyyy');
      return Interval.fromDateTimes(
        quarterStartTime,
        quarterEndTime,
      ).contains(DateTime.now());
    })
    .map(([code]) => (code))
    .slice(0, 1)
    .shift();
  return currentQuarter !== undefined ? currentQuarter : '';
}

/**
 * Returns the year code for the academic year we are currently in.
 */
export function getCurrentYear(): string {
  const currentYear = Object.entries(quartersAndYears.years)
    .filter(([, yearsInfo]) => {
      const yearStartTime = DateTime.fromFormat(yearsInfo.start, 'EEEE, MMMM d, yyyy');
      const yearEndTime = DateTime.fromFormat(yearsInfo.end, 'EEEE, MMMM d, yyyy');
      return Interval.fromDateTimes(
        yearStartTime,
        yearEndTime,
      ).contains(DateTime.now());
    })
    .map(([year]) => (year))
    .slice(0, 1)
    .shift();
  return currentYear !== undefined ? currentYear : '';
}
