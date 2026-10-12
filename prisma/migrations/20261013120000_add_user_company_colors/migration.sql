-- AlterTable
ALTER TABLE "users" ADD COLUMN "color" VARCHAR(7);
ALTER TABLE "companies" ADD COLUMN "color" VARCHAR(7);

-- Give existing users without avatars random light fallback colors.
UPDATE "users"
SET "color" = (ARRAY[
    '#FDE68A',
    '#BFDBFE',
    '#C7D2FE',
    '#DDD6FE',
    '#FBCFE8',
    '#FECACA',
    '#FED7AA',
    '#BBF7D0',
    '#99F6E4',
    '#A5F3FC'
]::VARCHAR[])[FLOOR(RANDOM() * 10)::INTEGER + 1]
WHERE "avatar_url" IS NULL;

-- Give existing companies without logos their own random light fallback colors.
UPDATE "companies"
SET "color" = (ARRAY[
    '#FDE68A',
    '#BFDBFE',
    '#C7D2FE',
    '#DDD6FE',
    '#FBCFE8',
    '#FECACA',
    '#FED7AA',
    '#BBF7D0',
    '#99F6E4',
    '#A5F3FC'
]::VARCHAR[])[FLOOR(RANDOM() * 10)::INTEGER + 1]
WHERE "logo_url" IS NULL;
