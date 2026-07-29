import { z } from "zod";

export const postgresTimestampSchema = z.iso.datetime({ offset: true });
