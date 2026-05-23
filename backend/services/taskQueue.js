/**
 * 异步任务队列管理
 * 防止并发过载,管理任务执行状态
 */

const { config } = require('../config/env');
const logger = require('../config/logger');

/**
 * 任务队列类
 */
class TaskQueue {
  constructor() {
    this.tasks = new Map();           // 存储所有任务 taskId -> taskInfo
    this.runningTasks = new Set();    // 正在运行的任务ID集合
    this.maxConcurrent = config.task.maxConcurrent;
    this.timeout = config.task.timeout;
  }

  /**
   * 添加新任务到队列
   * @param {string} taskId - 任务ID
   * @param {Function} executor - 任务执行函数
   * @returns {Promise} - 任务Promise
   */
  async addTask(taskId, executor) {
    // 检查任务是否已存在
    if (this.tasks.has(taskId)) {
      logger.warn('任务已存在,拒绝重复添加', { taskId });
      throw new Error('任务已在处理中,请勿重复提交');
    }

    // 创建任务信息
    const taskInfo = {
      id: taskId,
      status: 'pending',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      executor
    };

    this.tasks.set(taskId, taskInfo);
    logger.info('任务已加入队列', {
      taskId,
      queueSize: this.tasks.size,
      running: this.runningTasks.size
    });

    // 尝试执行任务
    return this.executeTask(taskId);
  }

  /**
   * 执行任务
   * @param {string} taskId - 任务ID
   */
  async executeTask(taskId) {
    const taskInfo = this.tasks.get(taskId);
    if (!taskInfo) {
      throw new Error('任务不存在');
    }

    // 等待有空闲执行槽位
    while (this.runningTasks.size >= this.maxConcurrent) {
      await this.sleep(1000);
    }

    // 开始执行
    this.runningTasks.add(taskId);
    taskInfo.status = 'running';
    taskInfo.startedAt = Date.now();

    logger.info('任务开始执行', {
      taskId,
      running: this.runningTasks.size,
      maxConcurrent: this.maxConcurrent
    });

    try {
      // 设置超时保护
      const result = await Promise.race([
        taskInfo.executor(),
        this.createTimeout(taskId)
      ]);

      // 任务完成
      taskInfo.status = 'completed';
      taskInfo.completedAt = Date.now();
      taskInfo.result = result;

      logger.info('任务执行完成', {
        taskId,
        duration: taskInfo.completedAt - taskInfo.startedAt
      });

      return result;

    } catch (error) {
      // 任务失败
      taskInfo.status = 'failed';
      taskInfo.completedAt = Date.now();
      taskInfo.error = error;

      logger.error('任务执行失败', {
        taskId,
        error: error.message
      });

      throw error;

    } finally {
      // 释放执行槽位
      this.runningTasks.delete(taskId);
      
      // 一段时间后清理任务记录
      setTimeout(() => {
        this.tasks.delete(taskId);
      }, 300000); // 5分钟后清理
    }
  }

  /**
   * 创建超时Promise
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  createTimeout(taskId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`任务执行超时: ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} - 任务信息
   */
  getTaskStatus(taskId) {
    const taskInfo = this.tasks.get(taskId);
    if (!taskInfo) {
      return null;
    }

    return {
      id: taskInfo.id,
      status: taskInfo.status,
      createdAt: taskInfo.createdAt,
      startedAt: taskInfo.startedAt,
      completedAt: taskInfo.completedAt,
      duration: taskInfo.completedAt 
        ? taskInfo.completedAt - taskInfo.startedAt 
        : Date.now() - (taskInfo.startedAt || taskInfo.createdAt)
    };
  }

  /**
   * 获取队列统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    const pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending').length;
    const running = this.runningTasks.size;
    const total = this.tasks.size;

    return {
      total,
      pending,
      running,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清空队列
   */
  clear() {
    this.tasks.clear();
    this.runningTasks.clear();
    logger.info('任务队列已清空');
  }
}

// 创建全局单例
const taskQueue = new TaskQueue();

module.exports = taskQueue;
