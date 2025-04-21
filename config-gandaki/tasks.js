const common = require('./common');
const noolsExtras = require('./nools-extras');
const taskExtras = require('./tasks-extras');
const taskSchedules = require('./task-schedules');
const {
  isFormArraySubmittedInWindow,
  addDays,
  isAlive,
  isMuted,
  isTaskUser,
  getField,
  getMostRecentLMPDateForPregnancy,
  getDateMS,
  hasError
} = noolsExtras;
const {
  FORMS
} = common;
const {
  generateEventForHomeVisit,
  checkTaskResolvedForHomeVisit,
  generateEventPncVisit,
  checkTaskResolvedForDeliveryReminder
} = taskExtras;
const {
  ancSchedule,
  pncSchedule
} = taskSchedules;

const DELIVERY_REMINDER_DAY = 280;



module.exports = [
  {
    name: 'pregnancy',
    title: 'task.pregnancy.title',
    icon: 'icon-pregnancy',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      if (!isTaskUser(user) || !isAlive(contact) || isMuted(contact)) {
        return false;
      }
      // Check if contact is a female patient
      return contact.contact.role === 'patient' && contact.contact.gender !== 'male' && !contact.contact.muted;
      // We are not checking age group because only ANC patients are registered
    },
    resolvedIf: function (contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        FORMS.PREGNANCY_REGISTRATION,
        Utils.addDate(dueDate, -event.start).getTime(),
        Utils.addDate(dueDate, event.end + 1).getTime()
      );
    },
    events: [
      {
        id: 'pregnancy',
        days: 3,
        start: 3,
        end: 3
      }
    ],
    actions: [
      {
        form: 'pregnancy'
      }
    ]
  },
  {
    name: 'anc.pregnancy_home_visit.known_lmp',
    icon: 'icon-pregnancy',
    title: 'task.anc.pregnancy_home_visit.title',
    appliesTo: 'reports',
    appliesToType: FORMS.PREGNANCY_REGISTRATION,
    appliesIf: function (contact, report) {
      if (!isTaskUser(user) || !isAlive(contact) || isMuted(contact) || hasError(report)) {
        return false;
      }

      return (getField(report, 'gestational_age.lmp_date') !== undefined || getField(report, 'lmp_date') !== undefined || report.lmp_date !== undefined);

    },
    actions: [
      {
        type: 'report',
        form: 'pregnancy_visit',
        modifyContent: (content, contact, report, event) => {
          content.visit = event.id.slice(event.id.length - 1,);
          const dueDate = event.dueDate(event, contact, report);
          content.lmpDateForm = getField(report, 'gestational_age.u_lmp_date') !== undefined ? getDateMS(getField(report, 'gestational_age.u_lmp_date')) : 0;
          content.lmpDateSms = getField(report, 'lmp_date') !== undefined ? getDateMS(getField(report, 'lmp_date')) : (report.lmp_date !== undefined ? report.lmp_date : 0);
          content.current_period_start = addDays(dueDate, -event.start);
          content.current_period_end = addDays(dueDate, event.end);
        }
      }
    ],
    events: ancSchedule.map((schedule, visit) => generateEventForHomeVisit(visit, schedule)),
    resolvedIf: checkTaskResolvedForHomeVisit
  },

  {
    name: 'delivery.confirmation',
    icon: 'icon-delivery',
    title: 'task.delivery_confirmation.title',
    appliesTo: 'reports',
    appliesToType: FORMS.PREGNANCY_REGISTRATION,
    appliesIf: function (contact, report) {
      if (!isTaskUser(user) || !isAlive(contact) || isMuted(contact) || hasError(report)) {
        return false;
      }
      return true;
    },
    actions: [{ form: 'delivery' }],
    events: [
      {
        start: 21,
        end: 14,
        dueDate: function (event, contact, report) {
          const recentLMPDate = getMostRecentLMPDateForPregnancy(contact, report);
          if (recentLMPDate) { return addDays(recentLMPDate, DELIVERY_REMINDER_DAY); }
          return addDays(report.reported_date, DELIVERY_REMINDER_DAY);
        }
      }
    ],
    resolvedIf: checkTaskResolvedForDeliveryReminder
  },
  {
    name: 'pnc.pnc_visit.known_delivery',
    icon: 'icon-pregnancy',
    title: 'task.pnc_visit.title',
    appliesTo: 'reports',
    appliesToType: FORMS.DELIVERY,
    appliesIf: function (contact, report) {
      if (!isTaskUser(user) || !isAlive(contact) || isMuted(contact) || hasError(report)) {
        return false;
      }
      return (getField(report, 'delivery.delivery_date') !== undefined || getField(report, 'days_since_birth') !== undefined) && isAlive(contact) && !contact.contact.muted;
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_visit',
        modifyContent: (content, contact, report, event) => {
          content.visit = event.id.slice(event.id.length - 1,);
          const dueDate = event.dueDate(event, contact, report);
          content.current_period_start = addDays(dueDate, -event.start);
          content.current_period_end = addDays(dueDate, event.end);
        }
      }
    ],
    events: pncSchedule.map((schedule, visit) => generateEventPncVisit(visit, schedule)),
    resolvedIf: function (contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        FORMS.PNC,
        Utils.addDate(dueDate, -event.start).getTime(),
        Utils.addDate(dueDate, event.end + 1).getTime()
      );
    }
  },

];


