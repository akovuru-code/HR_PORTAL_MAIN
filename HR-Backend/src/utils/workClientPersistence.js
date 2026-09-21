function collectWorkClientDrafts(draftMap = {}, workDraft = null) {
  const drafts = [];

  if (draftMap.workClient?.payload) {
    drafts.push({
      payload: draftMap.workClient.payload,
      employerType: 'standalone',
      employerIndex: -1,
    });
  }

  for (const [tabKey, draftData] of Object.entries(draftMap)) {
    const match = /^workClient-(present|previous)-(\d+)$/.exec(tabKey);
    if (!match || !draftData?.payload) continue;

    drafts.push({
      payload: draftData.payload,
      employerType: match[1],
      employerIndex: Number(match[2]),
    });
  }

  if (!draftMap.workClient?.payload && workDraft?.payload) {
    const profileWork = workDraft.payload;
    drafts.push({
      payload: {
        clientInfo: profileWork.client?.name ? [profileWork.client] : [],
        vendorInfo: profileWork.vendor?.name ? [profileWork.vendor] : [],
        primeInfo: profileWork.primeVendor?.name ? [profileWork.primeVendor] : [],
      },
      employerType: 'standalone',
      employerIndex: -1,
    });
  }

  return drafts;
}

function buildWorkClientRows(workClientDrafts, employeeId) {
  const rows = [];

  for (const { payload = {}, employerType, employerIndex } of workClientDrafts) {
    const baseMeta = { employerType, employerIndex };

    for (const [detailIndex, client] of (Array.isArray(payload.clientInfo) ? payload.clientInfo : []).entries()) {
      const countryCode = client.managerPhoneCountryCode || client.countryCode || null;
      rows.push({
        employee_id: employeeId,
        type: 'client',
        name: client.name || null,
        address: client.address || null,
        start_date: client.startDate || null,
        end_date: client.endDate || null,
        work_email: client.workEmail || null,
        manager_email: client.managerEmail || null,
        manager_phone: client.managerPhone || null,
        remote_work_location: client.remoteWorkLocation || null,
        doc_file: client.docFiles || client.docFile || null,
        country_code: countryCode,
        meta: { ...baseMeta, detailIndex, managerPhoneCountryCode: countryCode },
      });
    }

    for (const [detailIndex, vendor] of (Array.isArray(payload.vendorInfo) ? payload.vendorInfo : []).entries()) {
      const countryCode = vendor.phoneCountryCode || vendor.countryCode || null;
      rows.push({
        employee_id: employeeId,
        type: 'vendor',
        name: vendor.name || null,
        address: vendor.address || null,
        start_date: vendor.startDate || null,
        end_date: vendor.endDate || null,
        contact_person: vendor.parentName || null,
        email: vendor.email || null,
        phone: vendor.phone || null,
        fein: vendor.finc || null,
        doc_file: vendor.docFiles || vendor.docFile || null,
        country_code: countryCode,
        meta: { ...baseMeta, detailIndex, phoneCountryCode: countryCode },
      });
    }

    for (const [detailIndex, prime] of (Array.isArray(payload.primeInfo) ? payload.primeInfo : []).entries()) {
      const countryCode = prime.phoneCountryCode || prime.countryCode || null;
      rows.push({
        employee_id: employeeId,
        type: 'primeVendor',
        name: prime.name || null,
        address: prime.address || null,
        start_date: prime.startDate || null,
        end_date: prime.endDate || null,
        email: prime.email || null,
        phone: prime.phone || null,
        doc_file: prime.docFiles || prime.docFile || null,
        country_code: countryCode,
        meta: { ...baseMeta, detailIndex, phoneCountryCode: countryCode },
      });
    }

    if (payload.clientVendorRadio !== undefined || payload.vendorRadios) {
      rows.push({
        employee_id: employeeId,
        type: 'radioStates',
        name: JSON.stringify({
          clientVendorRadio: payload.clientVendorRadio,
          clientPrimeRadio: payload.clientPrimeRadio,
          clientVendorName: payload.clientVendorName,
          clientPrimeVendorName: payload.clientPrimeVendorName,
          vendorRadios: payload.vendorRadios,
          vendorClientNames: payload.vendorClientNames,
          vendorPrimeNames: payload.vendorPrimeNames,
          primeClientNames: payload.primeClientNames,
          primeVendorNames: payload.primeVendorNames,
        }),
        meta: baseMeta,
      });
    }
  }

  return rows;
}

module.exports = { collectWorkClientDrafts, buildWorkClientRows };
