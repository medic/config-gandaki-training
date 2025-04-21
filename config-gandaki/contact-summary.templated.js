const common = require('./common');
const extras = require('./contact-summary.extras');
const { FORMS, getNewestReport, getField } = common;
const { isAlive, isReadyForNewPregnancy, isActivePregnancy, getDOB, isPncEligible,
  getLMPDate, getEDD, getDeliveryDate, getANCVisitCount, isHighRiskPregnancy, getDurationBetweenTwoDatesNe } = extras;

const context = {
  alive: isAlive(contact, reports),
  show_pregnancy_form: isReadyForNewPregnancy(contact, reports),
  is_active_pregnancy: isActivePregnancy(contact, reports),
  is_pnc_eligible: isPncEligible(contact, reports)
};

const dob = getDOB(contact);

const fields = [
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw'; }, label: 'female.community.health.volunteer', value: '', width: 12 },

  { appliesToType: 'person', appliesIf: function () { return contact.role !== 'chw'; }, label: 'patient_id', value: contact.patient_id, width: 6 },
  { appliesToType: 'person', appliesIf: function () { return contact.role !== 'chw'; }, label: 'contact.phone.number', value: contact.phone, width: 6, filter: 'phone' },
  // mHealth phone
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw'; }, label: 'contact.mhealth.phone.number', value: contact.phone, width: 6, filter: 'phone' },
  //Age
  { appliesToType: 'person', label: 'contact.age', value: dob && dob.toISODate(), width: 6, filter: 'age' },
  //Education level  
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw'; }, label: 'contact.education.level', value: 'level.' + contact.level_of_education, width: 6, translate: true },
  //Duration as FCHV
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && contact.start_date_as_fchv !== '' && typeof (contact.start_date_as_fchv) !== 'undefined'; }, label: 'contact.fchv.duration', value: 'duration.as.fchv', context: { year: new Date().getFullYear() - (contact.start_date_as_fchv - 57) }, translate: true, width: 6 },
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && (contact.start_date_as_fchv === '' || typeof (contact.start_date_as_fchv) === 'undefined'); }, label: 'contact.fchv.duration', value: '-', width: 6 },
  //Basic FCHV training
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && contact.training_date !== '' && typeof (contact.training_date) !== 'undefined'; }, label: 'contact.fchv.training', value: 'duration.as.fchv', context: { year: new Date().getFullYear() - (contact.training_date - 57) }, translate: true, width: 6 },
  //Basic FCHV training: No Data  
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && (contact.training_date === '' || typeof (contact.training_date) === 'undefined'); }, label: 'contact.fchv.training', value: '-', width: 6 },
  //FCHV ID number 
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && contact.fchv_id_number !== '' && typeof (contact.fchv_id_number) !== 'undefined'; }, label: 'contact.fchv.id', value: contact.fchv_id_number, width: 6 },
  //FCHV ID number: no data    
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && (contact.fchv_id_number === '' || typeof (contact.fchv_id_number) === 'undefined'); }, label: 'contact.fchv.id', value: '-', width: 6 },
  //Basic FCHV training
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && contact.most_recent_fchv_training !== '' && typeof (contact.most_recent_fchv_training) !== 'undefined'; }, label: 'contact.fchv.refresher.training', value: contact.most_recent_fchv_training, filter: 'relativeDay', width: 6 },
  //Basic FCHV training: No Data
  { appliesToType: 'person', appliesIf: function () { return contact.role === 'chw' && (contact.most_recent_fchv_training === '' || typeof (contact.most_recent_fchv_training) === 'undefined'); }, label: 'contact.fchv.refresher.training', value: '-', width: 6 },
  //Alternate phone
  { appliesToType: 'person', appliesIf: function () { return contact.phone_alternate !== '' && typeof (contact.phone_alternate) !== 'undefined'; }, label: 'contact.alternate.phone', value: contact.phone_alternate, width: 6 },
  //Alternate phone - no data 
  { appliesToType: 'person', appliesIf: function () { return contact.phone_alternate === '' || typeof (contact.phone_alternate) === 'undefined'; }, label: 'contact.alternate.phone', value: '-', width: 6 },

  //HF details
  { appliesToType: 'g30_health_center', label: 'contact.hf_code', value: contact.hf_code, width: 6 },
  { appliesToType: 'g30_health_center', label: 'contact.ward', value: contact.ward, width: 6 },

  //FCHV Area details
  { appliesToType: 'g40_clinic', label: 'contact.place_id', value: contact.place_id, width: 6 },
  { appliesToType: 'g40_clinic', label: 'contact.phone.number', value: contact.contact && contact.contact.phone, width: 6, filter: 'phone' },

  //Notes
  { appliesToType: 'person', appliesIf: function () { return contact.notes !== '' && typeof (contact.notes) !== 'undefined'; }, label: 'contact.notes', value: contact.notes, width: 6 },
  //Notes : no data 
  { appliesToType: 'person', appliesIf: function () { return contact.notes === '' || typeof (contact.notes) === 'undefined'; }, label: 'contact.notes', value: '-', width: 6 },
  { appliesToType: 'person', label: 'contact.parent', value: lineage, filter: 'lineage' },
  { appliesToType: '!person', label: 'contact.notes', value: contact.notes, width: 12 },
  { appliesToType: '!person', appliesIf: function () { return contact.parent && lineage[0]; }, label: 'contact.parent', value: lineage, filter: 'lineage' },

];

const cards = [
  {
    label: 'contact.profile.pregnancy',
    appliesToType: ['report'],
    appliesIf: function (report) {
      if (!FORMS.PREGNANCY_REGISTRATION.includes(report.form)) {
        return false;
      }
      return isActivePregnancy(contact, reports, report);
    },
    fields: [
      {
        label: 'contact.profile.pregnancy.lmp_date',
        icon: 'icon-people-woman',
        value: (report) => getLMPDate(report).toISODate(),
        filter: 'simpleDate',
        width: 6
      },
      {
        label: 'contact.profile.pregnancy.edd',
        icon: 'icon-delivery',
        value: (report) => getEDD(report).toISODate(),
        filter: 'simpleDate',
        width: 6
      },
      {
        label: 'contact.profile.pregnancy.anc_visits',
        icon: 'icon-people-woman-pregnant',
        value: 'contact.profile.pregnancy.anc_visits.value',
        context: { count: getANCVisitCount(contact, reports) },
        translate: true,
        width: 6
      },
      {
        label: 'contact.profile.pregnancy.high_risk',
        icon: 'icon-anc-danger-sign',
        appliesIf: (report) => isHighRiskPregnancy(contact, reports, report),
        value: '',
        width: 6
      }
    ],
    modifyContext: function (ctx, report) {
      ctx.lmp_date = getLMPDate(report).toISODate();
      ctx.edd = getEDD(report).toISODate();
    }
  },
  {
    label: 'contact.profile.delivery',
    appliesToType: ['report'],
    appliesIf: function (report) {
      if (!FORMS.DELIVERY.includes(report.form)) {
        return false;
      }
      const deliveryDate = getDeliveryDate(report);
      return deliveryDate && deliveryDate.isValid && contact.type === 'person';
    },
    fields: [
      {
        label: 'contact.profile.delivery.delivery_date',
        icon: 'icon-delivery',
        value: (report) => getDeliveryDate(report).toISODate(),
        filter: 'simpleDate',
        width: 6
      }
    ],
    modifyContext: function (ctx, report) {
      ctx.delivery_date = getDeliveryDate(report).toISODate();
    }
  },
  {
    label: 'contact.profile.death.title',
    appliesToType: 'person',
    appliesIf: function () {
      return !isAlive(contact, reports);
    },
    fields: function () {
      const fields = [];
      let dateOfDeath;
      let placeOfDeath;
      let causeOfDeath;
      const deathReport = getNewestReport(reports, ['death_report']);
      if (deathReport) {
        const deathDetails = getField(deathReport, 'death_detail');
        if (deathDetails) {
          dateOfDeath = deathDetails.death_date;
          placeOfDeath = deathDetails.death_place;
          causeOfDeath = deathDetails.death_reason;
        }
      }
      else if (contact.date_of_death) {
        dateOfDeath = contact.date_of_death;
      }
      const ageAtDeath = getDurationBetweenTwoDatesNe(contact.date_of_birth, dateOfDeath);
      fields.push(
        { label: 'contact.profile.death.date', value: dateOfDeath ? dateOfDeath : 'contact.profile.value.unknown', filter: dateOfDeath ? 'simpleDate' : '', translate: dateOfDeath ? false : true, width: 6 },
        { label: 'contact.profile.death.age', value: ageAtDeath, width: 6 },
        { label: 'contact.profile.death.place', value: placeOfDeath ? placeOfDeath : 'contact.profile.value.unknown', translate: true, width: 6 },
        { label: 'contact.profile.death.cause', value: causeOfDeath ? causeOfDeath : 'contact.profile.value.unknown', translate: true, width: 6 }
      );
      return fields;
    }
  },
];

// Added to ensure CHW info is pulled into forms accessed via tasks
if (lineage[0] && lineage[0].contact) {
  context.chw_name = lineage[0].contact.name;
  context.chw_phone = lineage[0].contact.phone;
}

module.exports = {
  context: context,
  cards: cards,
  fields: fields
};
