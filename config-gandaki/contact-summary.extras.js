const { DateTime } = require('luxon');
const today = DateTime.local().startOf('day');
const common = require('./common');
const {
  FORMS,
  MAX_DAYS_IN_PREGNANCY,
  isPatient,
  getNewestReport,
  getField
} = common;

function isAlive(contact, allReports) {
  if (contact.date_of_death) {
    return false;
  }

  if (!allReports || allReports.length === 0) {
    return true;
  }

  return !allReports.some(r => FORMS.DEATH_REPORT.includes(r.form));
}

function getDOB(contact) {
  if (contact.date_of_birth) {
    return DateTime.fromISO(contact.date_of_birth);
  } else if (contact.year_of_birth_approx) {
    return DateTime.fromISO(contact.reported_date).set({ year: contact.year_of_birth_approx });
  } else if (contact.age) {
    return DateTime.fromISO(contact.reported_date).minus({ years: contact.age });
  }
}

function getDeliveryDate(deliveryReport) {
  if (!deliveryReport || !deliveryReport.form) { return null; }
  switch (deliveryReport.form) {
    case 'delivery':
      return DateTime.fromISO(getField(deliveryReport, 'delivery_date_8601'));
    default:
      return DateTime.fromISO(deliveryReport.reported_date).minus({ days: getField(deliveryReport, 'days_since_birth') });
  }
}

function getLMPDate(pregnancyReport) {
  return pregnancyReport && DateTime.fromISO(pregnancyReport.lmp_date || (pregnancyReport.fields && pregnancyReport.fields.lmp_date));
}

function getEDD(pregnancyReport) {
  return pregnancyReport && DateTime.fromISO(pregnancyReport.expected_date || (pregnancyReport.fields && pregnancyReport.fields.expected_date));
}

function isActivePregnancy(thisContact, allReports, pregnancyReport) {
  if (!isPatient(thisContact)) { return false; }
  const mostRecentPregnancyReport = pregnancyReport || getNewestReport(allReports, FORMS.PREGNANCY_REGISTRATION);
  const mostRecentDeliveryReport = getNewestReport(allReports, FORMS.DELIVERY);

  if (!isAlive(thisContact, allReports)) { return false; }
  if (!mostRecentPregnancyReport) { return false; }
  if (mostRecentDeliveryReport && mostRecentDeliveryReport.reported_date > mostRecentPregnancyReport.reported_date) {
    return false;
  }

  const lmpDate = getLMPDate(mostRecentPregnancyReport);
  if (lmpDate && lmpDate.ts >= today.minus({ days: MAX_DAYS_IN_PREGNANCY }).ts) {
    return true;
  }
  return false;
}

function isPncEligible(thisContact, allReports) {
  if (!isPatient(thisContact)) { return false; }
  const mostRecentDeliveryReport = getNewestReport(allReports, FORMS.DELIVERY);
  if (!mostRecentDeliveryReport) {
    return false;
  }

  if (mostRecentDeliveryReport && getField(mostRecentDeliveryReport, 'delivery.delivery_date') &&
    DateTime.fromISO(getField(mostRecentDeliveryReport, 'delivery.delivery_date')) > today.minus({ days: 45 })) {
    return true;
  }

  if (mostRecentDeliveryReport && mostRecentDeliveryReport.birth_date &&
    DateTime.fromISO(mostRecentDeliveryReport.birth_date) > today.minus({ days: 45 })) {
    return true;
  }

  return false;
}

function isReadyForNewPregnancy(thisContact, allReports) {
  if (!isPatient(thisContact)) { return false; }
  const mostRecentPregnancyReport = getNewestReport(allReports, FORMS.PREGNANCY_REGISTRATION);
  const mostRecentDeliveryReport = getNewestReport(allReports, FORMS.DELIVERY);
  if (!mostRecentPregnancyReport && !mostRecentDeliveryReport) {
    return true;
  } else if (!mostRecentPregnancyReport) {
    if (mostRecentDeliveryReport && getDeliveryDate(mostRecentDeliveryReport) < today.minus({ days: 42 })) {
      return true;
    }
  } else if (!mostRecentDeliveryReport || mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date) {
    const lmpDate = getLMPDate(mostRecentPregnancyReport);
    if (lmpDate && lmpDate < today.minus({ days: MAX_DAYS_IN_PREGNANCY })) {
      return true;
    }
  } else {
    if (mostRecentDeliveryReport) {
      return getDeliveryDate(mostRecentDeliveryReport) < today.minus({ days: 42 });
    }
  }
  return false;
}

function getANCVisitCount(thisContact, allReports) {
  if (!isPatient(thisContact)) { return -1; }
  const mostRecentPregnancyReport = getNewestReport(allReports, FORMS.PREGNANCY_REGISTRATION);
  if (!mostRecentPregnancyReport) {
    return -1;
  }

  let ancVisitCount = 0;
  if (mostRecentPregnancyReport && mostRecentPregnancyReport.form === 'pregnancy') {
    const pastHFVisitCount = parseInt(getField(mostRecentPregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
    if (pastHFVisitCount > 0) {
      ancVisitCount += pastHFVisitCount;
    }
  }

  allReports && allReports.forEach(function (report) {
    if (FORMS.ANC_VISIT.includes(report.form) && report.reported_date > mostRecentPregnancyReport.reported_date) {
      ancVisitCount++;
    }
  });
  return ancVisitCount;
}

function isHighRiskPregnancy(thisContact, allReports, pregnancyReport) {
  if (!isPatient(thisContact)) { return false; }
  let highRisk = false;
  const mostRecentPregnancyReport = pregnancyReport || getNewestReport(allReports, FORMS.PREGNANCY_REGISTRATION);
  if (mostRecentPregnancyReport.form === 'pregnancy') {
    highRisk = getField(mostRecentPregnancyReport, 'r_risk_factor_present') === 'yes';
  }

  if (!highRisk) {
    allReports && allReports.forEach(function (report) {
      if (FORMS.DANGER_SIGN.includes(report.form) && report.reported_date > mostRecentPregnancyReport.reported_date) {
        highRisk = true;
      }
    });
  }
  return highRisk;
}

const toDevanagariNumerals = (number) => {
  const devanagariNumerals = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return number.toString().split('').map(digit => devanagariNumerals[parseInt(digit, 10)]).join('');
};

const getDurationBetweenTwoDatesNe = (startDateISO, endDateISO) => {
  const dtStart = DateTime.fromISO(startDateISO);
  const dtEnd = DateTime.fromISO(endDateISO);
  let current = dtStart;

  const years = Math.floor(dtEnd.diff(current, 'years').years);
  current = current.plus({ years });
  const months = Math.floor(dtEnd.diff(current, 'months').months);
  current = current.plus({ months });
  const days = Math.floor(dtEnd.diff(current, 'days').days);

  const parts = [];
  if (years > 0) { parts.push(`${toDevanagariNumerals(years)} वर्ष`); }
  if (months > 0) { parts.push(`${toDevanagariNumerals(months)} महिना`); }
  if (days > 0) { parts.push(`${toDevanagariNumerals(days)} दिन`); }

  return parts.join(' ');
};

module.exports = {
  isAlive,
  isActivePregnancy,
  isReadyForNewPregnancy,
  isHighRiskPregnancy,
  getDOB,
  getLMPDate,
  getEDD,
  getANCVisitCount,
  getDeliveryDate,
  isPncEligible,
  getDurationBetweenTwoDatesNe
};
