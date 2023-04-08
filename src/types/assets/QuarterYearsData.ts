export interface QuarterYearsData {
  quarters: {
    [quarter: string]: {
      name: string;
      start: string;
      end: string;
    };
  };
  years: {
    [year: string]: {
      start: string;
      end: string;
    };
  };
}
