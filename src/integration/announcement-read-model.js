const TONE_BY_CATEGORY = Object.freeze({
  '平台公告': 'red', '系统公告': 'red', '应用上线': 'green', '活动通知': 'orange', '系统通知': 'purple'
});

export function mapRemoteAnnouncement(item) {
  const publishedAt = String(item.publishedAt || '');
  const date = publishedAt.slice(0, 10);
  const time = date ? `${date.slice(5)} ${publishedAt.slice(11, 16) || '00:00'}` : '';
  return Object.freeze({
    id: item.announcementId || item.id,
    type: item.category || '公告',
    title: item.title,
    copy: item.summary || '',
    date,
    time,
    read: null,
    status: item.status || '',
    pinned: item.pinned === true,
    tone: TONE_BY_CATEGORY[item.category] || 'blue',
    hasDetail: false
  });
}
