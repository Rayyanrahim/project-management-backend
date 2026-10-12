import crypto from 'node:crypto';

const MINIMUM_WHITE_TEXT_CONTRAST = 4.5;
const MINIMUM_LIGHTNESS = 20;

function hslToRgb(hue, saturation, lightness) {
    const normalizedSaturation = saturation / 100;
    const normalizedLightness = lightness / 100;
    const chroma = (1 - Math.abs((2 * normalizedLightness) - 1)) * normalizedSaturation;
    const hueSegment = hue / 60;
    const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
    let channels;

    if (hueSegment < 1) channels = [chroma, secondary, 0];
    else if (hueSegment < 2) channels = [secondary, chroma, 0];
    else if (hueSegment < 3) channels = [0, chroma, secondary];
    else if (hueSegment < 4) channels = [0, secondary, chroma];
    else if (hueSegment < 5) channels = [secondary, 0, chroma];
    else channels = [chroma, 0, secondary];

    const match = normalizedLightness - (chroma / 2);
    return channels.map(channel => Math.round((channel + match) * 255));
}

function getWhiteTextContrast(rgb) {
    const luminance = rgb
        .map(channel => channel / 255)
        .map(channel => channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce(
            (result, channel, index) => result + (channel * [0.2126, 0.7152, 0.0722][index]),
            0,
        );

    return 1.05 / (luminance + 0.05);
}

function rgbToHex(rgb) {
    return `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function hexToHue(color) {
    if (!/^#[0-9A-F]{6}$/i.test(color ?? '')) return null;

    const [red, green, blue] = color
        .slice(1)
        .match(/.{2}/g)
        .map(channel => Number.parseInt(channel, 16) / 255);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const difference = maximum - minimum;

    if (difference === 0) return null;

    let hue;
    if (maximum === red) hue = 60 * (((green - blue) / difference) % 6);
    else if (maximum === green) hue = 60 * (((blue - red) / difference) + 2);
    else hue = 60 * (((red - green) / difference) + 4);

    return hue < 0 ? hue + 360 : hue;
}

const generateAvatarColor = (referenceColor = null) => {
    const referenceHue = hexToHue(referenceColor);
    const hue = referenceHue === null
        ? crypto.randomInt(0, 360)
        : (referenceHue + crypto.randomInt(120, 241)) % 360;
    const saturation = crypto.randomInt(60, 86);
    let lightness = crypto.randomInt(32, 43);
    let rgb = hslToRgb(hue, saturation, lightness);

    while (getWhiteTextContrast(rgb) < MINIMUM_WHITE_TEXT_CONTRAST && lightness > MINIMUM_LIGHTNESS) {
        lightness -= 1;
        rgb = hslToRgb(hue, saturation, lightness);
    }

    return rgbToHex(rgb);
};

export default generateAvatarColor;
