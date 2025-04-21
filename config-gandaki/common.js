const FORMS = {
  PREGNANCY_REGISTRATION: ['L', 'ल', 'A', 'अ', 'pregnancy'],
  ANC_VISIT: ['G', 'ग','pregnancy_visit'],
  DELIVERY: ['J', 'ज', 'delivery'],
  DEATH_REPORT: ['M', 'म'],
  DANGER_SIGN: ['D', 'ख'],
  PNC: ['pnc_visit', 'P', 'प' ]
};

const PATIENT_TYPE = 'person';
const MAX_DAYS_IN_PREGNANCY = 42 * 7;

const isReportValid = function (report) {
  if (report && report.form && report.fields && report.reported_date) { return true; }
  return false;
};

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

const isPatient = (contact) => contact && (contact.contact_type === PATIENT_TYPE || contact.type === PATIENT_TYPE);

function getNewestReport(allReports, forms) {
  let result;
  allReports.forEach(function (report) {
    if (!isReportValid(report) || !forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


module.exports = {
  FORMS,
  MAX_DAYS_IN_PREGNANCY,
  isPatient,
  getNewestReport,
  isReportValid,
  getField
};