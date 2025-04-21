const noolsExtras = require('./nools-extras');
const common = require('./common');
const {
  isFormArraySubmittedInWindow,
  addDays,
  getMostRecentLMPDateForPregnancy,
  isPregnancyTaskMuted,
  getNewestDeliveryTimestamp,
  getNewestPregnancyTimestamp,
  getTimeForMidnight,
  getNewestDeliveryDate
} = noolsExtras;
const {
  FORMS
} = common;

function generateEventForHomeVisit(visit, { start, due, end }) {
  return {
    id: `pregnancy-home-visit-${visit + 1}`,
    start,
    end,
    dueDate: function (event, contact, report) {
      const recentLMPDate = getMostRecentLMPDateForPregnancy(contact, report);
      if (recentLMPDate) {
        return addDays(recentLMPDate, due);
      }
      return addDays(report.reported_date, due);
    }
  };
}

function generateEventPncVisit(visit, { start, due, end }) {
  return {
    id: `pnc_visit-${visit + 1}`,
    start,
    end,
    dueDate: function (event, contact, report) {
      const recentDeliveryDate = getNewestDeliveryDate(contact);
      if (recentDeliveryDate) {
        return addDays(recentDeliveryDate, due);
      }
      return addDays(report.reported_date, due);
    }
  };
}

function checkTaskResolvedForDeliveryReminder(contact, report, event, dueDate) {

  if(isPregnancyTaskMuted(contact)) { return true; }
  // Tasks cleared by delivery
  const startTime = getMostRecentLMPDateForPregnancy(contact, report);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFormArraySubmittedInWindow(contact.reports, FORMS.DELIVERY, startTime, endTime);
}

function checkTaskResolvedForHomeVisit(contact, report, event, dueDate) {
  //delivery form submitted
  if (report.reported_date < getNewestDeliveryTimestamp(contact)) { return true; }

  //old pregnancy report
  if (report.reported_date < getNewestPregnancyTimestamp(contact)) { return true; }

  //Due date older than reported day
  const endDate = addDays(dueDate, event.end);
  if (endDate <= getTimeForMidnight(report.reported_date)) { return true; }

  //Pregnancy registered within the ANC visit task window
  if (report.form === 'pregnancy') {
    const startTime = addDays(dueDate, -event.start).getTime();
    const endTime = addDays(dueDate, event.end + 1).getTime();
    if (report.reported_date >= startTime && report.reported_date <= endTime) { return true; }
  }

  //Tasks cleared
  if (isPregnancyTaskMuted(contact)) { return true; }
  const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFormArraySubmittedInWindow(contact.reports, FORMS.ANC_VISIT, startTime, endTime);
}

module.exports = {
  checkTaskResolvedForHomeVisit,
  generateEventForHomeVisit,
  generateEventPncVisit,
  checkTaskResolvedForDeliveryReminder
};