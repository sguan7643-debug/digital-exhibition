import { createVerifiedReadOperationContracts as createSharedContracts } from '../src/integration/operation-contract-schemas.js';

const identifier = Object.freeze({ type: 'string', minLength: 1, maxLength: 256 });
const text = Object.freeze({ type: 'string', minLength: 1, maxLength: 2048 });
const nullableText = Object.freeze({ anyOf: [Object.freeze({ type: 'string', maxLength: 2048 }), Object.freeze({ type: 'null' })] });
const countInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 1_000_000_000 });
const booleanValue = Object.freeze({ type: 'boolean' });
const stringValue = Object.freeze({ type: 'string', maxLength: 20_000 });
const stringList = Object.freeze({ type: 'array', items: stringValue, maxItems: 100 });
const objectList = Object.freeze({ type: 'array', items: Object.freeze({ type: 'object' }), maxItems: 100 });

export function createVerifiedReadOperationContracts() {
  const contracts = structuredClone(createSharedContracts());

  const dictionaryData = contracts['COM-005'].successSchema.properties.data;
  dictionaryData.required.push('baselineHash');
  dictionaryData.properties.baselineHash = { type: 'string', minLength: 1, maxLength: 256 };

  const contact = contracts['COM-004'];
  const contactData = contact.successSchema.properties.data;
  const contactItem = contactData.properties.items.items;
  contactItem.required.push('mobile', 'email');
  contactItem.properties.mobile = structuredClone(nullableText);
  contactItem.properties.email = structuredClone(nullableText);
  contactItem.properties.mobileMasked = structuredClone(nullableText);
  contactItem.properties.emailMasked = structuredClone(nullableText);

  const favoriteItem = contracts['FAV-002'].successSchema.properties.data.properties.items.items;
  contracts['FAV-002'].requestSchema.required = ['resourceType'];
  if (!favoriteItem.required.includes('favoriteVersion')) favoriteItem.required.push('favoriteVersion');
  favoriteItem.properties.favoriteVersion = { type: 'integer', minimum: 1, maximum: 1_000_000_000 };

  const materialData = structuredClone(contracts['MAT-002'].successSchema.properties.data);
  contracts['MAT-002'].successSchema.properties.data = materialData;
  materialData.properties.items = {
    type: 'array', maxItems: 100, items: {
      type: 'object', required: ['materialId', 'primaryFile', 'permissions'], properties: {
        materialId: structuredClone(identifier),
        materialCode: structuredClone(stringValue), name: structuredClone(text), summary: structuredClone(stringValue),
        materialType: structuredClone(stringValue), categoryIds: structuredClone(stringList), appTypeCodes: structuredClone(stringList),
        domainIds: structuredClone(stringList), relatedAppIds: structuredClone(stringList), status: structuredClone(stringValue),
        coverFileId: structuredClone(stringValue), coverUrl: structuredClone(stringValue), versionName: structuredClone(stringValue),
        publisherId: structuredClone(stringValue), publisherName: structuredClone(stringValue), publishedAt: structuredClone(stringValue),
        viewCount: structuredClone(countInteger), downloadCount: structuredClone(countInteger), isFavorite: structuredClone(booleanValue),
        descriptionHtml: structuredClone(stringValue), files: structuredClone(objectList), relatedApps: structuredClone(objectList),
        tags: structuredClone(stringList), createdAt: structuredClone(stringValue), updatedAt: structuredClone(stringValue),
        version: structuredClone(countInteger),
        primaryFile: {
          anyOf: [{
            type: 'object', required: ['fileId', 'fileName', 'mimeType', 'sizeBytes'], properties: {
              fileId: structuredClone(identifier), fileName: structuredClone(text), mimeType: structuredClone(text), sizeBytes: structuredClone(countInteger)
            }, additionalProperties: false
          }, { type: 'null' }]
        },
        permissions: {
          type: 'object', required: ['canView', 'canDownload', 'canMaintain'], properties: {
            canView: structuredClone(booleanValue), canDownload: structuredClone(booleanValue), canMaintain: structuredClone(booleanValue)
          }, additionalProperties: false
        }
      }, additionalProperties: false
    }
  };

  return Object.freeze(contracts);
}

