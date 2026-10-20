<p align="center">
  <img src="docs/hero.webp" width="100%" alt="借问众神明 · Oracle Inn：拱形金框窗里依次出现推门、魔法小屋、立体书、星幕帐篷、东方神龛和灵签">
</p>

<p align="center">
  <b>中文</b> · <a href="README.en.md">English</a> · <a href="https://oracle-inn.summercommences.com">在线体验</a>
</p>

# 借问众神明 · Oracle Inn

魔法小屋里的一本立体占卜书。推开悬在夜空里的门，走进一间堆满旅行纪念品的小屋；翻开桌上的书，每一页都会立起一间小小的占卜屋，走进去就能问一件心事。

> **温馨提示**
>
> - 这里的塔罗、掷筊、灵签等，是东西方民俗文化的趣味科普演示。所有结果都由程序随机生成，不具备预测功能。
> - 内容仅供休闲娱乐，不构成医疗、法律、投资或任何人生决策建议。
> - 神龛、签诗与牌面均为原创艺术创作，不代表任何宗教、庙宇或神明。
> - 页面不收集、不上传任何个人信息。
> - 命运掌握在自己手中，请保持理性，自主抉择。如果你正经历困扰，请向信任的人或专业人士寻求帮助。

## 现在能玩什么 · v1.0

- **进门**：一扇会开合的立体门，门后是旋涡星门。
- **魔法小屋**：可以随手点点的小物件，比如留声机放圆舞曲、橘猫的四种回应、壁炉、沙漏、太阳镜、望远镜、宝箱、许愿树。点过的物件，头顶的小星星会熄灭。
- **立体书**：六页场景，可以翻页、拖动换个角度看。
  - **第一页 · 星幕帐篷**（塔罗）：滑动洗牌、手动切牌，可选单张、圣三角或六芒十字牌阵，牌有正位和逆位。二十二张大阿卡纳是猫咪穆夏风，构图参考 1909 年的公版塔罗。
  - **第二页 · 东方神龛**（掷筊 · 灵签）：一座泉州式小庙。可以掷筊，也可以求签：摇签筒、掷筊请示，再到签诗柜里取出签诗。六十首签诗是新写的，不托名任何神明。
  - **第三至六页**（文房书案、维多利亚茶桌、月下窗台、北欧炉边）：还在装订中，每页先放了一个预告小玩法，分别是铜钱六爻、雷诺曼、灵摆和卢恩符文。
- 支持手机竖屏。

## 本地运行

页面会用 `fetch` 读取 3D 场景文件，所以要通过一个本地 HTTP 服务打开，不能直接双击 `index.html`：

```bash
cd public
python3 -m http.server 8000
```

然后打开 <http://localhost:8000/>。网址后面加上 `?dev`，会显示帧率并开放调试接口 `window.__book`。

## 目录

| 路径 | 内容 |
|---|---|
| `public/` | 部署的全部内容：`index.html`、牌组展示页 `cat-tarot-deck.html`、`404.html`、Cloudflare 的 `_headers`，以及网站图标（`favicon.*`、`apple-touch-icon.png`、`icon-*.png`、`site.webmanifest`）和链接分享图（`og-image.jpg` 1200×630、`share-square.jpg` 600×600） |
| `public/tent/`、`public/shrine/` | 两间小屋在 Blender 里烘焙好的实时 3D 场景（glTF 描述、base64 几何、两张光照贴图） |
| `public/deck/` | 二十二张牌面和牌背 |
| `src/` | 页面源码：外壳与样式、程序化绘制的贴图与牌面、场景、交互 |
| `build.py` | 把 `src/` 拼成 `public/index.html` |
| `blender/` | 帐篷与神龛的建模、贴图绘制、烘焙脚本，以及用到的贴图和开源字体子集 |
| `docs/` | README 头图与社交分享预览图 |

## 修改与构建

```bash
python3 build.py              # 生成 public/index.html
python3 build.py --check      # 另外生成 src/.check.mjs，可以再跑一次 node --check src/.check.mjs
```

## 3D 场景（可选）

两间小屋用 Blender 5.2 的 Python 脚本从零建模，在 Cycles 里烘焙成两张光照贴图：

```bash
blender/pipeline_tent_web.sh     # 星幕帐篷
blender/pipeline_shrine.sh       # 东方神龛（先用 blender/shrine_tex.py 和 Pillow 画好贴图）
```

流水线会自动给输出文件换一个带时间戳的新名字（避免浏览器缓存旧场景），更新 `src/_rooms.js` 里的文件名并重新构建页面。导出的 JPEG 会去掉元数据。

## 部署

`public/` 是一个纯静态网站，不需要构建步骤。

- **Cloudflare Pages**：连接这个仓库，构建命令留空，输出目录填 `public`，然后在 Custom domains 里绑定子域名。
- **Cloudflare Workers**：仓库里有 `wrangler.jsonc`，运行 `npx wrangler deploy` 即可发布 `public/`。

`public/_headers` 设置了内容安全策略（只允许 jsDelivr 和 Google Fonts 这两个外部来源），并让带版本号的场景文件长期缓存。

## 依赖与致谢

- [three.js](https://threejs.org/) r169（MIT），从 jsDelivr 加载。
- 网页字体来自 Google Fonts，都是 SIL Open Font License：Noto Serif SC、Long Cang、LXGW WenKai TC（补「筊」字）、Cormorant Garamond。
- 神龛的匾额、对联、签号与挂轴题字，用开源的 Noto Serif TC（思源宋体）和 LXGW WenKai TC（霞鹜文楷）绘制，字体子集和许可文本在 `blender/fonts/`。
- 塔罗牌的构图与象征参考 1909 年 Pamela Colman Smith 绘制的经典塔罗（公有领域），画面是重新绘制的。
- 页面里所有的贴图、牌面和场景都是用代码画出来，或用 Blender 脚本建出来的，没有使用外部图片素材。

## 隐私

- 不使用 Cookie，不做统计，不向任何服务器发送你的问题或占卜结果。
- 页面会从 Google Fonts 和 jsDelivr 加载字体和 three.js，这两个服务会看到你的 IP 地址。
- 「请占卜师细读」（AI 解读）只在 Claude 的 Artifact 里可用：由查看者自己的 Claude 账号生成，页面不保存任何内容。在普通网页里，这个按钮和写问题的输入框都不会出现。

## 许可

- 代码：[MIT](LICENSE)。
- 美术与文字内容（牌面、场景、贴图、头图、签诗与文案）：© 2026 SummerPapaya，保留所有权利。详见 [LICENSE-ASSETS.md](LICENSE-ASSETS.md)。

## 版本

- **v1.0.0**（2026-10）：第一版。魔法小屋、立体书六页、星幕帐篷（塔罗）和东方神龛（掷筊 · 灵签）完整可玩，其余四页有预告。
