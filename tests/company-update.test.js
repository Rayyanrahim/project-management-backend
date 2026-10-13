import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'company-update-test-secret';
process.env.APP_ENV = 'testing';

const timestamp = new Date('2026-10-14T00:00:00Z');
let company;
let memberships;

const accounts = [
    { id: 1n, name: 'Owner', email: 'owner@example.com' },
    { id: 2n, name: 'Admin', email: 'admin@example.com' },
    { id: 3n, name: 'Member', email: 'member@example.com' },
].map((account) => ({
    ...account,
    password: 'private-password-hash',
    emailVerifiedAt: timestamp,
    profilePicture: null,
    color: '#123456',
    timezone: 'UTC',
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
}));

function matchesMembership(member, filter = {}) {
    return (filter.userId === undefined || member.userId === filter.userId)
        && (filter.status === undefined || member.status === filter.status)
        && (filter.role?.name === undefined || member.role.name === filter.role.name);
}

// Substitute only database I/O; exercise the real auth, validation, route,
// update service, response builder, and JSON serialization.
mock.module('#config/prisma.js', {
    exports: { default: {
        user: {
            async findUnique({ where }) {
                const account = accounts.find(({ id }) => id === where.id);
                if (!account) return null;
                return {
                    ...account,
                    companyMemberships: memberships
                        .filter(({ userId }) => userId === account.id)
                        .map((member) => ({ ...member, company: { ...company } })),
                };
            },
        },
        company: {
            async update({ where, data }) {
                if (where.id !== company.id
                    || (where.ownerId !== undefined && where.ownerId !== company.ownerId)
                    || (where.members?.some && !memberships.some(
                        (member) => member.companyId === company.id
                            && matchesMembership(member, where.members.some)
                    ))) {
                    throw Object.assign(new Error('No matching company'), { code: 'P2025' });
                }
                Object.assign(company, data);
                return { ...company };
            },
            async findMany({ where }) {
                if (!memberships.some((member) => member.companyId === company.id
                    && matchesMembership(member, where.members.some))) {
                    return [];
                }
                return [{
                    ...company,
                    members: memberships.filter(({ companyId }) => companyId === company.id).map((member) => {
                        const { password, ...user } = accounts.find(({ id }) => id === member.userId);
                        return { ...member, user };
                    }),
                }];
            },
        },
    } },
});

// These endpoints are outside the company-edit test and import mail/queue jobs.
mock.module('#routes/auth.route.js', { exports: { default: express.Router() } });
mock.module('#routes/workspace.route.js', { exports: { default: express.Router() } });

const { default: app } = await import('../src/app.js');
let server;
let baseUrl;

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    mock.restoreAll();
});

beforeEach(() => {
    company = {
        id: 10n,
        name: 'Original Company',
        slug: 'original-company',
        ownerId: 1n,
        logo: '/images/original.png',
        color: '#123456',
        plan: 'free',
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    memberships = ['OWNER', 'ADMIN', 'MEMBER'].map((name, index) => ({
        id: BigInt(index + 1),
        companyId: 10n,
        userId: BigInt(index + 1),
        roleId: BigInt(index + 1),
        status: 'ACTIVE',
        invitedBy: null,
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        role: { id: BigInt(index + 1), name },
    }));
});

async function patch(body, { userId = '1', companyId = '10', authenticated = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authenticated) {
        headers.Cookie = `accessToken=${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`;
    }
    const response = await fetch(`${baseUrl}/api/v1/company/${companyId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
}

test('owner can update all three fields and receives the refreshed user response', async () => {
    const response = await patch({ name: 'Updated Company', color: '#ABCDEF', logo: '/images/new.png' });
    assert.equal(response.status, 200);
    assert.equal(response.body.messageCode, 'COMPANY_UPDATED');
    assert.equal(response.body.data.name, 'Owner');
    const updated = response.body.data.companies[0];
    assert.equal(updated.name, 'Updated Company');
    assert.equal(updated.color, '#ABCDEF');
    assert.equal(updated.logo, '/images/new.png');
    assert.equal(updated.company_user[0].role.name, 'OWNER');
    assert.equal(updated.company_user[0].user.id, '1');
    assert.equal(response.body.data.password, undefined);
    assert.equal(updated.company_user[0].user.password, undefined);
});

test('name-only update preserves omitted fields and ignores protected company fields', async () => {
    const response = await patch({ name: '  Renamed Company  ', ownerId: '2', plan: 'paid', slug: 'hijacked' });
    assert.equal(response.status, 200);
    const updated = response.body.data.companies[0];
    assert.equal(updated.name, 'Renamed Company');
    assert.equal(updated.color, '#123456');
    assert.equal(updated.logo, '/images/original.png');
    assert.equal(updated.ownerId, '1');
    assert.equal(updated.plan, 'free');
    assert.equal(updated.slug, 'original-company');
});

test('logo can be cleared independently using null', async () => {
    const response = await patch({ logo: null });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.companies[0].logo, null);
    assert.equal(response.body.data.companies[0].name, 'Original Company');
});

test('color can be updated independently', async () => {
    const response = await patch({ color: '#AABBCC' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.companies[0].color, '#AABBCC');
    assert.equal(response.body.data.companies[0].logo, '/images/original.png');
});

for (const userId of ['2', '3']) {
    test(`non-owner user ${userId} cannot edit the company`, async () => {
        const response = await patch({ name: 'Unauthorized' }, { userId });
        assert.equal(response.status, 403);
        assert.equal(response.body.messageCode, 'COMPANY_UPDATE_FORBIDDEN');
        assert.equal(company.name, 'Original Company');
    });
}

test('an inactive owner membership cannot edit the company', async () => {
    memberships[0].status = 'INACTIVE';
    const response = await patch({ name: 'Unauthorized' });
    assert.equal(response.status, 403);
    assert.equal(response.body.messageCode, 'ACTIVE_COMPANY_REQUIRED');
    assert.equal(company.name, 'Original Company');
});

test('active membership in another company does not authorize the requested company', async () => {
    memberships[0].status = 'INACTIVE';
    memberships.unshift({ ...memberships[0], id: 4n, companyId: 11n, status: 'ACTIVE' });
    const response = await patch({ name: 'Unauthorized' });
    assert.equal(response.status, 403);
    assert.equal(response.body.messageCode, 'ACTIVE_COMPANY_REQUIRED');
    assert.equal(company.name, 'Original Company');
});

test('missing company membership returns the active-company error', async () => {
    memberships = memberships.filter(({ userId }) => userId !== 1n);
    const response = await patch({ name: 'Unauthorized' });
    assert.equal(response.status, 403);
    assert.equal(response.body.messageCode, 'ACTIVE_COMPANY_REQUIRED');
    assert.equal(company.name, 'Original Company');
});

test('an unrelated inactive membership does not block the requested active company', async () => {
    memberships.unshift({ ...memberships[0], id: 4n, companyId: 11n, status: 'INACTIVE' });
    const response = await patch({ name: 'Allowed' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.companies[0].name, 'Allowed');
});

test('matching company ownership does not allow an ADMIN membership to edit', async () => {
    memberships[0].role.name = 'ADMIN';
    const response = await patch({ name: 'Unauthorized' });
    assert.equal(response.status, 403);
    assert.equal(company.name, 'Original Company');
});

test('an OWNER membership cannot edit when the company belongs to another user', async () => {
    company.ownerId = 2n;
    const response = await patch({ name: 'Unauthorized' });
    assert.equal(response.status, 403);
    assert.equal(company.name, 'Original Company');
});

test('an owner cannot edit a different company', async () => {
    const response = await patch({ name: 'Unauthorized' }, { companyId: '11' });
    assert.equal(response.status, 403);
    assert.equal(company.name, 'Original Company');
});

test('editing requires authentication', async () => {
    const response = await patch({ name: 'Unauthorized' }, { authenticated: false });
    assert.equal(response.status, 401);
    assert.equal(company.name, 'Original Company');
});

for (const body of [{}, { plan: 'paid' }, { name: '' }, { name: null }, { name: 123 },
    { name: 'x'.repeat(256) }, { color: 'red' }, { color: null }, { logo: {} },
    { logo: '' }, { logo: 'x'.repeat(501) }]) {
    test(`invalid update is rejected without writing: ${JSON.stringify(body).slice(0, 60)}`, async () => {
        const response = await patch(body);
        assert.equal(response.status, 422);
        assert.equal(response.body.messageCode, 'VALIDATION_ERROR');
        assert.equal(company.name, 'Original Company');
        assert.equal(company.logo, '/images/original.png');
        assert.equal(company.color, '#123456');
    });
}

for (const companyId of ['invalid', '0', '-1', '1.5', '9223372036854775808']) {
    test(`invalid company ID is rejected: ${companyId}`, async () => {
        const response = await patch({ name: 'New Company' }, { companyId });
        assert.equal(response.status, 422);
        assert.equal(company.name, 'Original Company');
    });
}
