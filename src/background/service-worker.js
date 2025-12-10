/**
 * Background Service Worker
 * 处理飞书API和DeepSeek AI调用
 */

console.log('X to Lark Service Worker 已启动');

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTweet') {
    handleSaveTweet(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }

  if (request.action === 'openPopup') {
    chrome.action.openPopup();
    sendResponse({ success: true });
    return false;
  }
});

/**
 * 处理保存帖子
 */
async function handleSaveTweet(data) {
  try {
    const { tweet, tags: userTags, thread } = data;

    // 1. 获取配置
    const config = await chrome.storage.sync.get([
      'feishuAppId',
      'feishuAppSecret',
      'bitableSource',
      'wikiNodeToken',
      'bitableAppToken',
      'bitableTableId',
      'aiEnabled',
      'aiApiKey',
      'aiProvider'
    ]);

    // 2. 获取飞书Token
    const feishuToken = await getFeishuToken(config.feishuAppId, config.feishuAppSecret);

    // 3. 生成AI标签（如果启用）
    let tags = userTags || [];
    if (config.aiEnabled && config.aiApiKey) {
      try {
        const aiTags = await generateAITags(tweet, config);
        tags = [...new Set([...tags, ...aiTags])]; // 合并并去重
      } catch (error) {
        console.error('AI标签生成失败:', error);
        // 继续保存，不中断流程
      }
    }

    // 4. 保存到飞书多维表格
    let tweetToSave = { ...tweet };

    // 如果是Thread，合并内容
    if (thread && thread.length > 1) {
      tweetToSave = mergeThreadData(tweet, thread);
    }

    const result = await saveToFeishuBitable(
      feishuToken,
      tweetToSave,
      tags,
      config
    );

    // 5. 记录历史
    await saveToHistory(tweetToSave, tags, result);

    return {
      success: true,
      bitableUrl: result.bitableUrl,
      recordId: result.recordId,
      tags: tags
    };

  } catch (error) {
    console.error('保存失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取飞书Token
 */
async function getFeishuToken(appId, appSecret) {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`获取飞书Token失败: ${data.msg}`);
  }

  return data.tenant_access_token;
}

/**
 * 生成AI标签（DeepSeek）
 */
async function generateAITags(tweet, config) {
  // 检查缓存
  const cached = await checkTagCache(tweet.content.text);
  if (cached) {
    console.log('使用缓存的标签');
    return cached;
  }

  const prompt = buildTagPrompt(tweet);

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.aiApiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容标签生成助手。请根据X(Twitter)帖子内容生成准确、简洁的中文标签。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API错误: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // 缓存结果
  await cacheTagResult(tweet.content.text, result.tags);

  return result.tags || [];
}

/**
 * 构建AI标签提示词
 */
function buildTagPrompt(tweet) {
  return `
你是一个专业的内容分类助手。请分析以下X(Twitter)帖子内容，生成相关标签。

# 帖子信息
作者: ${tweet.author.name} (@${tweet.author.username})
内容: ${tweet.content.text}
图片: ${tweet.content.images.length > 0 ? '包含图片' : '无'}
视频: ${tweet.content.videos.length > 0 ? '包含视频' : '无'}
互动: ${tweet.metrics.likes}喜欢, ${tweet.metrics.retweets}转发

# 标签要求
1. 生成3-5个最相关的标签
2. 标签应该简洁（2-4个字）
3. 优先使用中文
4. 包含以下维度:
   - 主题分类 (技术/产品/设计/商业/娱乐等)
   - 具体领域 (AI/Web3/SaaS/移动开发等)
   - 关键实体 (公司名/产品名/技术名)
   - 内容类型 (教程/评测/新闻/观点等)

# 输出格式
请以JSON格式返回:
{
  "tags": ["标签1", "标签2", "标签3"],
  "confidence": 0.85
}
`;
}

/**
 * 保存到飞书多维表格
 */
async function saveToFeishuBitable(token, tweet, tags, config) {
  // 获取或创建多维表格
  const { appToken, tableId } = await getOrCreateBitable(token, config);

  console.log('使用的配置:', { appToken, tableId });

  // 获取表格字段信息
  const tableFields = await getTableFields(token, appToken, tableId);

  if (tableFields.size === 0) {
    throw new Error('无法获取表格字段，请检查：\n1. App Token 和 Table ID 是否正确\n2. 飞书应用是否有访问此表格的权限');
  }

  console.log('表格字段:', Array.from(tableFields));

  // 检查重复
  const isDuplicate = await checkDuplicateRecord(token, appToken, tableId, tweet.id);
  if (isDuplicate) {
    throw new Error('该帖子已保存，请勿重复保存');
  }

  // 确保标签选项存在
  await ensureTagOptions(token, appToken, tableId, tags);

  // 上传头像（如果有）
  let avatarToken = null;
  if (tweet.author.avatarUrl) {
    const avatarTokens = await uploadImages(token, appToken, [tweet.author.avatarUrl]);
    if (avatarTokens.length > 0) {
      avatarToken = avatarTokens[0];
    }
  }

  // 上传帖子图片（如果有）
  let imageTokens = [];
  if (tweet.content.images.length > 0) {
    imageTokens = await uploadImages(token, appToken, tweet.content.images);
  }

  // 定义所有可能的字段映射
  const fieldMapping = {
    '帖子ID': tweet.id || '',
    '作者名称': tweet.author.name,
    '作者账号': tweet.author.username,
    '认证状态': tweet.author.isVerified ? '已认证' : '未认证',
    '发帖时间': new Date(tweet.timestamp).getTime(),
    '帖子内容': tweet.content.text,
    '帖子链接': tweet.url,
    '浏览量': tweet.metrics.views,
    '回复数': tweet.metrics.replies,
    '转帖数': tweet.metrics.retweets,
    '点赞数': tweet.metrics.likes,
    '书签数': tweet.metrics.bookmarks,
    'AI标签': tags
  };

  // 添加头像（如果有）
  if (avatarToken) {
    fieldMapping['头像'] = [avatarToken];
  }

  // 添加图片（如果有）
  if (imageTokens.length > 0) {
    fieldMapping['图片'] = imageTokens;
  }

  // 只保存表格中存在的字段
  const record = {
    fields: {}
  };

  for (const [fieldName, fieldValue] of Object.entries(fieldMapping)) {
    if (tableFields.has(fieldName)) {
      record.fields[fieldName] = fieldValue;
    }
  }

  console.log('准备保存的记录:', record);
  console.log('保存的字段数:', Object.keys(record.fields).length);

  // 添加记录
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    }
  );

  const data = await response.json();
  console.log('保存响应:', data);

  if (data.code !== 0) {
    let errorMsg = `保存到飞书失败 (${data.code}): ${data.msg}`;

    if (data.code === 99991663 || data.msg.includes('NOTEXIST')) {
      errorMsg = 'App Token 或 Table ID 不存在，请检查配置是否正确';
    } else if (data.code === 99991401) {
      errorMsg = '没有权限访问此表格，请在飞书应用的"可用性"中添加知识库空间';
    } else if (data.msg.includes('FieldNameNotFound')) {
      errorMsg = '表格中缺少必需的字段，请在表格中添加：帖子内容、帖子链接等字段';
    }

    throw new Error(errorMsg);
  }

  return {
    recordId: data.data.record.record_id,
    bitableUrl: `https://example.feishu.cn/base/${appToken}?table=${tableId}`
  };
}

/**
 * 获取多维表格配置
 */
async function getOrCreateBitable(token, config) {
  // Wiki 节点模式
  if (config.bitableSource === 'wiki') {
    if (!config.wikiNodeToken) {
      throw new Error('请在插件配置中填写 Wiki Node Token');
    }

    console.log('Wiki 模式，Node Token:', config.wikiNodeToken);

    // 获取 Wiki 节点信息，从中提取 obj_token 和 obj_type
    const nodeInfo = await getWikiNodeInfo(token, config.wikiNodeToken);

    // 检查是否为多维表格 (obj_type 可能是字符串 "bitable" 或数字 8)
    if (nodeInfo.obj_type !== 'bitable' && nodeInfo.obj_type !== 8) {
      throw new Error(`此 Wiki 节点不是多维表格 (类型: ${nodeInfo.obj_type})，请确认 URL 是否正确`);
    }

    console.log('从 Wiki 节点获取到 obj_token:', nodeInfo.obj_token);

    // 如果没有 tableId，获取第一个表格
    let tableId = config.bitableTableId;
    if (!tableId) {
      console.log('未配置 Table ID，获取第一个表格');
      tableId = await getFirstTableId(token, nodeInfo.obj_token);
    }

    // 使用 obj_token 作为 app_token
    return {
      appToken: nodeInfo.obj_token,
      tableId: tableId
    };
  }

  // 独立多维表格模式
  if (!config.bitableAppToken || !config.bitableTableId) {
    throw new Error('请在插件配置中填写多维表格的 App Token 和 Table ID');
  }

  return {
    appToken: config.bitableAppToken,
    tableId: config.bitableTableId
  };
}

/**
 * 获取 Wiki 节点信息
 */
async function getWikiNodeInfo(token, nodeToken) {
  try {
    const url = `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${nodeToken}`;
    console.log('获取 Wiki 节点信息:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Wiki 节点信息响应:', data);

    if (data.code !== 0) {
      let errorMsg = `获取 Wiki 节点信息失败 (${data.code}): ${data.msg}`;

      if (data.code === 99991663) {
        errorMsg = 'Wiki Node Token 不存在，请检查配置';
      } else if (data.code === 99991401) {
        errorMsg = '没有权限访问此 Wiki 节点，请在飞书应用中添加知识库权限';
      }

      throw new Error(errorMsg);
    }

    const node = data.data.node;

    return {
      obj_token: node.obj_token,
      obj_type: node.obj_type,  // 可能是字符串 "bitable"/"doc"/"sheet" 或数字 8/3/16
      table_id: node.table_id || null
    };
  } catch (error) {
    console.error('获取 Wiki 节点信息失败:', error);
    throw error;
  }
}

/**
 * 获取多维表格的第一个表格ID
 */
async function getFirstTableId(token, appToken) {
  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = await response.json();
    console.log('获取表格列表响应:', data);

    if (data.code !== 0) {
      throw new Error(`获取表格列表失败: ${data.msg}`);
    }

    if (!data.data.items || data.data.items.length === 0) {
      throw new Error('多维表格中没有任何数据表');
    }

    return data.data.items[0].table_id;
  } catch (error) {
    console.error('获取第一个表格ID失败:', error);
    throw error;
  }
}

/**
 * 获取表格字段信息
 */
async function getTableFields(token, appToken, tableId) {
  try {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`;
    console.log('获取字段URL:', url);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('获取字段响应:', data);

    if (data.code !== 0) {
      let errorMsg = `获取字段信息失败 (${data.code}): ${data.msg}`;

      if (data.code === 99991663) {
        errorMsg = 'App Token 或 Table ID 不存在，请检查配置';
      } else if (data.code === 99991401) {
        errorMsg = '没有权限访问此表格，请在飞书应用中添加表格访问权限';
      }

      throw new Error(errorMsg);
    }

    // 返回字段名称的Set
    const fieldNames = new Set();
    if (data.data && data.data.items) {
      data.data.items.forEach(field => {
        fieldNames.add(field.field_name);
      });
    }

    return fieldNames;
  } catch (error) {
    console.error('获取表格字段失败:', error);
    throw error;
  }
}

/**
 * 检查重复记录
 */
async function checkDuplicateRecord(token, appToken, tableId, tweetId) {
  if (!tweetId) return false;

  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            conjunction: 'and',
            conditions: [
              {
                field_name: '帖子ID',
                operator: 'is',
                value: [tweetId]
              }
            ]
          }
        })
      }
    );

    const data = await response.json();
    return data.data?.items?.length > 0;
  } catch (error) {
    console.error('检查重复失败:', error);
    return false;
  }
}

/**
 * 确保标签选项存在
 */
async function ensureTagOptions(token, appToken, tableId, tags) {
  // 实现省略（与plan.md中的实现相同）
  // 这里简化处理，实际使用时需要完整实现
}

/**
 * 上传图片到飞书云文档(用于多维表格附件字段)
 */
async function uploadImages(token, appToken, imageUrls) {
  const imageTokens = [];

  for (const imageUrl of imageUrls.slice(0, 9)) { // 最多9张图
    try {
      console.log('开始上传图片:', imageUrl);

      // 1. 下载图片
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error('下载图片失败:', imageResponse.status);
        continue;
      }

      const imageBlob = await imageResponse.blob();
      console.log('图片大小:', imageBlob.size, 'bytes');

      // 2. 准备上传表单
      const formData = new FormData();
      formData.append('file_name', `image_${Date.now()}.jpg`);
      formData.append('parent_type', 'bitable_image');
      formData.append('parent_node', appToken);  // 使用 appToken 作为 parent_node
      formData.append('size', imageBlob.size.toString());
      formData.append('file', imageBlob, 'image.jpg');

      // 3. 上传到飞书云文档
      const uploadResponse = await fetch(
        'https://open.feishu.cn/open-apis/drive/v1/medias/upload_all',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const uploadData = await uploadResponse.json();
      console.log('上传响应:', uploadData);

      if (uploadData.code === 0 && uploadData.data && uploadData.data.file_token) {
        imageTokens.push({
          file_token: uploadData.data.file_token
        });
        console.log('图片上传成功:', uploadData.data.file_token);
      } else {
        console.error('图片上传失败:', uploadData);
      }
    } catch (error) {
      console.error('图片上传异常:', error);
    }
  }

  console.log('最终上传的图片tokens:', imageTokens);
  return imageTokens;
}

/**
 * 合并Thread数据
 */
function mergeThreadData(mainTweet, threadTweets) {
  const mergedContent = threadTweets.map(t => t.content.text).join('\n\n---\n\n');

  return {
    ...mainTweet,
    content: {
      ...mainTweet.content,
      text: mergedContent
    },
    threadCount: threadTweets.length
  };
}

/**
 * 缓存标签结果
 */
async function cacheTagResult(content, tags) {
  const cache = await chrome.storage.local.get('tagCache') || {};
  const hash = await hashString(content);

  cache[hash] = {
    tags: tags,
    timestamp: Date.now(),
    expiresIn: 7 * 24 * 60 * 60 * 1000
  };

  await chrome.storage.local.set({ tagCache: cache });
}

/**
 * 检查标签缓存
 */
async function checkTagCache(content) {
  const cache = await chrome.storage.local.get('tagCache');
  if (!cache.tagCache) return null;

  const hash = await hashString(content);
  const cached = cache.tagCache[hash];

  if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
    return cached.tags;
  }

  return null;
}

/**
 * 简单hash函数
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 保存到历史记录
 */
async function saveToHistory(tweet, tags, result) {
  const history = await chrome.storage.local.get('saveHistory');
  const historyList = history.saveHistory || [];

  historyList.unshift({
    tweet: {
      id: tweet.id,
      author: tweet.author,
      content: tweet.content.text.substring(0, 100),
      url: tweet.url
    },
    tags: tags,
    savedAt: Date.now(),
    recordId: result.recordId
  });

  // 只保留最近50条
  if (historyList.length > 50) {
    historyList.pop();
  }

  await chrome.storage.local.set({ saveHistory: historyList });
}
