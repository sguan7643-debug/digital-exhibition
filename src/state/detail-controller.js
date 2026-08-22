import { reactive } from 'vue';

export function createDetailController(route, favorites, { name = '智能数据处理工具' } = {}) {
  return reactive({
    route,
    name,
    favorites,
    announcement: '',
    commentDraft: '',
    comments: [],
    get favorite() {
      return favorites.has(route);
    },
    toggleFavorite() {
      this.favorite ? favorites.delete(route) : favorites.add(route);
      this.announcement = `${name}：${this.favorite ? '已收藏' : '已取消收藏'}`;
    },
    apply(action) {
      this.announcement = `${name}：${action}已在本地演示中登记`;
    },
    mockDownload(fileName) {
      this.announcement = `${fileName}：演示环境不提供真实下载`;
    },
    watchTraining(title) {
      this.announcement = `${title}：演示环境不播放直播或远程视频`;
    },
    submitComment() {
      const comment = this.commentDraft.trim();
      if (!comment) {
        this.announcement = '请输入评论内容';
        return false;
      }
      this.comments.unshift(comment);
      this.commentDraft = '';
      this.announcement = '评论已添加到本地演示列表';
      return true;
    }
  });
}
