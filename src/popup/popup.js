/**
 * Popup JavaScript
 */

// Tab切换
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // 切换tab按钮状态
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 切换tab内容
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // 如果切换到历史tab，加载历史记录
    if (tabName === 'history') {
      loadHistory();
    }
  });
});

// 加载配置
async function loadConfig() {
  const config = await chrome.storage.sync.get([
    'feishuAppId',
    'feishuAppSecret',
    'bitableSource',
    'wikiNodeToken',
    'bitableAppToken',
    'bitableTableId',
    'aiEnabled',
    'aiProvider',
    'aiApiKey',
    'aiTagMode',
    'deleteFromFeishu'
  ]);

  // 填充表单
  document.getElementById('feishuAppId').value = config.feishuAppId || '';
  document.getElementById('feishuAppSecret').value = config.feishuAppSecret || '';
  document.getElementById('bitableSource').value = config.bitableSource || 'wiki';
  document.getElementById('wikiNodeToken').value = config.wikiNodeToken || '';
  document.getElementById('wikiTableId').value = config.bitableTableId || '';  // Wiki 模式也使用 bitableTableId
  document.getElementById('bitableAppToken').value = config.bitableAppToken || '';
  document.getElementById('bitableTableId').value = config.bitableTableId || '';
  document.getElementById('aiEnabled').checked = config.aiEnabled || false;
  document.getElementById('aiProvider').value = config.aiProvider || 'deepseek';
  document.getElementById('aiApiKey').value = config.aiApiKey || '';
  document.getElementById('aiTagMode').value = config.aiTagMode || 'preview';
  document.getElementById('deleteFromFeishu').checked = config.deleteFromFeishu || false;

  // 显示对应的配置区域
  toggleBitableConfig(config.bitableSource || 'wiki');
}

// 切换多维表格配置显示
function toggleBitableConfig(source) {
  const wikiConfig = document.getElementById('wikiConfig');
  const standaloneConfig = document.getElementById('standaloneConfig');

  if (source === 'wiki') {
    wikiConfig.style.display = 'block';
    standaloneConfig.style.display = 'none';
  } else {
    wikiConfig.style.display = 'none';
    standaloneConfig.style.display = 'block';
  }
}

// 监听多维表格来源切换
document.getElementById('bitableSource').addEventListener('change', (e) => {
  toggleBitableConfig(e.target.value);
});

// 保存配置
document.getElementById('saveConfig').addEventListener('click', async () => {
  const bitableSource = document.getElementById('bitableSource').value;

  const config = {
    feishuAppId: document.getElementById('feishuAppId').value.trim(),
    feishuAppSecret: document.getElementById('feishuAppSecret').value.trim(),
    bitableSource: bitableSource,
    aiEnabled: document.getElementById('aiEnabled').checked,
    aiProvider: document.getElementById('aiProvider').value,
    aiApiKey: document.getElementById('aiApiKey').value.trim(),
    aiTagMode: document.getElementById('aiTagMode').value,
    deleteFromFeishu: document.getElementById('deleteFromFeishu').checked
  };

  // 验证必填项
  if (!config.feishuAppId || !config.feishuAppSecret) {
    showToast('请填写飞书App ID和App Secret', 'error');
    return;
  }

  // 根据来源验证对应的配置
  if (bitableSource === 'wiki') {
    config.wikiNodeToken = document.getElementById('wikiNodeToken').value.trim();
    config.bitableTableId = document.getElementById('wikiTableId').value.trim();  // 获取 Wiki 模式的 Table ID（可选）
    if (!config.wikiNodeToken) {
      showToast('请填写 Wiki Node Token', 'error');
      return;
    }
  } else {
    config.bitableAppToken = document.getElementById('bitableAppToken').value.trim();
    config.bitableTableId = document.getElementById('bitableTableId').value.trim();
    if (!config.bitableAppToken || !config.bitableTableId) {
      showToast('请填写多维表格 App Token 和 Table ID', 'error');
      return;
    }
  }

  if (config.aiEnabled && !config.aiApiKey) {
    showToast('请填写AI API Key', 'error');
    return;
  }

  // 保存配置
  config.isConfigured = true;
  await chrome.storage.sync.set(config);

  showToast('配置保存成功！', 'success');
});

// 测试飞书连接
document.getElementById('testFeishu').addEventListener('click', async () => {
  const appId = document.getElementById('feishuAppId').value.trim();
  const appSecret = document.getElementById('feishuAppSecret').value.trim();

  if (!appId || !appSecret) {
    showToast('请先填写App ID和App Secret', 'error');
    return;
  }

  showToast('正在测试连接...', 'info');

  try {
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

    if (data.code === 0) {
      showToast('连接成功！Token已获取', 'success');
    } else {
      showToast(`连接失败: ${data.msg}`, 'error');
    }
  } catch (error) {
    showToast(`连接失败: ${error.message}`, 'error');
  }
});

// 显示Toast通知
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');

  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // 图标映射
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // 3秒后移除
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 加载历史记录
async function loadHistory() {
  const history = await chrome.storage.local.get('saveHistory');
  const historyList = history.saveHistory || [];

  const container = document.getElementById('historyList');
  const clearAllBtn = document.getElementById('clearAllHistory');

  if (historyList.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <p>还没有保存过帖子</p>
        <p style="margin-top: 8px; font-size: 12px;">在X网站点击"保存到飞书"按钮开始使用</p>
      </div>
    `;
    clearAllBtn.style.display = 'none';
    return;
  }

  clearAllBtn.style.display = 'block';

  container.innerHTML = historyList.map((item, index) => {
    const date = new Date(item.savedAt);
    const timeStr = formatTime(date);

    return `
      <div class="history-item" data-index="${index}">
        <div class="history-author">
          ${item.tweet.author.name} (@${item.tweet.author.username})
        </div>
        <div class="history-content">
          ${item.tweet.content}
        </div>
        ${item.tags && item.tags.length > 0 ? `
          <div class="history-tags">
            ${item.tags.map(tag => `<span class="history-tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        <div class="history-footer">
          <span>${timeStr}</span>
          <div class="history-actions">
            <a href="${item.tweet.url}" target="_blank" class="history-link">查看原帖</a>
            <button class="btn btn-delete delete-single" data-index="${index}">删除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 绑定单个删除按钮事件
  container.querySelectorAll('.delete-single').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      await deleteSingleHistory(index);
    });
  });
}

// 删除单条历史记录
async function deleteSingleHistory(index) {
  const config = await chrome.storage.sync.get(['deleteFromFeishu', 'feishuAppId', 'feishuAppSecret', 'bitableSource', 'wikiNodeToken', 'bitableAppToken', 'bitableTableId']);
  const history = await chrome.storage.local.get('saveHistory');
  const historyList = history.saveHistory || [];

  if (index < 0 || index >= historyList.length) return;

  const item = historyList[index];

  // 如果配置了删除飞书记录
  if (config.deleteFromFeishu && item.recordId) {
    try {
      showToast('正在删除飞书记录...', 'info');
      await deleteFromFeishu(config, item.recordId);
      showToast('已从飞书删除', 'success');
    } catch (error) {
      showToast(`飞书删除失败: ${error.message}`, 'warning');
    }
  }

  // 从历史列表中删除
  historyList.splice(index, 1);
  await chrome.storage.local.set({ saveHistory: historyList });

  showToast('已删除历史记录', 'success');
  await loadHistory();
}

// 一键清空所有历史
document.getElementById('clearAllHistory').addEventListener('click', async () => {
  if (!confirm('确定要清空所有历史记录吗？')) {
    return;
  }

  const config = await chrome.storage.sync.get(['deleteFromFeishu']);

  if (config.deleteFromFeishu) {
    if (!confirm('将同时删除飞书中的所有记录，确定继续吗？')) {
      return;
    }

    showToast('正在批量删除飞书记录...', 'info');

    const fullConfig = await chrome.storage.sync.get(['feishuAppId', 'feishuAppSecret', 'bitableSource', 'wikiNodeToken', 'bitableAppToken', 'bitableTableId']);
    const history = await chrome.storage.local.get('saveHistory');
    const historyList = history.saveHistory || [];

    let successCount = 0;
    let failCount = 0;

    for (const item of historyList) {
      if (item.recordId) {
        try {
          await deleteFromFeishu(fullConfig, item.recordId);
          successCount++;
        } catch (error) {
          console.error('删除失败:', error);
          failCount++;
        }
      }
    }

    if (failCount > 0) {
      showToast(`批量删除完成: 成功${successCount}条，失败${failCount}条`, 'warning');
    } else {
      showToast(`已从飞书删除${successCount}条记录`, 'success');
    }
  }

  // 清空本地历史
  await chrome.storage.local.set({ saveHistory: [] });
  showToast('历史记录已清空', 'success');
  await loadHistory();
});

// 从飞书删除记录
async function deleteFromFeishu(config, recordId) {
  // 获取飞书Token
  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.feishuAppId,
      app_secret: config.feishuAppSecret
    })
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.code !== 0) {
    throw new Error(`获取Token失败: ${tokenData.msg}`);
  }

  const token = tokenData.tenant_access_token;

  // 获取appToken和tableId
  let appToken, tableId;
  if (config.bitableSource === 'wiki') {
    // 获取Wiki节点信息
    const nodeResponse = await fetch(
      `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${config.wikiNodeToken}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const nodeData = await nodeResponse.json();
    if (nodeData.code !== 0) {
      throw new Error(`获取Wiki节点失败: ${nodeData.msg}`);
    }
    appToken = nodeData.data.node.obj_token;

    // 如果配置了 tableId，使用配置的；否则获取第一个表格ID
    if (config.bitableTableId) {
      tableId = config.bitableTableId;
    } else {
      const tablesResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const tablesData = await tablesResponse.json();
      if (tablesData.code !== 0 || !tablesData.data.items || tablesData.data.items.length === 0) {
        throw new Error('无法获取表格ID');
      }
      tableId = tablesData.data.items[0].table_id;
    }
  } else {
    appToken = config.bitableAppToken;
    tableId = config.bitableTableId;
  }

  // 删除记录
  const deleteResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const deleteData = await deleteResponse.json();
  if (deleteData.code !== 0) {
    throw new Error(`删除失败: ${deleteData.msg}`);
  }
}

// 格式化时间
function formatTime(date) {
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 页面加载时加载配置
loadConfig();
