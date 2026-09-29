const APPLICATION_TYPE_FALLBACKS = Object.freeze({ T005: '海能Work应用' });
const BUSINESS_DOMAIN_FALLBACKS = Object.freeze({
  BD001: '生产运营',
  BD002: '综合管理',
  BD003: '供应链管理',
  BD004: '经营分析',
  BD005: '数字化办公'
});

function clean(value, maximum = 256) {
  return String(value || '').trim().slice(0, maximum);
}

function dictionaryLabel(items, value) {
  const normalized = clean(value);
  return clean((Array.isArray(items) ? items : []).find(item => clean(item?.value) === normalized)?.label);
}

export function createFeishuOnboardingReferenceResolver({ readService, client } = {}) {
  async function resolve(application = {}, session = {}) {
    const type = clean(application.type).toUpperCase();
    const domain = clean(application.domain).toUpperCase();
    const userId = clean(application.users);
    let applicationTypeName = clean(application.applicationTypeName) || APPLICATION_TYPE_FALLBACKS[type] || '';
    let businessDomainName = clean(application.businessDomainName) || BUSINESS_DOMAIN_FALLBACKS[domain] || '';
    let authorizedUserName = clean(application.authorizedUserName);

    const tasks = [];
    if (readService?.execute && (!applicationTypeName || !businessDomainName)) {
      tasks.push(readService.execute('COM-005', {
        dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN'], includeDisabled: false
      }, { identity: session.identity || null }).then(result => {
        const dictionaries = result?.data?.itemsByType || {};
        applicationTypeName ||= dictionaryLabel(dictionaries.APPLICATION_TYPE, type);
        businessDomainName ||= dictionaryLabel(dictionaries.BUSINESS_DOMAIN, domain);
      }).catch(() => {}));
    }
    if (client?.getContactUser && userId && !authorizedUserName) {
      tasks.push(client.getContactUser(userId).then(user => {
        authorizedUserName = clean(user?.displayName || user?.name || user?.userId);
      }).catch(() => {}));
    }
    await Promise.all(tasks);
    return Object.freeze({ applicationTypeName, businessDomainName, authorizedUserName });
  }

  return Object.freeze({ resolve });
}

