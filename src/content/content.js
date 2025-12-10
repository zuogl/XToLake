/**
 * Content Script - 在X页面注入保存按钮
 */

console.log('X to Lark 插件已加载');

// 注入保存按钮
function injectSaveButtons() {
  const tweets = document.querySelectorAll('[data-testid="tweet"]');

  tweets.forEach(tweet => {
    // 检查是否已注入
    if (tweet.querySelector('.lark-save-button')) return;

    // 找到互动栏容器
    const actionBar = tweet.querySelector('[role="group"][aria-label]');
    if (!actionBar) return;

    // 创建保存按钮
    const saveButton = createSaveButton();

    // 插入到书签按钮之后
    const bookmarkButton = actionBar.querySelector('[data-testid="bookmark"]');
    if (bookmarkButton && bookmarkButton.parentElement) {
      bookmarkButton.parentElement.parentElement.insertBefore(
        saveButton,
        bookmarkButton.parentElement.nextSibling
      );
    }

    // 绑定点击事件
    const button = saveButton.querySelector('button');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSaveToLark(tweet);
    });
  });
}

// 创建保存按钮
function createSaveButton() {
  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0';

  const button = document.createElement('button');
  button.className = 'css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l lark-save-button';
  button.setAttribute('aria-label', '保存到飞书');
  button.setAttribute('role', 'button');
  button.setAttribute('type', 'button');
  button.setAttribute('data-lark-injected', 'true');

  // 使用扩展图标
  const iconUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL('icons/icon32.png') : '';

  button.innerHTML = `
    <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q">
      <div class="css-175oi2r r-xoduu5">
        <img src="${iconUrl}" alt="保存到飞书" class="lark-icon"
             style="width: 20px; height: 20px; opacity: 0.6;">
      </div>
    </div>
  `;

  // 鼠标悬停效果
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'transparent';
  });

  buttonWrapper.appendChild(button);
  return buttonWrapper;
}

// 处理保存到飞书
async function handleSaveToLark(tweetElement) {
  try {
    // 检查扩展上下文是否有效
    if (!chrome?.runtime?.id) {
      showToast('⚠️ 插件需要重新加载,请刷新页面', 'error');
      return;
    }

    // 1. 检查配置
    const config = await chrome.storage.sync.get(['isConfigured', 'feishuAppId', 'aiEnabled']);

    if (!config.isConfigured) {
      showToast('❌ 请先配置飞书API', 'error');
      // 打开配置页面
      chrome.runtime.sendMessage({ action: 'openPopup' });
      return;
    }

    // 2. 提取帖子数据
    showToast('📥 正在提取帖子数据...', 'info');
    const tweetData = TweetExtractor.extractTweetData(tweetElement);

    // 3. 检测Thread
    const threadInfo = ThreadDetector.detectThread(tweetElement);

    if (threadInfo.isThread) {
      // 显示Thread选项弹窗
      showThreadDialog(tweetData, threadInfo);
    } else {
      // 直接保存
      await saveTweetToLark(tweetData, []);
    }

  } catch (error) {
    console.error('保存失败:', error);
    // 检查是否是扩展上下文失效错误
    if (error.message && error.message.includes('Extension context invalidated')) {
      showToast('⚠️ 插件已更新,请刷新页面', 'error');
    } else {
      showToast('❌ 保存失败: ' + error.message, 'error');
    }
  }
}

// 显示Thread选项弹窗
function showThreadDialog(mainTweetData, threadInfo) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'lark-dialog-overlay';
  overlay.innerHTML = `
    <div class="lark-dialog">
      <div class="lark-dialog-header">
        <h3>检测到Thread (共${threadInfo.count}条帖子)</h3>
        <button class="lark-dialog-close">×</button>
      </div>
      <div class="lark-dialog-content">
        <p><strong>主帖:</strong> ${mainTweetData.content.text.substring(0, 100)}${mainTweetData.content.text.length > 100 ? '...' : ''}</p>
        <p><strong>作者:</strong> @${mainTweetData.author.username}</p>
        <hr>
        <label>
          <input type="radio" name="thread-option" value="single" checked>
          仅保存主帖
        </label>
        <label>
          <input type="radio" name="thread-option" value="full">
          保存完整Thread (推荐)
        </label>
        <label style="margin-top: 10px; display: block;">
          <input type="checkbox" id="remember-choice">
          记住选择，以后不再询问
        </label>
      </div>
      <div class="lark-dialog-footer">
        <button class="lark-btn lark-btn-cancel">取消</button>
        <button class="lark-btn lark-btn-primary">确定保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 绑定事件
  const closeBtn = overlay.querySelector('.lark-dialog-close');
  const cancelBtn = overlay.querySelector('.lark-btn-cancel');
  const confirmBtn = overlay.querySelector('.lark-btn-primary');

  const closeDialog = () => overlay.remove();

  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);

  confirmBtn.addEventListener('click', async () => {
    const option = overlay.querySelector('input[name="thread-option"]:checked').value;
    const remember = overlay.querySelector('#remember-choice').checked;

    if (remember) {
      await chrome.storage.sync.set({ defaultThreadOption: option });
    }

    overlay.remove();

    if (option === 'full') {
      // 提取完整Thread
      const threadData = ThreadDetector.extractThreadData(threadInfo.threadTweets);
      await saveTweetToLark(mainTweetData, [], threadData);
    } else {
      // 只保存主帖
      await saveTweetToLark(mainTweetData, []);
    }
  });
}

// 保存到飞书（通过background script）
async function saveTweetToLark(tweetData, tags = [], threadData = null) {
  try {
    // 检查扩展上下文是否有效
    if (!chrome?.runtime?.id) {
      showToast('⚠️ 插件需要重新加载,请刷新页面', 'error');
      return;
    }

    showToast('🤖 正在生成AI标签...', 'info');

    // 发送到background script处理
    const response = await chrome.runtime.sendMessage({
      action: 'saveTweet',
      data: {
        tweet: tweetData,
        tags: tags,
        thread: threadData
      }
    });

    if (response.success) {
      showToast('✅ 保存成功！', 'success');

      // 显示查看链接
      if (response.bitableUrl) {
        setTimeout(() => {
          showToastWithLink('📊 点击查看飞书表格', response.bitableUrl);
        }, 1500);
      }
    } else {
      throw new Error(response.error || '保存失败');
    }

  } catch (error) {
    console.error('保存到飞书失败:', error);
    // 检查是否是扩展上下文失效错误
    if (error.message && error.message.includes('Extension context invalidated')) {
      showToast('⚠️ 插件已更新,请刷新页面', 'error');
    } else {
      showToast('❌ ' + error.message, 'error');
    }
  }
}

// 显示Toast提示
function showToast(message, type = 'info') {
  // 移除旧的toast
  const oldToast = document.querySelector('.lark-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = `lark-toast lark-toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// 显示带链接的Toast
function showToastWithLink(message, url) {
  const oldToast = document.querySelector('.lark-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'lark-toast lark-toast-link';
  toast.innerHTML = `<a href="${url}" target="_blank">${message}</a>`;

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

// 页面加载时注入按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSaveButtons);
} else {
  injectSaveButtons();
}

// 监听动态加载的新帖子
const observer = new MutationObserver(() => {
  injectSaveButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('X to Lark 按钮已注入');
