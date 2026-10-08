/**
 * Trip Planner - Financial & Payment Logic Module
 */

/**
 * Calculate Equal Share budget per person
 */
function calculateEqualShare(totalBudget, numPeople) {
  const budget = parseFloat(totalBudget) || 0;
  const count = parseInt(numPeople, 10) || 0;

  if (budget <= 0 || count <= 0) {
    return 0;
  }

  const share = budget / count;
  return Math.round(share * 100) / 100;
}

/**
 * Calculate Pending amount for a person
 */
function calculatePending(equalShare, paidAmount) {
  const share = parseFloat(equalShare) || 0;
  const paid = Math.max(0, parseFloat(paidAmount) || 0);

  if (paid >= share) {
    return 0;
  }
  return Math.max(0, Math.round((share - paid) * 100) / 100);
}

/**
 * Determine payment status for a person
 */
function calculatePaymentStatus(paidAmount, equalShare) {
  const paid = parseFloat(paidAmount) || 0;
  const share = parseFloat(equalShare) || 0;

  if (share <= 0) {
    return {
      status: 'Pending',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800'
    };
  }

  if (paid >= share) {
    return {
      status: 'Paid',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    };
  } else if (paid > 0 && paid < share) {
    return {
      status: 'Partial',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
    };
  } else {
    return {
      status: 'Pending',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800'
    };
  }
}

/**
 * Calculate summary metrics for an entire trip
 */
function calculateTripSummary(trip) {
  if (!trip) {
    return {
      totalBudget: 0,
      numPeople: 0,
      equalShare: 0,
      totalPaid: 0,
      totalPending: 0,
      progressPercent: 0
    };
  }

  const totalBudget = parseFloat(trip.budget) || 0;
  const people = trip.people || [];
  const numPeople = people.length;
  const equalShare = calculateEqualShare(totalBudget, numPeople);

  let totalPaid = 0;
  people.forEach(person => {
    totalPaid += Math.max(0, parseFloat(person.paid) || 0);
  });

  const safeTotalPaid = Math.min(totalBudget, totalPaid);
  const totalPending = Math.max(0, totalBudget - safeTotalPaid);
  
  let progressPercent = 0;
  if (totalBudget > 0) {
    progressPercent = Math.min(100, Math.round((safeTotalPaid / totalBudget) * 100));
  }

  return {
    totalBudget,
    numPeople,
    equalShare,
    totalPaid,
    totalPending,
    progressPercent
  };
}
