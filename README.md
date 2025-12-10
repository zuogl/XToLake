# X to Lark - 优质帖子收藏助手

🚀 将 X(Twitter) 上的优质帖子一键保存到飞书多维表格，支持 AI 智能标签、Thread 检测、图片上传等功能。

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/x-to-lark)
[![Chrome](https://img.shields.io/badge/Chrome-v88+-green.svg)](https://www.google.com/chrome/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [安装配置](#安装配置)
- [使用说明](#使用说明)
- [配置指南](#配置指南)
- [多维表格字段](#多维表格字段)
- [AI 智能标签](#ai-智能标签)
- [故障排查](#故障排查)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [更新日志](#更新日志)
- [开源协议](#开源协议)

---

## 功能特性

### 核心功能
- 📥 **一键保存** - 在 X 帖子互动栏添加"保存到飞书"按钮
- 🤖 **AI 智能标签** - 使用 DeepSeek AI 自动生成相关标签
- 📊 **多维表格** - 数据保存到飞书多维表格，支持多种视图和筛选
- 🧵 **Thread 检测** - 自动识别 Thread（连续回复），支持保存完整 Thread
- 🔍 **去重检测** - 自动检查是否已保存，避免重复
- 📷 **图片保存** - 自动上传帖子图片到飞书
- 📈 **互动数据** - 保存浏览量、点赞数、转发数等统计数据
- 📚 **历史记录** - 查看最近保存的帖子，支持删除管理
- 🗑️ **同步删除** - 可选择删除历史记录时同步删除飞书中的记录

### 技术亮点
- ✨ 无缝集成到 X 原生界面
- ✨ 智能 Thread 检测（基于连续同作者帖子）
- ✨ 支持 Wiki 知识库和独立多维表格两种模式
- ✨ 实时 Toast 反馈
- ✨ 完整的错误处理和用户提示

---

## 快速开始

### 5 分钟上手指南

#### 第一步：安装扩展（1 分钟）

1. 下载或克隆本项目到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的"**开发者模式**"
4. 点击"**加载已解压的扩展程序**"
5. 选择项目根目录

#### 第二步：配置飞书（2 分钟）

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 记录 `App ID` 和 `App Secret`
4. 配置权限：
   - ✅ `bitable:app` - 查看、评论、编辑和管理多维表格
   - ✅ `wiki:wiki:readonly` - 获取知识空间信息（Wiki 模式需要）
   - ✅ `wiki:wiki.node:readonly` - 获取知识空间节点信息（Wiki 模式需要）
   - ✅ `im:message.file:send` - 上传图片或文件资源
5. 在插件中填写配置并测试连接

#### 第三步：配置多维表格（1 分钟）

**方式一：Wiki 知识库模式（推荐）**
1. 在飞书知识库中打开你的多维表格
2. 从 URL 中获取 Wiki Node Token：
   ```
   https://xxx.feishu.cn/wiki/[这里是node_token]
   ```
3. 在插件配置中选择"Wiki 知识库"模式
4. 填写 Wiki Node Token

**方式二：独立多维表格模式**
1. 打开独立的多维表格
2. 从 URL 中提取 App Token 和 Table ID：
   ```
   https://xxx.feishu.cn/base/[AppToken]?table=[TableID]
   ```
3. 在插件配置中选择"独立多维表格"模式
4. 填写 App Token 和 Table ID

#### 第四步：配置 AI（可选，1 分钟）

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册并创建 API Key
3. 在插件中勾选"启用 AI"并填写 API Key

#### 第五步：开始使用！

1. 访问 https://x.com 或 https://twitter.com
2. 找到任意帖子
3. 点击互动栏中的"**保存到飞书**"按钮
4. 完成！

---

## 安装配置

### 安装检查清单

运行以下命令验证所有文件已就位：

```bash
# 检查必需文件
ls -1 manifest.json README.md

# 检查源文件
ls -1 src/background/service-worker.js
ls -1 src/content/content.js src/content/content.css
ls -1 src/popup/popup.html src/popup/popup.js src/popup/popup.css
ls -1 src/utils/extractor.js src/utils/thread-detector.js

# 检查图标
ls -1 icons/icon*.png
```

### 配置飞书应用

#### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录后点击"创建企业自建应用"
3. 填写应用名称和描述
4. 创建成功后，记录 **App ID** 和 **App Secret**

#### 2. 配置应用权限

在应用管理页面：

1. 进入"权限管理"
2. 搜索并开启以下权限：
   - ✅ **查看、评论、编辑和管理多维表格** (`bitable:app`)
   - ✅ **获取知识空间信息** (`wiki:wiki:readonly`) - Wiki 模式需要
   - ✅ **获取知识空间节点信息** (`wiki:wiki.node:readonly`) - Wiki 模式需要
   - ✅ **上传图片或文件资源** (`im:message.file:send`)
3. 点击"发布版本" → "创建版本" → "申请发布"
4. 等待管理员审核通过（通常几分钟）

#### 3. 设置可用性

1. 进入"可用性"页面
2. 添加使用范围：
   - 添加你的知识库空间
   - 或选择"全部成员可用"

### 配置多维表格

#### Wiki 模式配置（推荐）

适用于知识库下的多维表格。

**获取 Wiki Node Token：**

打开你的多维表格页面，查看浏览器地址栏：

```
https://xxx.feishu.cn/wiki/IY2gwqoX4ix9S3xKWtlc5pednLf
                          ↑
                          这是 node_token
```

**在插件中配置：**

1. 点击浏览器工具栏的扩展图标
2. 在"多维表格来源"中选择 **"Wiki 知识库"**
3. 填写 **Wiki Node Token**: `IY2gwqoX4ix9S3xKWtlc5pednLf`
4. （可选）如果多维表格中有多个数据表，可以填写 Table ID
5. 点击"保存配置"

#### 独立模式配置

适用于独立创建的多维表格。

**从 URL 中获取参数：**

```
https://xxx.feishu.cn/base/V3FAbHqm7aBcdes1gfhijk?table=tblABCDefgh123456
                          ↑                         ↑
                          app_token                 table_id
```

**在插件中配置：**

1. 在"多维表格来源"中选择 **"独立多维表格"**
2. 填写 **多维表格 App Token**: `V3FAbHqm7aBcdes1gfhijk`
3. 填写 **Table ID**: `tblABCDefgh123456`
4. 点击"保存配置"

### 多维表格字段配置

插件会自动检测表格中的字段，只保存存在的字段。建议创建以下字段：

| 字段名 | 字段类型 | 是否必需 | 说明 |
|--------|---------|---------|------|
| 帖子ID | 文本 | 推荐 | 用于防重复 |
| 作者名称 | 文本 | 推荐 | X 用户名 |
| 作者账号 | 文本 | 推荐 | @username |
| 帖子内容 | 多行文本 | 必需 | 帖子正文 |
| 帖子链接 | URL | 必需 | 原帖链接 |
| 发帖时间 | 日期 | 推荐 | 发布时间 |
| 点赞数 | 数字 | 可选 | 互动数据 |
| 转帖数 | 数字 | 可选 | 互动数据 |
| 回复数 | 数字 | 可选 | 互动数据 |
| 浏览量 | 数字 | 可选 | 互动数据 |
| 书签数 | 数字 | 可选 | 互动数据 |
| AI标签 | 多选 | 可选 | AI 生成的标签 |
| 头像 | 附件 | 可选 | 用户头像 |
| 认证状态 | 单选 | 可选 | 已认证/未认证 |
| 图片 | 附件 | 可选 | 帖子图片 |

**注意：**
- 不需要创建所有字段，只创建你需要的
- 字段名称必须完全匹配（包括中文）
- 插件会自动跳过不存在的字段

### 配置 DeepSeek AI（可选）

如果需要 AI 自动打标签：

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 创建 API Key
4. 在插件中填入 API Key
5. 勾选"启用 AI 自动打标签"
6. 选择标签生成模式：
   - **保存前预览**（推荐）- 生成标签后显示预览，可手动编辑
   - **后台自动生成** - 保存后在后台生成标签，不阻塞保存流程

---

## 使用说明

### 保存单条帖子

1. 在 X 网站浏览帖子
2. 找到帖子下方的互动栏（回复、转发、喜欢、书签等按钮）
3. 点击新增的"**保存到飞书**"按钮（图标为 📄）
4. 如果启用了 AI 标签，会显示预览弹窗
5. 确认后保存到飞书多维表格

### 保存 Thread（主题串）

1. 当帖子是 Thread 时（作者连续多条回复）
2. 点击"保存到飞书"按钮
3. 弹窗会提示检测到 Thread，显示帖子数量
4. 选择：
   - **仅保存主帖** - 只保存第一条
   - **保存完整 Thread**（推荐）- 保存所有连续回复
5. 可勾选"记住选择"，下次不再询问
6. 点击"确定保存"

### 管理历史记录

#### 查看历史

1. 点击插件图标
2. 切换到"历史"选项卡
3. 查看最近 50 条保存记录
4. 点击"查看原帖"可跳转到 X 原帖

#### 删除历史记录

**单条删除：**
1. 在历史页面找到要删除的记录
2. 点击"删除"按钮
3. 如果在配置中启用了"删除飞书记录"，会同步删除飞书中的记录

**批量清空：**
1. 点击右上角的"一键清空"按钮
2. 确认操作
3. 如果启用了"删除飞书记录"，会批量删除飞书中的所有记录

**配置同步删除：**
1. 进入"配置"选项卡
2. 找到"删除设置"部分
3. 勾选"删除历史记录时同时删除飞书中的记录"
4. 点击"保存配置"

---

## 配置指南

### 常见问题

#### 1. 报错：FieldNameNotFound

**原因：** 多维表格中缺少必需字段

**解决：**
- 在多维表格中添加对应的字段
- 确保字段名称完全匹配（中文、大小写）
- 至少需要"帖子内容"和"帖子链接"字段

#### 2. 报错：请在插件配置中填写多维表格的参数

**原因：** 未配置 App Token、Table ID 或 Wiki Node Token

**解决：**
- Wiki 模式：从 URL 中获取 node_token 并填入
- 独立模式：从 URL 中获取 app_token 和 table_id 并填入

#### 3. 保存到了错误的表格

**原因：** App Token 或 Table ID 配置错误

**解决：**
- 检查是否复制了正确的多维表格 URL
- 确认 App Token 和 Table ID 没有多余的空格或字符
- 重新从目标表格的 URL 中复制

#### 4. 权限不足

**原因：** 飞书应用未授权给知识库

**解决：**
- 在飞书应用的"可用性"中添加知识库空间
- 确认应用已发布并通过审核
- 检查应用权限中是否开启了多维表格和知识库相关权限

#### 5. Wiki 节点不是多维表格

**原因：** 提供的 node_token 指向的不是多维表格

**解决：**
- 确认打开的是多维表格页面，而不是文档或电子表格
- 检查 URL 是否正确

---

## 多维表格字段

### 完整字段列表

| 字段名称 | 说明 | 类型 |
|---------|------|------|
| 帖子ID | Tweet 唯一标识 | 文本 |
| 作者名称 | 显示名称 | 文本 |
| 作者账号 | @username | 文本 |
| 头像 | 用户头像（自动上传） | 附件 |
| 认证状态 | 是否认证账号 | 单选 |
| 发帖时间 | 发布时间戳 | 日期 |
| 帖子内容 | 完整文本内容 | 多行文本 |
| 帖子链接 | 原帖链接 | URL |
| 图片 | 帖子图片（自动上传） | 附件 |
| 浏览量 | 观看次数 | 数字 |
| 回复数 | 评论数 | 数字 |
| 转帖数 | 转发数 | 数字 |
| 点赞数 | 喜欢数 | 数字 |
| 书签数 | 收藏数 | 数字 |
| **AI标签** | **AI 生成的分类标签** | **多选** |
| Thread数量 | Thread 帖子数 | 数字 |
| 是否引用 | 是否包含 Quote Tweet | 复选框 |
| 保存时间 | 插件保存时间 | 日期 |
| 备注 | 自定义备注 | 多行文本 |

### 推荐视图

在飞书多维表格中创建以下视图以更好地管理内容：

- **默认视图** - 按保存时间倒序，查看最新保存
- **标签视图** - 按 AI 标签分组，快速找到同类内容
- **作者视图** - 按作者账号分组，查看特定作者的帖子
- **热度视图** - 按点赞数+转发数排序，发现热门内容
- **Thread视图** - 筛选 Thread 数量>1 的记录

---

## AI 智能标签

### 标签维度

AI 会从以下维度分析帖子内容：

1. **主题分类** - 技术、产品、设计、商业、娱乐等
2. **具体领域** - AI、Web3、SaaS、移动开发等
3. **关键实体** - 公司名、产品名、技术名
4. **内容类型** - 教程、评测、新闻、观点等

### 标签示例

**帖子内容：**
> "试了一下谷歌无限画布产品 MixBoard 这次的更新，很强啊。PPT 生成同样支持自定义提示词..."

**AI 生成的标签：**
- `AI工具`
- `产品评测`
- `Google`
- `PPT生成`
- `办公效率`

### 标签模式

#### 模式一：保存前预览（推荐）

**流程：**
1. 点击"保存到飞书"
2. AI 生成标签（约 2-3 秒）
3. 显示预览弹窗
4. 可手动编辑标签
5. 确认后保存

**优点：**
- 可以审核和修改标签
- 提高标签准确性
- 用户参与感强

#### 模式二：后台自动生成

**流程：**
1. 点击保存 → 立即保存到飞书
2. 后台异步调用 AI 生成标签
3. 生成后自动更新飞书文档

**优点：**
- 不阻塞保存流程
- 用户体验流畅
- 适合批量操作

---

## 故障排查

### 调试指南

#### 查看错误日志

**打开 Service Worker 控制台：**

1. 打开 Chrome 扩展页面：`chrome://extensions/`
2. 找到 "X to Lark" 扩展
3. 点击"检查视图" → "Service Worker"
4. 会打开一个控制台窗口

**查看日志信息：**

重新尝试保存帖子后，在控制台中查看以下日志：

```
✅ 使用的配置: { appToken: "...", tableId: "..." }
✅ 获取字段URL: https://...
✅ 获取字段响应: { code: 0, data: {...} }
✅ 表格字段: ["帖子ID", "作者名称", ...]
✅ 准备保存的记录: { fields: {...} }
✅ 保存的字段数: 14
✅ 保存响应: { code: 0, data: {...} }
```

### 常见错误

#### 错误 1: NOTEXIST

```
Error: 保存失败: NOTEXIST
```

**原因：**
- App Token 不正确
- Table ID 不正确
- 表格已被删除

**解决方法：**

1. **检查 App Token 和 Table ID**
   - Wiki 模式：检查 Wiki Node Token 是否正确
   - 独立模式：从 URL 中重新提取 App Token 和 Table ID

2. **确认配置**
   - 打开扩展 popup
   - 检查配置信息
   - 确保没有多余的空格或换行

3. **重新加载扩展**
   - 在 `chrome://extensions/` 页面
   - 点击扩展的"刷新"按钮

#### 错误 2: 权限不足 (99991401)

```
Error: 没有权限访问此表格
```

**原因：** 飞书应用没有访问知识库/表格的权限

**解决方法：**

1. **检查应用权限**
   - 打开飞书开放平台
   - 进入你的应用
   - 点击"权限管理"
   - 确认已开启所需权限

2. **设置可用性**
   - 点击"可用性"
   - 添加使用范围（添加知识库空间）

3. **发布应用**
   - 如果修改了权限，需要重新发布
   - 点击"版本管理与发布"
   - 创建版本 → 申请发布

#### 错误 3: 按钮不显示

**检查：**
- 扩展是否已加载（`chrome://extensions/`）
- 页面是否已刷新（F5）
- 打开开发者工具（F12）查看 Console 是否有错误

**解决：**
```javascript
// 在 Console 中运行以下命令强制重新注入
location.reload();
```

#### 错误 4: AI 标签未生成

**检查：**
- "启用 AI"是否已勾选
- DeepSeek API Key 是否正确
- 账户是否有余额
- 网络是否能访问 DeepSeek API

**解决：**
1. 访问 https://platform.deepseek.com/ 检查账户状态
2. 重新生成 API Key
3. 更换标签模式为"后台自动生成"

---

## 项目结构

```
xGoodPostToLark/
├── manifest.json              # Chrome 扩展配置文件
├── README.md                  # 本文件
├── src/
│   ├── background/
│   │   └── service-worker.js  # 后台服务（处理 API 调用）
│   ├── content/
│   │   ├── content.js         # 页面注入逻辑
│   │   └── content.css        # 样式文件
│   ├── popup/
│   │   ├── popup.html         # 配置页面
│   │   ├── popup.css          # 配置页面样式
│   │   └── popup.js           # 配置页面逻辑
│   └── utils/
│       ├── extractor.js       # 数据提取工具
│       └── thread-detector.js # Thread 检测工具
└── icons/                     # 图标资源
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 技术栈

- **前端** - 原生 JavaScript (ES6+)
- **扩展框架** - Chrome Extension Manifest V3
- **AI 服务** - DeepSeek API
- **云服务** - 飞书开放平台 API
- **存储** - Chrome Storage API

---

## 更新日志

### v1.0.0 (2025-12-10)

#### 新增功能
- ✅ 支持保存帖子到飞书多维表格
- ✅ 支持 DeepSeek AI 智能标签
- ✅ 支持 Thread 检测和保存
- ✅ 支持图片上传
- ✅ 支持去重检测
- ✅ 支持历史记录查看
- ✅ 支持 Wiki 知识库和独立多维表格两种模式
- ✅ 支持删除历史记录并同步删除飞书记录

#### 技术优化
- ✅ 基于 aria-label 的高效数据提取
- ✅ 基于连续同作者的可靠 Thread 检测
- ✅ 完整的错误处理和用户提示
- ✅ 实时 Toast 反馈

---

## 注意事项

1. **API 限制** - 注意飞书 API 和 DeepSeek API 的调用频率限制
2. **隐私安全** - API Key 等敏感信息存储在本地，不会上传
3. **网络要求** - 需要稳定的网络连接访问飞书和 DeepSeek API
4. **DOM 变化** - X 网站可能更新 DOM 结构，导致提取失败，请及时反馈
5. **图片数量** - 每条帖子最多保存 9 张图片

---

## 开源协议

MIT License

Copyright (c) 2025 X to Lark Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 致谢

- [飞书开放平台](https://open.feishu.cn/)
- [DeepSeek](https://www.deepseek.com/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)

---

**Made with ❤️ by X to Lark Team**
