/**
 * X(Twitter) 帖子数据提取工具
 */

class TweetExtractor {
  /**
   * 从帖子元素中提取完整数据
   * @param {HTMLElement} tweetElement - 帖子DOM元素
   * @returns {Object} 提取的帖子数据
   */
  static extractTweetData(tweetElement) {
    try {
      const data = {
        id: this.extractTweetId(tweetElement),
        url: this.extractTweetUrl(tweetElement),
        author: this.extractAuthor(tweetElement),
        timestamp: this.extractTimestamp(tweetElement),
        content: this.extractContent(tweetElement),
        metrics: this.extractMetrics(tweetElement),
        hasQuoteTweet: this.hasQuoteTweet(tweetElement),
        threadCount: 1 // 默认为1，Thread检测时会更新
      };

      console.log('提取的帖子数据:', data);
      return data;
    } catch (error) {
      console.error('提取帖子数据失败:', error);
      throw error;
    }
  }

  /**
   * 提取帖子ID
   */
  static extractTweetId(tweetElement) {
    // 从链接中提取ID
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.getAttribute('href').match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * 提取帖子URL
   */
  static extractTweetUrl(tweetElement) {
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const href = link.getAttribute('href');
      return `https://x.com${href}`;
    }
    return null;
  }

  /**
   * 提取作者信息
   */
  static extractAuthor(tweetElement) {
    const userNameContainer = tweetElement.querySelector('[data-testid="User-Name"]');

    if (!userNameContainer) {
      return {
        name: 'Unknown',
        username: 'unknown',
        avatarUrl: '',
        isVerified: false
      };
    }

    // 提取显示名称
    const nameElement = userNameContainer.querySelector('span.css-1jxf684');
    const name = nameElement ? nameElement.textContent.trim() : 'Unknown';

    // 提取用户名 @username
    const usernameElement = userNameContainer.querySelector('[dir="ltr"]');
    let username = 'unknown';
    if (usernameElement) {
      const text = usernameElement.textContent.trim();
      // 修改正则以支持数字开头的用户名
      const match = text.match(/@([a-zA-Z0-9_]+)/);
      if (match) username = match[1];
    }

    // 备用方法：从帖子URL中提取用户名
    if (username === 'unknown') {
      const link = tweetElement.querySelector('a[href*="/status/"]');
      if (link) {
        const href = link.getAttribute('href');
        const userMatch = href.match(/^\/([^\/]+)\//);
        if (userMatch) username = userMatch[1];
      }
    }

    // 提取头像URL - 使用多种方法
    let avatarUrl = '';

    // 方法1: 标准选择器
    let avatarElement = tweetElement.querySelector('[data-testid="Tweet-User-Avatar"] img');

    // 方法2: 查找所有头像图片
    if (!avatarElement || !avatarElement.src) {
      const avatarImages = tweetElement.querySelectorAll('img[src*="profile_images"]');
      if (avatarImages.length > 0) {
        avatarElement = avatarImages[0];
      }
    }

    // 方法3: 从用户链接附近查找
    if (!avatarElement || !avatarElement.src) {
      const userLink = tweetElement.querySelector('a[href^="/"][href*="/status/"]');
      if (userLink) {
        const nearbyImg = userLink.closest('article')?.querySelector('img[src*="profile_images"]');
        if (nearbyImg) avatarElement = nearbyImg;
      }
    }

    if (avatarElement && avatarElement.src) {
      avatarUrl = avatarElement.src;
      // 获取更高质量的头像
      avatarUrl = avatarUrl.replace(/_normal(\.\w+)$/, '_400x400$1').replace(/_bigger(\.\w+)$/, '_400x400$1');
    }

    console.log('提取的头像URL:', avatarUrl);

    // 检查认证状态
    const verifiedIcon = userNameContainer.querySelector('[data-testid="icon-verified"]');
    const isVerified = !!verifiedIcon;

    return {
      name,
      username,
      avatarUrl,
      isVerified
    };
  }

  /**
   * 提取时间戳
   */
  static extractTimestamp(tweetElement) {
    const timeElement = tweetElement.querySelector('time');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      return datetime ? new Date(datetime).toISOString() : new Date().toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * 提取内容
   */
  static extractContent(tweetElement) {
    // 提取文本
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    const text = textElement ? textElement.textContent.trim() : '';

    // 提取链接
    const links = [];
    const linkElements = tweetElement.querySelectorAll('[data-testid="tweetText"] a[href]');
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && !href.includes('/hashtag/')) {
        links.push({ url: href, text });
      }
    });

    // 提取图片 - 使用多种选择器
    const images = [];
    const imageSet = new Set(); // 用于去重

    // 方法1: 标准图片选择器
    const imageElements1 = tweetElement.querySelectorAll('[data-testid="tweetPhoto"] img');
    console.log('方法1找到图片数量:', imageElements1.length);
    imageElements1.forEach(img => {
      const src = img.src;
      if (src && !src.includes('profile_images') && !src.includes('emoji')) {
        // 获取原图URL（去掉尺寸参数）
        const originalUrl = src.replace(/&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
        imageSet.add(originalUrl);
      }
    });

    // 方法2: 如果没找到图片，尝试查找所有媒体图片
    if (imageSet.size === 0) {
      const imageElements2 = tweetElement.querySelectorAll('img[src*="pbs.twimg.com/media"]');
      console.log('方法2找到图片数量:', imageElements2.length);
      imageElements2.forEach(img => {
        const src = img.src;
        if (src) {
          const originalUrl = src.replace(/&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
          imageSet.add(originalUrl);
        }
      });
    }

    // 方法3: 从 article 容器中查找所有图片
    if (imageSet.size === 0) {
      const article = tweetElement.closest('article') || tweetElement;
      const imageElements3 = article.querySelectorAll('img[src*="pbs.twimg.com"]');
      console.log('方法3找到图片数量:', imageElements3.length);
      imageElements3.forEach(img => {
        const src = img.src;
        // 只要是媒体图片，且不是头像或表情
        if (src && src.includes('/media/') && !src.includes('profile_images') && !src.includes('emoji')) {
          const originalUrl = src.replace(/&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
          imageSet.add(originalUrl);
        }
      });
    }

    // 方法4: 查找带有特定样式的图片容器
    if (imageSet.size === 0) {
      const photoContainers = tweetElement.querySelectorAll('[data-testid^="card.layout"]');
      console.log('方法4找到卡片容器数量:', photoContainers.length);
      photoContainers.forEach(container => {
        const imgs = container.querySelectorAll('img[src*="pbs.twimg.com"]');
        imgs.forEach(img => {
          const src = img.src;
          if (src && src.includes('/media/') && !src.includes('profile_images')) {
            const originalUrl = src.replace(/&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
            imageSet.add(originalUrl);
          }
        });
      });
    }

    // 转换为数组
    images.push(...Array.from(imageSet));

    console.log('最终提取的图片:', images);

    // 提取视频
    const videos = [];
    const videoElements = tweetElement.querySelectorAll('[data-testid="videoPlayer"] video');
    videoElements.forEach(video => {
      const poster = video.getAttribute('poster');
      if (poster) {
        videos.push({ poster });
      }
    });

    return {
      text,
      links,
      images,
      videos
    };
  }

  /**
   * 提取统计数据 (使用aria-label)
   */
  static extractMetrics(tweetElement) {
    const metricsGroup = tweetElement.querySelector('[role="group"][aria-label]');

    if (!metricsGroup) {
      return {
        views: 0,
        replies: 0,
        retweets: 0,
        likes: 0,
        bookmarks: 0
      };
    }

    const ariaLabel = metricsGroup.getAttribute('aria-label') || '';

    // 正则模式（支持中文和英文）
    const patterns = {
      replies: /(\d+(?:[.,]\d+)?[万千KkMm]?)\s*(?:回复|replies?)/i,
      retweets: /(\d+(?:[.,]\d+)?[万千KkMm]?)\s*(?:次转帖|转发|reposts?|retweets?)/i,
      likes: /(\d+(?:[.,]\d+)?[万千KkMm]?)\s*(?:喜欢|likes?)/i,
      bookmarks: /(\d+(?:[.,]\d+)?[万千KkMm]?)\s*(?:书签|bookmarks?)/i,
      views: /(\d+(?:[.,]\d+)?[万千KkMm]?)\s*(?:次观看|views?)/i
    };

    const metrics = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = ariaLabel.match(pattern);
      metrics[key] = match ? this.parseNumber(match[1]) : 0;
    }

    return metrics;
  }

  /**
   * 解析数字（支持中文单位）
   */
  static parseNumber(str) {
    if (!str) return 0;

    str = str.replace(/,/g, '');

    // 处理中文单位
    if (str.includes('万')) {
      return Math.round(parseFloat(str) * 10000);
    }
    if (str.includes('千')) {
      return Math.round(parseFloat(str) * 1000);
    }

    // 处理英文单位
    if (/K/i.test(str)) {
      return Math.round(parseFloat(str) * 1000);
    }
    if (/M/i.test(str)) {
      return Math.round(parseFloat(str) * 1000000);
    }

    return parseInt(str) || 0;
  }

  /**
   * 检查是否有引用推文
   */
  static hasQuoteTweet(tweetElement) {
    // 检查是否包含引用推文的嵌套结构
    const quoteTweet = tweetElement.querySelector('[data-testid="tweetText"]')?.nextElementSibling;
    if (quoteTweet) {
      const nestedAuthor = quoteTweet.querySelector('[data-testid="User-Name"]');
      return !!nestedAuthor;
    }
    return false;
  }

  /**
   * 提取用户名（辅助函数）
   */
  static extractUsername(tweetElement) {
    const usernameElement = tweetElement.querySelector('[data-testid="User-Name"] [dir="ltr"]');
    if (usernameElement) {
      const text = usernameElement.textContent.trim();
      const match = text.match(/@(\w+)/);
      return match ? match[1] : null;
    }
    return null;
  }
}

// 导出到全局
window.TweetExtractor = TweetExtractor;
