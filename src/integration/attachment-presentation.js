function text(value) {
  return String(value ?? '').trim();
}

function typeLabel(fileName, mimeType) {
  const extension = text(fileName).split('.').pop();
  if (extension && extension !== fileName) return extension.toUpperCase().slice(0, 12);
  const subtype = text(mimeType).split('/').pop();
  return subtype ? subtype.toUpperCase().slice(0, 12) : '文件';
}

export function normalizeAttachmentPresentation(file = {}, index = 0) {
  const name = text(file.fileName || file.name) || `附件 ${index + 1}`;
  const mimeType = text(file.mimeType || file.type);
  const size = Number(file.sizeBytes ?? file.size);
  return Object.freeze({
    key: text(file.fileId || file.attachmentId || file.id) || `${name}-${index}`,
    name,
    type: typeLabel(name, mimeType),
    mimeType,
    sizeBytes: Number.isFinite(size) && size >= 0 ? size : null,
    uploadedAt: text(file.uploadedAt || file.createdAt || file.updatedAt),
    previewable: Boolean(file.previewable),
    downloadable: file.downloadable !== false
  });
}

