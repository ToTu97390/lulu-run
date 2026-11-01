# 噜噜快跑 · Lulu Run

温暖可爱的英文单词打字跑酷游戏，支持看词与听写、多场景背景、单词朗读和完成鼓励动画。

## 试玩操作

使用电脑浏览器打开试玩链接，选择场景和词库后开始。输入英文单词前进，Tab 重听，空格暂停。设置与游戏记录保存在当前浏览器中。

## 在 GitHub Pages 发布

将本目录中的全部文件（包括 assets 和 .github）上传到公开仓库的 main 分支。

在仓库 Settings → Pages → Build and deployment 中将 Source 设为 GitHub Actions。然后在 Actions 中运行 Publish Lulu Run，或向 main 推送更新。

部署成功后，Settings → Pages 会显示公开试玩链接，通常为 https://你的用户名.github.io/仓库名/。

## 本地运行

在本目录运行 `python -m http.server 8000`，然后打开 http://localhost:8000/。

网页、图片、视频和单词发音均随项目提供，无需构建。请保留完整 assets 目录。仓库公开后，代码和随附素材也会公开；本仓库不额外授予素材转载许可。
