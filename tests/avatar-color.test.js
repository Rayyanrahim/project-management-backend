import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import generateAvatarColor from '../src/utils/generateAvatarColor.js';

test('generates a dark avatar color from random HSL values', (t) => {
    const randomValues = [60, 85, 42];
    t.mock.method(crypto, 'randomInt', () => randomValues.shift());

    assert.equal(generateAvatarColor(), '#76760A');
    assert.equal(randomValues.length, 0);
});
