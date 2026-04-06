/**
 * Circle Service — Family circle CRUD + real-time alerts
 * Handles: creation, member management, alerts
 */

import { randomBytes } from 'node:crypto';

// In-memory storage (ephemeral for MVP)
const circles = new Map();
const members = new Map();
const alerts = new Map();

/**
 * Generate a 6-character invite code
 */
function generateInviteCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Create a new family circle
 * @param {string} ownerName - Name of the circle owner
 * @returns {object} { circleId, inviteCode, owner }
 */
export function createCircle(ownerName) {
  if (!ownerName || typeof ownerName !== 'string' || ownerName.trim().length === 0) {
    throw new Error('Owner name required');
  }

  const circleId = randomBytes(8).toString('hex');
  const inviteCode = generateInviteCode();
  const circle = {
    circleId,
    inviteCode,
    owner: ownerName.trim(),
    createdAt: Date.now(),
    memberCount: 1,
  };

  circles.set(circleId, circle);
  
  // Initialize members map for this circle
  if (!members.has(circleId)) {
    members.set(circleId, []);
  }
  
  // Add owner as first member
  const ownerId = randomBytes(8).toString('hex');
  members.get(circleId).push({
    memberId: ownerId,
    name: ownerName.trim(),
    role: 'owner',
    joinedAt: Date.now(),
  });

  // Initialize alerts for this circle
  if (!alerts.has(circleId)) {
    alerts.set(circleId, []);
  }

  return {
    circleId,
    inviteCode,
    owner: ownerName.trim(),
    createdAt: circle.createdAt,
  };
}

/**
 * Get a circle by ID
 * @param {string} circleId
 * @returns {object} Circle with members
 */
export function getCircle(circleId) {
  if (!circles.has(circleId)) {
    throw new Error('Circle not found');
  }

  const circle = circles.get(circleId);
  const circleMembers = members.get(circleId) || [];
  const circleAlerts = alerts.get(circleId) || [];

  return {
    ...circle,
    members: circleMembers,
    recentAlerts: circleAlerts.slice(-10), // Last 10 alerts
    totalAlerts: circleAlerts.length,
  };
}

/**
 * Add a member to a circle using invite code
 * @param {string} circleId
 * @param {string} inviteCode
 * @param {string} memberName
 * @returns {object} { memberId, name, joinedAt }
 */
export function addMember(circleId, inviteCode, memberName) {
  if (!circleId || !inviteCode || !memberName) {
    throw new Error('circleId, inviteCode, and memberName required');
  }

  const circle = circles.get(circleId);
  if (!circle) {
    throw new Error('Circle not found');
  }

  if (circle.inviteCode !== inviteCode) {
    throw new Error('Invalid invite code');
  }

  const circleMembers = members.get(circleId) || [];
  
  // Max 10 members per circle
  if (circleMembers.length >= 10) {
    throw new Error('Circle is full (max 10 members)');
  }

  // Check if member already exists
  if (circleMembers.some(m => m.name === memberName.trim())) {
    throw new Error('Member already in this circle');
  }

  const memberId = randomBytes(8).toString('hex');
  const newMember = {
    memberId,
    name: memberName.trim(),
    role: 'member',
    joinedAt: Date.now(),
  };

  circleMembers.push(newMember);
  circle.memberCount = circleMembers.length;

  return {
    memberId,
    name: memberName.trim(),
    joinedAt: newMember.joinedAt,
  };
}

/**
 * Send an alert to a circle
 * @param {string} circleId
 * @param {object} alertData { memberId, verdict, message, scannedUrl, type }
 * @returns {object} { alertId, timestamp, deliveredCount }
 */
export function sendAlert(circleId, alertData) {
  if (!circleId || !alertData || !alertData.memberId || !alertData.verdict) {
    throw new Error('circleId, memberId, and verdict required');
  }

  const circle = circles.get(circleId);
  if (!circle) {
    throw new Error('Circle not found');
  }

  const circleMembers = members.get(circleId) || [];
  const member = circleMembers.find(m => m.memberId === alertData.memberId);
  if (!member) {
    throw new Error('Member not in this circle');
  }

  // Create alert
  const alertId = randomBytes(8).toString('hex');
  const alert = {
    alertId,
    timestamp: Date.now(),
    memberId: alertData.memberId,
    memberName: member.name,
    verdict: alertData.verdict, // 'safe', 'suspect', 'danger'
    message: alertData.message || '',
    scannedUrl: alertData.scannedUrl || '',
    type: alertData.type || 'unknown',
    read: false,
  };

  const circleAlerts = alerts.get(circleId) || [];
  circleAlerts.push(alert);

  // Count unalerted members (everyone except the scanner)
  const deliveredCount = circleMembers.filter(m => m.memberId !== alertData.memberId).length;

  return {
    alertId,
    timestamp: alert.timestamp,
    memberId: alertData.memberId,
    memberName: member.name,
    verdict: alertData.verdict,
    deliveredCount, // How many family members were notified
  };
}

/**
 * List all alerts for a circle (for dashboard)
 * @param {string} circleId
 * @param {number} limit - Max alerts to return
 * @returns {array} Alerts
 */
export function listAlerts(circleId, limit = 50) {
  if (!circles.has(circleId)) {
    throw new Error('Circle not found');
  }

  const circleAlerts = alerts.get(circleId) || [];
  return circleAlerts.slice(-limit).reverse(); // Most recent first
}

/**
 * Mark an alert as read
 * @param {string} circleId
 * @param {string} alertId
 */
export function markAlertRead(circleId, alertId) {
  if (!circles.has(circleId)) {
    throw new Error('Circle not found');
  }

  const circleAlerts = alerts.get(circleId) || [];
  const alert = circleAlerts.find(a => a.alertId === alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  alert.read = true;
}

/**
 * Get circle statistics
 * @param {string} circleId
 * @returns {object} { memberCount, totalAlerts, thisWeek, thisMonth }
 */
export function getCircleStats(circleId) {
  if (!circles.has(circleId)) {
    throw new Error('Circle not found');
  }

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const circleMembers = members.get(circleId) || [];
  const circleAlerts = alerts.get(circleId) || [];

  const thisWeek = circleAlerts.filter(a => now - a.timestamp < oneWeekMs).length;
  const thisMonth = circleAlerts.filter(a => now - a.timestamp < oneMonthMs).length;

  return {
    memberCount: circleMembers.length,
    totalAlerts: circleAlerts.length,
    thisWeek,
    thisMonth,
  };
}

/**
 * Clean test data (for test teardown)
 */
export function _clearAll() {
  circles.clear();
  members.clear();
  alerts.clear();
}
