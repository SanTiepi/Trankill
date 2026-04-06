import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createCircle,
  getCircle,
  addMember,
  sendAlert,
  listAlerts,
  markAlertRead,
  getCircleStats,
  _clearAll,
} from '../src/services/circle_service.mjs';

test('Circle Service — TRK-003', async (suite) => {
  // Setup before each test
  suite.before(() => {
    _clearAll();
  });

  test('createCircle — creates a circle with owner', () => {
    const result = createCircle('Maman');
    assert(result.circleId, 'circleId should exist');
    assert(result.inviteCode, 'inviteCode should exist');
    assert.equal(result.inviteCode.length, 6, 'invite code should be 6 chars');
    assert.equal(result.owner, 'Maman', 'owner should match');
    assert(result.createdAt, 'createdAt should exist');
  });

  test('createCircle — trims whitespace', () => {
    const result = createCircle('  Papa  ');
    assert.equal(result.owner, 'Papa', 'should trim whitespace');
  });

  test('createCircle — rejects empty owner name', () => {
    assert.throws(
      () => createCircle(''),
      /Owner name required/,
      'should reject empty name'
    );
  });

  test('createCircle — rejects non-string owner', () => {
    assert.throws(
      () => createCircle(null),
      /Owner name required/,
      'should reject non-string'
    );
  });

  test('getCircle — retrieves circle with members', () => {
    const circle = createCircle('Maman');
    const result = getCircle(circle.circleId);
    assert.equal(result.owner, 'Maman');
    assert(result.members, 'should have members array');
    assert.equal(result.members.length, 1, 'should start with 1 member (owner)');
    assert.equal(result.members[0].role, 'owner', 'first member should be owner');
  });

  test('getCircle — throws on non-existent circle', () => {
    assert.throws(
      () => getCircle('nonexistent'),
      /Circle not found/
    );
  });

  test('addMember — adds member with valid invite code', () => {
    const circle = createCircle('Maman');
    const result = addMember(circle.circleId, circle.inviteCode, 'Fils');
    assert(result.memberId, 'memberId should exist');
    assert.equal(result.name, 'Fils', 'name should match');
    assert(result.joinedAt, 'joinedAt should exist');
  });

  test('addMember — verifies circle now has 2 members', () => {
    const circle = createCircle('Maman');
    addMember(circle.circleId, circle.inviteCode, 'Fils');
    const updated = getCircle(circle.circleId);
    assert.equal(updated.members.length, 2, 'should have 2 members');
    assert.equal(updated.memberCount, 2, 'memberCount should be 2');
  });

  test('addMember — rejects invalid invite code', () => {
    const circle = createCircle('Maman');
    assert.throws(
      () => addMember(circle.circleId, 'BADCODE', 'Fils'),
      /Invalid invite code/
    );
  });

  test('addMember — rejects duplicate member', () => {
    const circle = createCircle('Maman');
    addMember(circle.circleId, circle.inviteCode, 'Fils');
    assert.throws(
      () => addMember(circle.circleId, circle.inviteCode, 'Fils'),
      /Member already in this circle/
    );
  });

  test('addMember — rejects non-existent circle', () => {
    assert.throws(
      () => addMember('nonexistent', 'CODE', 'Fils'),
      /Circle not found/
    );
  });

  test('addMember — enforces 10-member max', () => {
    const circle = createCircle('Maman');
    const code = circle.inviteCode;
    // Add 9 more members (owner is 1st)
    for (let i = 0; i < 9; i++) {
      addMember(circle.circleId, code, `Member${i}`);
    }
    // Should have 10 total now
    const updated = getCircle(circle.circleId);
    assert.equal(updated.members.length, 10, 'should have 10 members');
    
    // Try to add 11th
    assert.throws(
      () => addMember(circle.circleId, code, 'Member10'),
      /Circle is full/
    );
  });

  test('sendAlert — creates alert for scanned dangerous link', () => {
    const circle = createCircle('Maman');
    const memberId = circle.circleId; // Use a mock ID for testing
    const members = getCircle(circle.circleId).members;
    
    const result = sendAlert(circle.circleId, {
      memberId: members[0].memberId,
      verdict: 'danger',
      message: 'Faux site Poste suisse',
      scannedUrl: 'https://poste-ch.fake.com',
      type: 'phishing',
    });
    
    assert(result.alertId, 'alertId should exist');
    assert(result.timestamp, 'timestamp should exist');
    assert.equal(result.verdict, 'danger', 'verdict should match');
    assert.equal(result.deliveredCount, 0, 'deliveredCount should be 0 (no other members)');
  });

  test('sendAlert — notifies other family members', () => {
    const circle = createCircle('Maman');
    const code = circle.inviteCode;
    const son = addMember(circle.circleId, code, 'Fils');
    const daughter = addMember(circle.circleId, code, 'Fille');
    
    const members = getCircle(circle.circleId).members;
    const mamanId = members.find(m => m.name === 'Maman').memberId;
    
    const result = sendAlert(circle.circleId, {
      memberId: mamanId,
      verdict: 'danger',
      message: 'Faux SMS Swisscom',
      scannedUrl: 'https://swisscom-fake.com',
      type: 'smishing',
    });
    
    assert.equal(result.deliveredCount, 2, 'should notify 2 other members');
  });

  test('sendAlert — rejects invalid circle', () => {
    assert.throws(
      () => sendAlert('nonexistent', {
        memberId: 'xxx',
        verdict: 'danger',
      }),
      /Circle not found/
    );
  });

  test('sendAlert — rejects invalid member', () => {
    const circle = createCircle('Maman');
    assert.throws(
      () => sendAlert(circle.circleId, {
        memberId: 'nonexistentMember',
        verdict: 'danger',
      }),
      /Member not in this circle/
    );
  });

  test('listAlerts — returns recent alerts', () => {
    const circle = createCircle('Maman');
    const members = getCircle(circle.circleId).members;
    
    // Create 3 alerts
    for (let i = 0; i < 3; i++) {
      sendAlert(circle.circleId, {
        memberId: members[0].memberId,
        verdict: i === 0 ? 'danger' : 'suspect',
        message: `Alert ${i}`,
      });
    }
    
    const alerts = listAlerts(circle.circleId);
    assert.equal(alerts.length, 3, 'should have 3 alerts');
    // Most recent first
    assert.equal(alerts[0].message, 'Alert 2');
    assert.equal(alerts[2].message, 'Alert 0');
  });

  test('listAlerts — respects limit parameter', () => {
    const circle = createCircle('Maman');
    const members = getCircle(circle.circleId).members;
    
    for (let i = 0; i < 10; i++) {
      sendAlert(circle.circleId, {
        memberId: members[0].memberId,
        verdict: 'suspect',
        message: `Alert ${i}`,
      });
    }
    
    const alerts = listAlerts(circle.circleId, 5);
    assert.equal(alerts.length, 5, 'should respect limit');
  });

  test('markAlertRead — marks alert as read', () => {
    const circle = createCircle('Maman');
    const members = getCircle(circle.circleId).members;
    
    const alert = sendAlert(circle.circleId, {
      memberId: members[0].memberId,
      verdict: 'danger',
      message: 'Test alert',
    });
    
    // Initially unread
    let alerts = listAlerts(circle.circleId);
    assert.equal(alerts[0].read, false, 'should start unread');
    
    // Mark as read
    markAlertRead(circle.circleId, alert.alertId);
    alerts = listAlerts(circle.circleId);
    assert.equal(alerts[0].read, true, 'should be marked read');
  });

  test('markAlertRead — rejects non-existent alert', () => {
    const circle = createCircle('Maman');
    assert.throws(
      () => markAlertRead(circle.circleId, 'fakeAlertId'),
      /Alert not found/
    );
  });

  test('getCircleStats — reports member and alert counts', () => {
    const circle = createCircle('Maman');
    const code = circle.inviteCode;
    addMember(circle.circleId, code, 'Fils');
    addMember(circle.circleId, code, 'Fille');
    
    const stats = getCircleStats(circle.circleId);
    assert.equal(stats.memberCount, 3, 'should count 3 members');
    assert.equal(stats.totalAlerts, 0, 'should have 0 alerts');
  });

  test('getCircleStats — counts this week and this month', () => {
    const circle = createCircle('Maman');
    const members = getCircle(circle.circleId).members;
    
    // Create 2 alerts
    sendAlert(circle.circleId, {
      memberId: members[0].memberId,
      verdict: 'danger',
      message: 'Alert 1',
    });
    
    sendAlert(circle.circleId, {
      memberId: members[0].memberId,
      verdict: 'suspect',
      message: 'Alert 2',
    });
    
    const stats = getCircleStats(circle.circleId);
    assert.equal(stats.totalAlerts, 2);
    assert(stats.thisWeek >= 2, 'should count recent alerts as this week');
    assert(stats.thisMonth >= 2, 'should count recent alerts as this month');
  });

  test('Alert response time — sub-200ms for alert creation', () => {
    const circle = createCircle('Maman');
    const members = getCircle(circle.circleId).members;
    
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      sendAlert(circle.circleId, {
        memberId: members[0].memberId,
        verdict: 'danger',
        message: `Alert ${i}`,
      });
    }
    const elapsed = Date.now() - start;
    
    assert(elapsed < 200, `alerts should be fast (<200ms), took ${elapsed}ms`);
  });
});
