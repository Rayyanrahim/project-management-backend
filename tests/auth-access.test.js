import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import * as middleware from '../src/middleware/auth.middleware.js';
import authService from '../src/services/auth.service.js';
import userService from '../src/services/user.service.js';
import authController from '../src/controller/auth.controller.js';
import prisma from '../src/config/prisma.js';
import config from '../src/config/config.js';
import app from '../src/app.js';
import { validationResult } from 'express-validator';
import { verifyOtpValidator } from '../src/validators/auth.validator.js';
import { OTP_LENGTH } from '../src/constant/constant.js';

// Prisma delegates are proxies, so replace their methods directly.
function mockDeletion(t, implementation) {
    const original = prisma.authSession.deleteMany;
    const replacement = t.mock.fn(implementation);
    prisma.authSession.deleteMany = replacement;
    t.after(() => { prisma.authSession.deleteMany = original; });
    return replacement;
}

function mockTransaction(t, implementation) {
    const original = prisma.$transaction;
    prisma.$transaction = implementation;
    t.after(() => { prisma.$transaction = original; });
}

function mockUserLookup(t, implementation) {
    const original = prisma.user.findUnique;
    const replacement = t.mock.fn(implementation);
    prisma.user.findUnique = replacement;
    t.after(() => { prisma.user.findUnique = original; });
    return replacement;
}

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test('verification middleware allows verified users and rejects unverified or missing users', () => {
    assert.equal(typeof middleware.requireVerified, 'function');
    for (const [user, status] of [[{ emailVerifiedAt: new Date() }, undefined], [{ emailVerifiedAt: null }, 403], [undefined, 401]]) {
        let called = false;
        middleware.requireVerified({ user }, {}, (error) => {
            called = true;
            assert.equal(error?.statusCode, status);
            if (status === 403) assert.equal(error.messageCode, 'EMAIL_NOT_VERIFIED');
        });
        assert.ok(called);
    }
});

test('verify OTP validator accepts otp without verificationId', async () => {
    const req = { body: { otp: '1'.repeat(OTP_LENGTH) } };
    for (const validator of verifyOtpValidator) await validator.run(req);
    assert.deepEqual(validationResult(req).array(), []);
});

test('verifyOtp finds the verification using the authenticated user id', async (t) => {
    let findUniqueWhere;
    mockTransaction(t, async (callback) => callback({
        verification: {
            findUnique: async ({ where }) => {
                findUniqueWhere = where;
                return null;
            },
        },
    }));

    await assert.rejects(
        () => authService.verifyOtp({ userId: 12n, otp: '1'.repeat(OTP_LENGTH) }),
        error => error.messageCode === 'INVALID_OTP'
    );
    assert.deepEqual(findUniqueWhere, { userId: 12n });
});

test('logout deletes only the current session belonging to the protected user', async (t) => {
    const revoke = mockDeletion(t, async () => ({ count: 1 }));
    t.mock.method(userService, 'getValidAuthSession', async () => ({ id: 'session-one' }));
    const token = jwt.sign({ id: '12', sessionId: 'session-one' }, config.JWT_REFRESH_SECRET);
    await authService.logout(token, 12n);
    assert.equal(revoke.mock.callCount(), 1);
    const args = revoke.mock.calls[0].arguments[0];
    assert.deepEqual(args.where, { id: 'session-one', userId: 12n });
});

test('logout propagates session validation errors without deleting sessions', async (t) => {
    const revoke = mockDeletion(t, async () => ({ count: 0 }));
    t.mock.method(userService, 'getValidAuthSession', async () => { throw new Error('Invalid session'); });
    await assert.rejects(() => authService.logout('invalid', 12n), /Invalid session/);
    assert.equal(revoke.mock.callCount(), 0);
});

test('logout reports database failures', async (t) => {
    mockDeletion(t, async () => { throw new Error('Database unavailable'); });
    t.mock.method(userService, 'getValidAuthSession', async () => ({ id: 'session-one' }));
    const token = jwt.sign({ id: '12', sessionId: 'session-one' }, config.JWT_REFRESH_SECRET);
    await assert.rejects(() => authService.logout(token, 12n), /Database unavailable/);
});

test('auth cookies use the actual auth route prefix', async (t) => {
    t.mock.method(userService, 'createAuthSession', async () => ({ id: 'session-one' }));
    const cookies = [];
    await authService.setAuthCookies({ cookie: (...args) => cookies.push(args) }, { id: 12n, email: 'test@example.com' });
    assert.equal(cookies.find(([name]) => name === 'refreshToken')[2].path, '/api/v1/auth');
});

test('POST logout requires protect and clears cookies after deleting the session', async (t) => {
    t.mock.method(userService, 'getMe', async () => ({ id: 12n, isActive: true }));
    t.mock.method(userService, 'getValidAuthSession', async () => ({ id: 'session-one' }));
    const deletion = mockDeletion(t, async () => ({ count: 1 }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/v1/auth/logout`;
    const unauthorized = await fetch(url, { method: 'POST' });
    assert.equal(unauthorized.status, 401);
    assert.equal(deletion.mock.callCount(), 0);
    const accessToken = jwt.sign({ id: '12' }, config.JWT_SECRET);
    const response = await fetch(url, { method: 'POST', headers: { Cookie: `accessToken=${accessToken}; refreshToken=session-token` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).messageCode, 'LOGOUT_SUCCESSFULLY');
    assert.equal(deletion.mock.callCount(), 1);
    const cookies = response.headers.getSetCookie();
    assert.ok(cookies.some(value => value.startsWith('accessToken=;') && value.includes('Path=/;')));
    assert.ok(cookies.some(value => value.startsWith('refreshToken=;') && value.includes('Path=/api/v1/auth;')));
});

test('getMe returns workspace details without exposing the password', async (t) => {
    const workspaceMemberships = [{
        id: 7n,
        workspace: { id: 3n, name: 'Example workspace' },
    }];
    const lookup = mockUserLookup(t, async () => ({
        id: 12n,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: true,
        workspaceMemberships,
    }));

    const user = await userService.getMe(12n);

    assert.equal(Object.hasOwn(user, 'password'), false);
    assert.deepEqual(user.workspaceMemberships, workspaceMemberships);
    assert.deepEqual(lookup.mock.calls[0].arguments[0].include, {
        workspaceMemberships: {
            include: { workspace: true },
        },
    });
});

test('GET me requires login and returns the current user', async (t) => {
    const currentUser = {
        id: 12n,
        name: 'Test User',
        email: 'test@example.com',
        emailVerifiedAt: null,
        avatarUrl: null,
        timezone: 'UTC',
        isActive: true,
        workspaceMemberships: [],
    };
    t.mock.method(userService, 'getMe', async () => currentUser);

    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/v1/auth/me`;

    const unauthorized = await fetch(url);
    assert.equal(unauthorized.status, 401);

    const accessToken = jwt.sign({ id: '12' }, config.JWT_SECRET);
    const response = await fetch(url, {
        headers: { Cookie: `accessToken=${accessToken}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.messageCode, 'CURRENT_USER_RETRIEVED');
    assert.deepEqual(body.data, {
        ...currentUser,
        id: '12',
    });
    assert.equal(Object.hasOwn(body.data, 'password'), false);
});

test('current user handler is not owned by the auth controller', () => {
    assert.equal(authController.me, undefined);
});

test('login generates an OTP only when the user email is unverified', async (t) => {
    const verifiedUser = {
        id: 12n,
        email: 'verified@example.com',
        emailVerifiedAt: new Date(),
    };
    const unverifiedUser = {
        id: 13n,
        email: 'unverified@example.com',
        emailVerifiedAt: null,
    };
    const users = [verifiedUser, unverifiedUser];
    t.mock.method(userService, 'loginUser', async () => users.shift());
    const generateOtp = t.mock.method(authService, 'generateOtp', async (user) => ({
        id: 21n,
        userId: user.id,
        status: 'PENDING',
    }));
    const setAuthCookies = t.mock.method(authService, 'setAuthCookies', async () => {});

    const verifiedResponse = createResponse();
    await authController.login({ body: { email: verifiedUser.email, password: 'password' } }, verifiedResponse);

    const unverifiedResponse = createResponse();
    await authController.login({ body: { email: unverifiedUser.email, password: 'password' } }, unverifiedResponse);

    assert.equal(generateOtp.mock.callCount(), 1);
    assert.equal(generateOtp.mock.calls[0].arguments[0], unverifiedUser);
    assert.equal(verifiedResponse.body.data.verification, null);
    assert.equal(unverifiedResponse.body.data.verification.status, 'PENDING');
    assert.equal(setAuthCookies.mock.callCount(), 2);
});
