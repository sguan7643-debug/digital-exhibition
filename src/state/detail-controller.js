import { reactive } from 'vue';

export function createDetailController(route, favorites, { name = '智能数据处理工具' } = {}) {
  let commentSequence = 0;
  const isFavorite=()=>favorites.isRouteFavorite?favorites.isRouteFavorite(route):favorites.has(route);
  const toggle=()=>favorites.toggleRouteFavorite?favorites.toggleRouteFavorite(route):(favorites.has(route)?(favorites.delete(route),false):(favorites.add(route),true));
  return reactive({
    route,
    name,
    favorites,
    announcement: '',
    commentDraft: '',
    comments: [],
    get favorite() {
      return isFavorite();
    },
    toggleFavorite() {
      const selected=toggle();
      this.announcement = `${name}：${selected ? '已收藏' : '已取消收藏'}`;
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
      this.comments.unshift({ id: `${route}-comment-${++commentSequence}`, text: comment });
      this.commentDraft = '';
      this.announcement = '评论已添加到本地演示列表';
      return true;
    }
  });
}
