const today = getDateMS(Date.now());
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS_IN_PREGNANCY = 42 * 7;  // 42 weeks = 294 days
const pregnancyForms = ['L', 'ल', 'pregnancy', 'EP'];
const deliveryForms = ['J', 'ज', 'delivery', 'ED'];
const antenatalForms = ['G', 'ग', 'pregnancy_visit'];
const allANCForms = ['G', 'ग', 'pregnancy', 'pregnancy_visit', 'pregnancy_danger_sign', 'delivery'];
const TASK_PARENT_CONTACT_TYPES = ['g30_health_center'];

function isAlive(contact) {
  return contact && contact.contact && !contact.contact.date_of_death;
}

function isMuted(contact) {
  return contact && contact.contact && contact.contact.muted;
}

function hasError(report) {
  return report && report.errors && report.errors.length > 0;
}

function isTaskUser(user) {
  return user && user.parent && user.parent.contact_type && TASK_PARENT_CONTACT_TYPES.includes(user.parent.contact_type);
}

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function isFormArraySubmittedInWindow(reports, formArray, start, end, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });

  if (count) { return reportCount >= count; }
  return found;
}


function isFormArraySubmittedInWindowExcludingThisReport(reports, formArray, start, end, exReport, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end && report._id !== exReport._id) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });
  if (count) { return reportCount >= count; }
  else { return found; }
}


function getMostRecentReport(reports, form) {
  let result;
  reports.forEach(function (report) {
    if (form.includes(report.form) &&
      !report.deleted &&
      (!result || report.reported_date > result.reported_date)) {
      result = report;
    }
  });
  return result;
}

function getNewestPregnancyTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestPregnancy = getMostRecentReport(contact.reports, pregnancyForms);
  return newestPregnancy ? newestPregnancy.reported_date : 0;
}

function getNewestDeliveryTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestDelivery = getMostRecentReport(contact.reports, deliveryForms);
  return newestDelivery ? newestDelivery.reported_date : 0;
  //newestDelivery - days before delivery was done if sms
}

function getNewestDeliveryDate(contact) {
  if (!contact.contact) { return; }
  const newestDelivery = getMostRecentReport(contact.reports, deliveryForms);

  if (getField(newestDelivery, 'delivery.delivery_date')) {
    return getField(newestDelivery, 'delivery.delivery_date');
  }

  if (newestDelivery && newestDelivery.birth_date) {
    return newestDelivery.birth_date;
  }

  return newestDelivery.reported_date;
}

function isFacilityDelivery(contact, report) {
  if (!contact) {
    return false;
  }
  if (arguments.length === 1) { report = contact; }
  return getField(report, 'facility_delivery') === 'yes';
}

function countReportsSubmittedInWindow(reports, form, start, end, condition) {
  let reportsFound = 0;
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound++;
        }
      }
    }
  });
  return reportsFound;
}

function getReportsSubmittedInWindow(reports, form, start, end, condition) {
  const reportsFound = [];
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound.push(report);
        }
      }
    }
  });
  return reportsFound;
}

function getDateISOLocal(s) {
  if (!s) { return new Date(); }
  const b = s.split(/\D/);
  const d = new Date(b[0], b[1] - 1, b[2]);
  if (isValidDate(d)) { return d; }
  return new Date();
}

function getTimeForMidnight(d) {
  const date = new Date(d);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function getDateMS(d) {
  if (typeof d === 'string') {
    if (d === '') { return null; }
    d = getDateISOLocal(d);
  }
  return getTimeForMidnight(d).getTime();
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function addDays(date, days) {
  const result = getTimeForMidnight(new Date(date));
  result.setDate(result.getDate() + days);
  return result;
}

function isPregnancyForm(report) {
  return pregnancyForms.includes(report.form);
}

function isPregnancyFollowUpForm(report) {
  return antenatalForms.includes(report.form);
}

function isDeliveryForm(report) {
  return deliveryForms.includes(report.form);
}

const getNewestReport = function (reports, forms) {
  let result;
  reports.forEach(function (report) {
    if (!forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
};

const getLMPDateFromPregnancy = function (report) {
  //console.log(report);
  return isPregnancyForm(report) &&
    getDateMS(getField(report, 'lmp_date') || report.lmp_date);
};

const getLMPDateFromPregnancyFollowUp = function (report) {
  return isPregnancyFollowUpForm(report) &&
    getDateMS(getField(report, 'lmp_date'));
};

function getSubsequentPregnancies(contact, refReport) {
  return contact.reports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}

function getSubsequentPregnancyFollowUps(contact, report) {
  const subsequentVisits = contact.reports.filter(function (visit) {
    let lmpDate = getLMPDateFromPregnancy(report);
    if (!lmpDate) { //LMP Date is not available, use reported date
      lmpDate = report.reported_date;
    }

    return isPregnancyFollowUpForm(visit) &&
      visit.reported_date > report.reported_date &&
      visit.reported_date < addDays(lmpDate, MAX_DAYS_IN_PREGNANCY);
  });
  return subsequentVisits;
}

function getSubsequentDeliveries(contact, refReport, withinLastXDays) {
  return contact.reports.filter(function (deliveryReport) {
    return (deliveryReport.form === 'delivery') &&
      deliveryReport.reported_date > refReport.reported_date &&
      (!withinLastXDays || refReport.reported_date >= (today - withinLastXDays * MS_IN_DAY));
  });
}

function getMostRecentLMPDateForPregnancy(contact, report) {
  let mostRecentLMP = getLMPDateFromPregnancy(report);
  let mostRecentReportDate = report.reported_date;
  getSubsequentPregnancyFollowUps(contact, report).forEach(function (pregFollowup) {

    if (pregFollowup.reported_date > mostRecentReportDate) {
      const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(pregFollowup);
      if (lmpFromPregnancyFollowUp && lmpFromPregnancyFollowUp !== '' && !isNaN(lmpFromPregnancyFollowUp))
        if (lmpFromPregnancyFollowUp !== mostRecentLMP) {
          mostRecentReportDate = pregFollowup.reported_date;
          mostRecentLMP = lmpFromPregnancyFollowUp;
        }
    }
  });
  return mostRecentLMP;
}


function isPregnancyTerminatedByAbortion(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'abortion';
}

function isPregnancyTerminatedByMiscarriage(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'miscarriage';
}

function isActivePregnancy(contact, report) {
  if (!isPregnancyForm(report)) { return false; }
  const lmpDate = getMostRecentLMPDateForPregnancy(contact, report) || report.reported_date;
  const isPregnancyRegisteredWithin9Months = lmpDate > today - MAX_DAYS_IN_PREGNANCY * MS_IN_DAY;
  const isPregnancyTerminatedByDeliveryInLast6Weeks = getSubsequentDeliveries(contact, report, 6 * 7).length > 0;
  const isPregnancyTerminatedByAnotherPregnancyReport = getSubsequentPregnancies(contact, report).length > 0;
  return isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !isPregnancyTerminatedByAbortion(contact, report) &&
    !isPregnancyTerminatedByMiscarriage(contact, report);
}

function countANCFacilityVisits(contact, pregnancyReport) {
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(contact, pregnancyReport);
  if (getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past') && !isNaN(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'))) {
    ancHFVisits += parseInt(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
  }
  ancHFVisits += pregnancyFollowUps.reduce(function (sum, report) {
    const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');
    if (!pastANCHFVisits) { return 0; }
    sum += pastANCHFVisits.last_visit_attended === 'yes' && 1;
    if (isNaN(pastANCHFVisits.visited_hf_count)) { return sum; }
    return sum += pastANCHFVisits.report_other_visits === 'yes' && parseInt(pastANCHFVisits.visited_hf_count);
  }, 0);
  return ancHFVisits;
}

function getRecentANCVisitWithEvent(contact, report, event) {
  //event should be one among miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
}

function isPregnancyTaskMuted(contact) {
  const latestVisit = getNewestReport(contact.reports, allANCForms);
  return latestVisit && isPregnancyFollowUpForm(latestVisit) &&
    getField(latestVisit, 'pregnancy_ended.clear_option') === 'clear_all';
}

function isDangerSignPresentMother(report) {
  if (getField(report, 'mother_info.pnc_danger_sign_check')) {
    return getField(report, 'mother_info.pnc_danger_sign_check.r_pnc_danger_sign_present') === 'yes';
  } else {
    return getField(report, 'danger_signs.r_danger_sign_present') === 'yes';
  }
}

function getBabyFields(contact) {
  return (contact.reports && contact.reports[contact.reports.length - 1] && contact.reports[contact.reports.length - 1].fields && contact.reports[contact.reports.length - 1].fields) || contact.contact;
}

function getActiveDangerSignsMother(report) {
  const dangerSignDictionaryEnglish = {
    'faint': 'Convulsion and Fainting',
    'fever': 'Fever',
    'headache': 'Severe headache/ Visual Disturbance / Breathing Difficulty',
    'vaginal_bleeding': 'Severe Vaginal Bleeding',
    'vaginal_discharge': 'Foul Smelling White Discharge from Vagina',
    'abd_pain': 'Severe Abdominal Pain'
  };

  const dangerSignDictionaryNepali = {
    'faint': 'कम्पन छुट्टने, मुर्छा पर्ने छ',
    'fever': 'ज्वरो आएको छ',
    'headache': 'कडा किसिमले टाउको दुखने / आँखा खोल्न गाह्रो हुने/श्वास फेर्न गाह्रो हुने छ ',
    'vaginal_bleeding': 'योनीबाट  धेरै रगत बगीरहेको छ',
    'vaginal_discharge': 'योनीबाट सेतो गन्ध आउने पानि बगीरहेको छ',
    'abd_pain': 'कडा किसिमले तल्लो पेट दुखिरहेको छ'
  };

  const getActiveDangerSignNote = (dictionary) => {
    const allDangerSignsMother = getField(report, 'mother_info.pnc_danger_sign_check') || getField(report, 'danger_signs');
    let activeDangerSignsMother = '';

    Object.entries(allDangerSignsMother).filter(([key,]) => Object.keys(dictionary).includes(key)).forEach(([key, value]) => {
      if (value.toLowerCase() === 'yes') {
        const sign = dictionary[key];
        activeDangerSignsMother = `${sign}, ${activeDangerSignsMother}`;
      }
    });

    return activeDangerSignsMother.slice(null, -2);
  };

  return {
    'en': getActiveDangerSignNote(dangerSignDictionaryEnglish),
    'ne': getActiveDangerSignNote(dangerSignDictionaryNepali)
  };
}

function getActiveDangerSignsBaby(contact) {
  const dangerSignDictionaryEnglish = {
    'infected_umbilical_cord': 'Pus from umbilical or readness around the umbilical area',
    'convulsion': 'Fever and convulsion',
    'difficulty_feeding': 'Refuses to suck breast milk',
    'vomit': 'Vomits everything eaten ?',
    'drowsy': 'No movement or poor movement only after stimulation',
    'fast_breathing': 'Fast breathing (> 60 breaths/minute)',
    'chest_indrawing': 'Severe chest in-drawing',
    'yellow_skin': 'Yellow palms (hands) or soles (feet)',
    'pustules': 'Pustules more than 10 or 1 big pustule size more than 1 mm'
  };

  const dangerSignDictionaryNepali = {
    'infected_umbilical_cord': 'नाभी बाट पिप आउने वा नाभी वरपर रातो भएको छ',
    'convulsion': 'ज्वरो आएको कम्पन छुट्टने छ',
    'difficulty_feeding': 'दुध चुस्न नम्माने छ',
    'vomit': 'खाएको सबै उल्टि गर्छ',
    'drowsy': 'सुती रहने, ब्युझाउन गार्हो हुने छ',
    'fast_breathing': 'चाडो - चाडो श्वास फर्ने छ (>६०/ मिनेट)',
    'chest_indrawing': 'कोखा हानी रहेको छ',
    'yellow_skin': 'हात र खुट्टाको पैताला पहेलो छ',
    'pustules': 'शरीरमा १० ओटा साना पिप्सो वा १ ठुलो ( >१ मिमि) पिप्सो छ'
  };

  const getActiveDangerSignNote = (dictionary) => {
    const allDangerSignsBaby = getBabyFields(contact).danger_signs;
    let activeDangerSignsBaby = '';

    Object.entries(allDangerSignsBaby).filter(([key,]) => Object.keys(dictionary).includes(key)).forEach(([key, value]) => {
      if (value.toLowerCase() === 'yes') {
        const sign = dictionary[key];
        activeDangerSignsBaby = `${sign}, ${activeDangerSignsBaby}`;
      }
    });

    return activeDangerSignsBaby.slice(null, -2);
  };

  return {
    'en': getActiveDangerSignNote(dangerSignDictionaryEnglish),
    'ne': getActiveDangerSignNote(dangerSignDictionaryNepali)
  };
}

module.exports = {
  today,
  MS_IN_DAY,
  MAX_DAYS_IN_PREGNANCY,
  addDays,
  isAlive,
  isMuted,
  isTaskUser,
  isDangerSignPresentMother,
  getActiveDangerSignsMother,
  getBabyFields,
  getActiveDangerSignsBaby,
  getTimeForMidnight,
  isFormArraySubmittedInWindow,
  isFormArraySubmittedInWindowExcludingThisReport,
  getDateMS,
  getDateISOLocal,
  isDeliveryForm,
  getMostRecentReport,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  getReportsSubmittedInWindow,
  countReportsSubmittedInWindow,
  countANCFacilityVisits,
  isFacilityDelivery,
  getMostRecentLMPDateForPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  isActivePregnancy,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField,
  getNewestDeliveryDate,
  hasError
};
