# backgrounds

将授权素材放在此目录，再在 stories/foundation/assets.json 中登记稳定素材 ID 与相对路径。不要把私人资料、密钥或未经授权的照片放入源码。

已预留两张全体玩家共用的作品素材：

- `entry-background.pic.jpg`：进入游戏时的整页背景。建议横图 1920×1080 或更大，主体放中间；手机端会居中裁切。页面文字和表单由界面叠加，不必把文字做进照片。
- `phone-wallpaper.pic.jpg`：手机桌面及锁屏壁纸。建议竖图 1080×1920，顶部时间区尽量简洁。

两张图均已在 assets.json 和 project.json 绑定。放好后运行 `npm run author:build`；缺图继续使用原有样式，不阻断游戏。实际为 PNG/WebP 的文件请保留真实后缀，并同步修改 assets.json 的 file 字段。

玩家自己的头像通过进入页“选择你的头像”从相册选择，不需要放进这个目录，不上传服务器。继续旧存档时点击“保存设定并继续故事”，不要点“以新设定开始”。
