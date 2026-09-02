export function mapRemoteApp(item) {
  return Object.freeze({
    id: item.appId || item.id,
    image: item.iconName || 'tool-logo',
    name: item.name,
    category: item.typeName || item.categoryName || '其他应用',
    scene: item.sceneNames?.[0] || item.domainName || '',
    domain: item.domainName || '',
    tag: item.categoryName || item.keywords?.[0] || item.typeName || '应用',
    description: item.summary || '',
    usage: Number(item.usageCount) || 0,
    favorites: Number(item.favoriteCount) || 0,
    department: item.responsibleOrgName || '',
    owner: item.ownerName || '',
    developerDepartment: item.developerOrgName || '',
    developer: item.developerName || '',
    route: item.detailPath || '/apps/tool-001'
  });
}
