import { format } from 'fast-csv';
import { Response } from 'express';

export const streamCsvToResponse = (data: any[], res: Response, filename: string) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const csvStream = format({ headers: true });
  csvStream.pipe(res);

  data.forEach((row) => csvStream.write(row));
  csvStream.end();
};
