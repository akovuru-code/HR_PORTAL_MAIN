const {
  collectWorkClientDrafts,
  buildWorkClientRows,
} = require('../src/utils/workClientPersistence');

const detailPayload = (suffix) => ({
  clientInfo: [{
    name: `Client ${suffix}`,
    address: `Client address ${suffix}`,
    workEmail: `work-${suffix}@example.com`,
    managerEmail: `manager-${suffix}@example.com`,
    managerPhone: '9876543210',
    managerPhoneCountryCode: '+91',
    remoteWorkLocation: `Remote ${suffix}`,
    docFile: { url: `/client-${suffix}.pdf`, originalName: `client-${suffix}.pdf` },
  }],
  vendorInfo: [{
    name: `Vendor ${suffix}`,
    address: `Vendor address ${suffix}`,
    email: `vendor-${suffix}@example.com`,
    phone: '1234567890',
    phoneCountryCode: '+1',
    finc: `FEIN-${suffix}`,
    docFile: { url: `/vendor-${suffix}.pdf`, originalName: `vendor-${suffix}.pdf` },
  }],
  primeInfo: [{
    name: `Prime ${suffix}`,
    address: `Prime address ${suffix}`,
    email: `prime-${suffix}@example.com`,
    phone: '5555555555',
    phoneCountryCode: '+44',
    docFile: { url: `/prime-${suffix}.pdf`, originalName: `prime-${suffix}.pdf` },
  }],
  clientVendorRadio: 'Yes',
  vendorRadios: ['Yes'],
});

describe('work client persistence mapping', () => {
  it('keeps all present and previous employer fields and document metadata isolated', () => {
    const draftMap = {
      profileWork: { payload: {} },
      'workClient-present-0': { payload: detailPayload('present') },
      'workClient-previous-0': { payload: detailPayload('previous') },
    };

    const drafts = collectWorkClientDrafts(draftMap, draftMap.profileWork);
    const rows = buildWorkClientRows(drafts, 42);

    const presentClient = rows.find((row) =>
      row.type === 'client' && row.meta.employerType === 'present');
    expect(presentClient).toMatchObject({
      employee_id: 42,
      address: 'Client address present',
      work_email: 'work-present@example.com',
      manager_email: 'manager-present@example.com',
      manager_phone: '9876543210',
      remote_work_location: 'Remote present',
      country_code: '+91',
      doc_file: { url: '/client-present.pdf', originalName: 'client-present.pdf' },
      meta: { employerType: 'present', employerIndex: 0 },
    });

    const previousVendor = rows.find((row) =>
      row.type === 'vendor' && row.meta.employerType === 'previous');
    expect(previousVendor).toMatchObject({
      address: 'Vendor address previous',
      email: 'vendor-previous@example.com',
      phone: '1234567890',
      fein: 'FEIN-previous',
      country_code: '+1',
      doc_file: { url: '/vendor-previous.pdf' },
      meta: { employerType: 'previous', employerIndex: 0 },
    });

    const previousPrime = rows.find((row) =>
      row.type === 'primeVendor' && row.meta.employerType === 'previous');
    expect(previousPrime).toMatchObject({
      address: 'Prime address previous',
      email: 'prime-previous@example.com',
      phone: '5555555555',
      country_code: '+44',
      doc_file: { url: '/prime-previous.pdf' },
    });

    expect(rows.filter((row) => row.type === 'radioStates')).toHaveLength(2);
  });

  it('retains legacy standalone profile summary data when no detailed draft exists', () => {
    const workDraft = {
      payload: {
        client: { name: 'Standalone client', startDate: '2026-01-01' },
      },
    };
    const drafts = collectWorkClientDrafts({ profileWork: workDraft }, workDraft);
    const rows = buildWorkClientRows(drafts, 7);

    expect(rows).toContainEqual(expect.objectContaining({
      employee_id: 7,
      type: 'client',
      name: 'Standalone client',
      start_date: '2026-01-01',
      meta: expect.objectContaining({ employerType: 'standalone', employerIndex: -1 }),
    }));
  });
});
