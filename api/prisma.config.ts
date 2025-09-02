import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config(); // load .env automatically

export default defineConfig({
  schema: './prisma/schema.prisma',
});
