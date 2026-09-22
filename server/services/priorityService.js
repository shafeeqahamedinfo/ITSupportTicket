/**
 * Smart Priority Calculation Service
 *
 * Calculates ticket priority based on:
 * - Category type
 * - Number of affected users
 * - Urgency level selected by user
 * - Service impact
 * - Location type (e.g., server room vs. classroom)
 *
 * Priority levels: LOW | MEDIUM | HIGH | CRITICAL
 */

// ── Category base weights ─────────────────────────────────────────────────────
const CATEGORY_WEIGHTS = {
  'Network':        4, // Network issues affect many users
  'Wi-Fi':          4,
  'Cybersecurity':  5, // Security is always critical
  'Hardware':       2,
  'Software':       2,
  'Printer':        1,
  'Projector':      2,
  'Email':          3,
  'Account/Login':  3,
  'Operating System': 2,
  'Application':    2,
  'Other':          1,
};

// ── Urgency weights ───────────────────────────────────────────────────────────
const URGENCY_WEIGHTS = {
  LOW:      0,
  MEDIUM:   1,
  HIGH:     2,
  CRITICAL: 3,
};

// ── Service Impact weights ────────────────────────────────────────────────────
const IMPACT_WEIGHTS = {
  NONE:            0,
  MINOR:           1,
  MODERATE:        2,
  MAJOR:           3,
  COMPLETE_OUTAGE: 4,
};

/**
 * Calculate smart priority score and return a priority level.
 *
 * @param {Object} params
 * @param {string} params.category       - Ticket category
 * @param {number} params.affectedUsers  - Number of affected users
 * @param {string} params.urgency        - User-selected urgency
 * @param {string} params.serviceImpact  - Service impact level
 * @param {string} params.userPriority   - User-selected priority
 * @returns {{ priority: string, score: number, reason: string }}
 */
const calculateSmartPriority = ({
  category,
  affectedUsers = 1,
  urgency = 'MEDIUM',
  serviceImpact = 'MINOR',
  userPriority = 'MEDIUM',
}) => {
  let score = 0;
  const reasons = [];

  // 1. Category weight (max 5)
  const categoryScore = CATEGORY_WEIGHTS[category] || 1;
  score += categoryScore;
  if (categoryScore >= 4) reasons.push(`High-impact category (${category})`);

  // 2. Affected users
  let usersScore = 0;
  if (affectedUsers >= 100) { usersScore = 5; reasons.push('100+ users affected'); }
  else if (affectedUsers >= 50) { usersScore = 4; reasons.push('50+ users affected'); }
  else if (affectedUsers >= 20) { usersScore = 3; reasons.push('20+ users affected'); }
  else if (affectedUsers >= 5)  { usersScore = 2; reasons.push('Multiple users affected'); }
  else { usersScore = 0; }
  score += usersScore;

  // 3. Urgency weight (max 3)
  const urgencyScore = URGENCY_WEIGHTS[urgency] || 1;
  score += urgencyScore;
  if (urgencyScore >= 2) reasons.push(`High urgency selected`);

  // 4. Service impact (max 4)
  const impactScore = IMPACT_WEIGHTS[serviceImpact] || 1;
  score += impactScore;
  if (impactScore >= 3) reasons.push(`Major service impact`);

  // 5. User priority preference (tiebreaker boost)
  const priorityBoost = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
  score += priorityBoost[userPriority] || 0;

  // ── Translate score to priority level ─────────────────────
  let priority;
  if (score >= 12)      { priority = 'CRITICAL'; }
  else if (score >= 8)  { priority = 'HIGH'; }
  else if (score >= 4)  { priority = 'MEDIUM'; }
  else                  { priority = 'LOW'; }

  // Override: Cybersecurity is always at least HIGH
  if (category === 'Cybersecurity' && priority === 'LOW') priority = 'HIGH';
  if (category === 'Cybersecurity' && priority === 'MEDIUM') priority = 'HIGH';

  // Override: Complete outage is always CRITICAL
  if (serviceImpact === 'COMPLETE_OUTAGE') priority = 'CRITICAL';

  const reason = reasons.length > 0
    ? reasons.join(' + ')
    : `Standard priority (score: ${score})`;

  return { priority, score, reason };
};

/**
 * Calculate SLA deadline based on priority.
 * @param {string} priority - CRITICAL | HIGH | MEDIUM | LOW
 * @returns {Date} - SLA deadline Date
 */
const calculateSLADeadline = (priority) => {
  const SLA_HOURS = {
    CRITICAL: parseInt(process.env.SLA_CRITICAL_HOURS) || 2,
    HIGH:     parseInt(process.env.SLA_HIGH_HOURS)     || 6,
    MEDIUM:   parseInt(process.env.SLA_MEDIUM_HOURS)   || 24,
    LOW:      parseInt(process.env.SLA_LOW_HOURS)      || 72,
  };
  const hours = SLA_HOURS[priority] || 24;
  return new Date(Date.now() + hours * 3600000);
};

module.exports = { calculateSmartPriority, calculateSLADeadline };
