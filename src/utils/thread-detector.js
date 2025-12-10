/**
 * Thread 检测工具
 */

class ThreadDetector {
  /**
   * 检测是否为Thread
   * @param {HTMLElement} mainTweetElement - 主帖元素
   * @returns {Object} Thread信息
   */
  static detectThread(mainTweetElement) {
    const mainAuthor = TweetExtractor.extractUsername(mainTweetElement);

    if (!mainAuthor) {
      return { isThread: false, threadTweets: [], count: 0 };
    }

    const timelineContainer = document.querySelector('[aria-label*="时间线"]');
    if (!timelineContainer) {
      return { isThread: false, threadTweets: [], count: 0 };
    }

    const allCells = Array.from(timelineContainer.querySelectorAll('[data-testid="cellInnerDiv"]'));

    // 找到主帖所在的cell位置
    let mainCellIndex = -1;
    for (let i = 0; i < allCells.length; i++) {
      const tweet = allCells[i].querySelector('[data-testid="tweet"]');
      if (tweet === mainTweetElement) {
        mainCellIndex = i;
        break;
      }
    }

    if (mainCellIndex === -1) {
      return { isThread: false, threadTweets: [], count: 0 };
    }

    // 收集Thread帖子
    const threadTweets = [mainTweetElement];
    const MAX_CHECK = 10; // 最多检查后续10个帖子

    for (let i = mainCellIndex + 1; i < allCells.length && i < mainCellIndex + MAX_CHECK; i++) {
      const cell = allCells[i];
      const tweet = cell.querySelector('[data-testid="tweet"]');

      if (!tweet) continue;

      const author = TweetExtractor.extractUsername(tweet);

      if (author === mainAuthor) {
        threadTweets.push(tweet);
      } else {
        // 遇到不同作者
        if (threadTweets.length >= 2) {
          break;
        }

        // 检查连续3个是否都是不同作者
        let skipCount = 0;
        for (let j = i; j < Math.min(i + 3, allCells.length); j++) {
          const nextTweet = allCells[j].querySelector('[data-testid="tweet"]');
          if (nextTweet && TweetExtractor.extractUsername(nextTweet) !== mainAuthor) {
            skipCount++;
          }
        }
        if (skipCount >= 3) break;
      }
    }

    return {
      isThread: threadTweets.length >= 2,
      threadTweets: threadTweets,
      count: threadTweets.length
    };
  }

  /**
   * 快速检测是否为Thread（不提取所有帖子）
   */
  static quickThreadCheck(mainTweetElement) {
    const mainAuthor = TweetExtractor.extractUsername(mainTweetElement);
    const timelineContainer = document.querySelector('[aria-label*="时间线"]');

    if (!mainAuthor || !timelineContainer) return false;

    const allCells = Array.from(timelineContainer.querySelectorAll('[data-testid="cellInnerDiv"]'));

    const mainIndex = allCells.findIndex(cell =>
      cell.querySelector('[data-testid="tweet"]') === mainTweetElement
    );

    if (mainIndex === -1) return false;

    // 只检查后续3个帖子
    let sameAuthorCount = 0;
    for (let i = mainIndex + 1; i < Math.min(mainIndex + 4, allCells.length); i++) {
      const tweet = allCells[i].querySelector('[data-testid="tweet"]');
      if (tweet && TweetExtractor.extractUsername(tweet) === mainAuthor) {
        sameAuthorCount++;
      }
    }

    return sameAuthorCount >= 2;
  }

  /**
   * 提取完整Thread的所有数据
   */
  static extractThreadData(threadTweets) {
    const threadData = [];

    for (const tweet of threadTweets) {
      try {
        const tweetData = TweetExtractor.extractTweetData(tweet);
        threadData.push(tweetData);
      } catch (error) {
        console.error('提取Thread帖子失败:', error);
      }
    }

    return threadData;
  }
}

// 导出到全局
window.ThreadDetector = ThreadDetector;
