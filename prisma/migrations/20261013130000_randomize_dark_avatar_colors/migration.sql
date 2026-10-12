-- Replace colors from the previous light palette without touching custom colors.
CREATE OR REPLACE FUNCTION pg_temp.random_dark_avatar_color()
RETURNS VARCHAR(7)
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    hue DOUBLE PRECISION := FLOOR(RANDOM() * 360);
    saturation DOUBLE PRECISION := (60 + FLOOR(RANDOM() * 26)) / 100;
    lightness DOUBLE PRECISION := (32 + FLOOR(RANDOM() * 11)) / 100;
    chroma DOUBLE PRECISION;
    hue_segment DOUBLE PRECISION;
    secondary DOUBLE PRECISION;
    match_value DOUBLE PRECISION;
    red_base DOUBLE PRECISION;
    green_base DOUBLE PRECISION;
    blue_base DOUBLE PRECISION;
    red_value INTEGER;
    green_value INTEGER;
    blue_value INTEGER;
    red_linear DOUBLE PRECISION;
    green_linear DOUBLE PRECISION;
    blue_linear DOUBLE PRECISION;
    luminance DOUBLE PRECISION;
BEGIN
    LOOP
        chroma := (1 - ABS((2 * lightness) - 1)) * saturation;
        hue_segment := hue / 60;
        secondary := chroma * (
            1 - ABS((hue_segment - (FLOOR(hue_segment / 2) * 2)) - 1)
        );

        IF hue_segment < 1 THEN
            red_base := chroma;
            green_base := secondary;
            blue_base := 0;
        ELSIF hue_segment < 2 THEN
            red_base := secondary;
            green_base := chroma;
            blue_base := 0;
        ELSIF hue_segment < 3 THEN
            red_base := 0;
            green_base := chroma;
            blue_base := secondary;
        ELSIF hue_segment < 4 THEN
            red_base := 0;
            green_base := secondary;
            blue_base := chroma;
        ELSIF hue_segment < 5 THEN
            red_base := secondary;
            green_base := 0;
            blue_base := chroma;
        ELSE
            red_base := chroma;
            green_base := 0;
            blue_base := secondary;
        END IF;

        match_value := lightness - (chroma / 2);
        red_value := ROUND((red_base + match_value) * 255)::INTEGER;
        green_value := ROUND((green_base + match_value) * 255)::INTEGER;
        blue_value := ROUND((blue_base + match_value) * 255)::INTEGER;

        red_linear := CASE
            WHEN red_value / 255.0 <= 0.04045 THEN (red_value / 255.0) / 12.92
            ELSE POWER(((red_value / 255.0) + 0.055) / 1.055, 2.4)
        END;
        green_linear := CASE
            WHEN green_value / 255.0 <= 0.04045 THEN (green_value / 255.0) / 12.92
            ELSE POWER(((green_value / 255.0) + 0.055) / 1.055, 2.4)
        END;
        blue_linear := CASE
            WHEN blue_value / 255.0 <= 0.04045 THEN (blue_value / 255.0) / 12.92
            ELSE POWER(((blue_value / 255.0) + 0.055) / 1.055, 2.4)
        END;

        luminance := (0.2126 * red_linear) + (0.7152 * green_linear) + (0.0722 * blue_linear);

        EXIT WHEN (1.05 / (luminance + 0.05)) >= 4.5 OR lightness <= 0.20;
        lightness := lightness - 0.01;
    END LOOP;

    RETURN '#' || UPPER(
        LPAD(TO_HEX(red_value), 2, '0') ||
        LPAD(TO_HEX(green_value), 2, '0') ||
        LPAD(TO_HEX(blue_value), 2, '0')
    );
END;
$$;

UPDATE "users"
SET "color" = pg_temp.random_dark_avatar_color()
WHERE "color" IN (
    '#FDE68A', '#BFDBFE', '#C7D2FE', '#DDD6FE', '#FBCFE8',
    '#FECACA', '#FED7AA', '#BBF7D0', '#99F6E4', '#A5F3FC'
);

UPDATE "companies"
SET "color" = pg_temp.random_dark_avatar_color()
WHERE "color" IN (
    '#FDE68A', '#BFDBFE', '#C7D2FE', '#DDD6FE', '#FBCFE8',
    '#FECACA', '#FED7AA', '#BBF7D0', '#99F6E4', '#A5F3FC'
);

DROP FUNCTION pg_temp.random_dark_avatar_color();
